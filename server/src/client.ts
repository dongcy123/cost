const MODEL = process.env.ANTHROPIC_PARSING_MODEL || "deepseek-v4-flash";

// ── Baidu OCR ──

const BAIDU_API_KEY = process.env.BAIDU_API_KEY || "";
const BAIDU_SECRET_KEY = process.env.BAIDU_SECRET_KEY || "";

let cachedToken: { token: string; expiresAt: number } | null = null;

async function getBaiduAccessToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt - 60000) {
    return cachedToken.token;
  }

  const res = await fetch(
    `https://aip.baidubce.com/oauth/2.0/token?grant_type=client_credentials&client_id=${BAIDU_API_KEY}&client_secret=${BAIDU_SECRET_KEY}`
  );
  const data = (await res.json()) as { access_token: string; expires_in: number };

  if (!data.access_token) {
    throw new Error("Failed to get Baidu access token: " + JSON.stringify(data));
  }

  cachedToken = {
    token: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  };

  return cachedToken.token;
}

async function baiduOCROnce(base64Image: string, token: string): Promise<string> {
  const res = await fetch(
    `https://aip.baidubce.com/rest/2.0/ocr/v1/general_basic?access_token=${token}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `image=${encodeURIComponent(base64Image)}&language_type=CHN_ENG`,
      signal: AbortSignal.timeout(15000),
    }
  );

  const data = (await res.json()) as {
    words_result?: { words: string }[];
    error_msg?: string;
  };

  if (data.error_msg) {
    throw new Error("Baidu OCR error: " + data.error_msg);
  }

  const texts = (data.words_result || []).map((w) => w.words);
  return texts.join("\n");
}

export async function baiduOCR(base64Image: string): Promise<string> {
  const token = await getBaiduAccessToken();

  // Retry up to 2 times for transient network errors
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      return await baiduOCROnce(base64Image, token);
    } catch (err: any) {
      if (attempt === 1) throw err;
      if (err.message?.includes("fetch failed") || err.name === "TimeoutError") {
        await new Promise((r) => setTimeout(r, 1000));
        continue;
      }
      throw err;
    }
  }

  throw new Error("Baidu OCR unreachable");
}

// ── DeepSeek LLM ──

function buildPrompt(ocrText: string, categoryList: string[]): string {
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")} ${String(today.getHours()).padStart(2, "0")}:${String(today.getMinutes()).padStart(2, "0")}:${String(today.getSeconds()).padStart(2, "0")}`;
  const catStr = categoryList.join("、");

  return `你是一个记账助手。下面是从用户上传的消费记录截图/支付凭证中 OCR 提取的文字。

今天的日期是 ${todayStr}。所有日期必须基于此日期，年份必须是 ${today.getFullYear()}。

请从文字中提取消费信息，严格返回 JSON 格式（不要有其他文字）：

{
  "transactions": [
    { "merchant": "商户名", "amount": 金额, "date": "YYYY-MM-DD HH:mm:ss", "category": "分类" }
  ]
}

核心规则：
- 如果截图中有多条独立消费记录（如银行扣款列表、多条支付记录、表格形式的账单），返回多条
- 对于含有同类多件商品的超市小票（如3件零食），同类商品合并为一条，取汇总金额
- 不同类的商品（零食 vs 日用品）拆为不同记录
- amount: 只提取实付金额数字，忽略货币符号。如"实付45.50"则返回45.50
- merchant: 提取收款方/商户名，不要包含地址信息。表格中出现多条不同商户时，每条取对应的商户
- date: 优先取交易/支付时间。OCR 文字中只出现月日没有年份时，年份统一用 ${today.getFullYear()}。找不到具体时间则用今天的日期和时间
- category: 必须是以下之一：${catStr}
- 如果 OCR 文字中没有消费/支付信息，返回 {"error": "NOT_A_RECEIPT"}
- 金额含逗号或空格分隔的数字（如"1,234.56"），去除逗号后作为数字

以下是 OCR 提取的文字：
---
${ocrText}
---

只返回纯 JSON：`;
}

export interface ParsedReceipt {
  merchant: string;
  amount: number;
  date: string;
  category: string;
}

interface ParseError {
  error: string;
}

interface ParseResult {
  transactions: ParsedReceipt[];
}
export interface ParsedReceipt {
  merchant: string;
  amount: number;
  date: string;
  category: string;
}

interface ParseError {
  error: string;
}

interface ParseResult {
  transactions: ParsedReceipt[];
}

const DEFAULT_CATEGORIES = ["餐饮", "交通", "购物", "娱乐", "医疗", "教育", "住房", "其他"];

export async function parseReceiptText(ocrText: string, categoryList: string[] = DEFAULT_CATEGORIES): Promise<ParsedReceipt[]> {
  // Sanitize: strip control chars and non-printable characters that break API requests
  let text = ocrText
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "") // strip control chars except \n \t
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .trim();

  if (!text || text.length < 3) {
    throw new Error("NOT_A_RECEIPT");
  }

  // Truncate very long OCR text to avoid API connection issues.
  if (text.length > 800) {
    const lines = text.split("\n");
    // Keep lines that contain numbers, amounts, or merchant indicators
    const relevant = lines.filter(
      (l) => /[\d]/.test(l) && (l.includes("¥") || l.includes("￥") || l.includes("元") || l.includes("支出") || l.includes("消费") || l.includes("支付") || l.includes("扣款") || l.length > 10)
    );
    if (relevant.length > 0) {
      text = relevant.join("\n");
    }
    // Still too long? Just keep first 1500 chars
    if (text.length > 1500) {
      text = text.substring(0, 1500);
    }
  }

  async function attempt(): Promise<ParsedReceipt[]> {
    const baseURL = process.env.ANTHROPIC_BASE_URL || "https://api.deepseek.com/anthropic";
    const apiKey = process.env.ANTHROPIC_AUTH_TOKEN || "";

    const res = await fetch(`${baseURL}/v1/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 8000,
        messages: [{ role: "user", content: buildPrompt(text, categoryList) }],
      }),
      signal: AbortSignal.timeout(60000),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      throw new Error(`API ${res.status}: ${errText.slice(0, 200)}`);
    }

    const message = (await res.json()) as {
      content?: { type: string; text?: string }[];
    };

    const textBlock = (message.content || []).find((b) => b.type === "text");
    if (!textBlock?.text) {
      throw new Error("No text in response");
    }

    const jsonText = textBlock.text.trim();

    let parsed: ParseResult | ParseError;
    try {
      parsed = JSON.parse(jsonText);
    } catch {
      const match = jsonText.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (match) {
        parsed = JSON.parse(match[1].trim());
      } else {
        throw new Error("Failed to parse AI response as JSON");
      }
    }

    if ("error" in parsed) {
      throw new Error(parsed.error);
    }

    const txs = (parsed as ParseResult).transactions;
    if (!txs || txs.length === 0) {
      throw new Error("Missing required fields in AI response");
    }

    for (const t of txs) {
      if (!t.merchant || !t.amount) {
        throw new Error("Missing required fields in AI response");
      }
    }

    return txs;
  }

  try {
    return await attempt();
  } catch (err: any) {
    // If the request was terminated (likely too much text), retry with truncated text
    if (err.message === "terminated" && text.length > 400) {
      text = text.split("\n").slice(0, 10).join("\n").substring(0, 500);
      return await attempt();
    }
    throw err;
  }
}
