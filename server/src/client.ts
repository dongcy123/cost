import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({
  baseURL: process.env.ANTHROPIC_BASE_URL || "https://api.deepseek.com/anthropic",
  apiKey: process.env.ANTHROPIC_AUTH_TOKEN || "sk-xxx",
});

const MODEL = process.env.ANTHROPIC_MODEL || "deepseek-v4-pro[1m]";

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

export async function baiduOCR(base64Image: string): Promise<string> {
  const token = await getBaiduAccessToken();

  const res = await fetch(
    `https://aip.baidubce.com/rest/2.0/ocr/v1/general_basic?access_token=${token}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `image=${encodeURIComponent(base64Image)}&language_type=CHN_ENG`,
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

// ── DeepSeek LLM ──

const PARSE_PROMPT = `你是一个记账助手。下面是从用户上传的消费截图/支付凭证中 OCR 提取的文字。

请从这些文字中提取关键信息，严格返回 JSON 格式（不要有其他文字）：

{
  "merchant": "商户名称",
  "amount": 金额数字,
  "date": "YYYY-MM-DD HH:mm:ss",
  "category": "类别"
}

规则：
- amount: 只提取实付金额数字，忽略货币符号。如文字中有"实付45.50"则返回45.50；若有多个金额，取实际支付的那个
- merchant: 提取收款方/商户名，如"星巴克""滴滴出行""美团外卖"等。不要包含"省""市""路"等地址信息
- date: 优先取交易时间/支付时间，其次取单据打印时间。找不到具体时间则用今天的日期，时间用当前时间
- category: 根据商户类型推断，必须是以下之一：餐饮、交通、购物、娱乐、医疗、教育、住房、其他
- 如果 OCR 文字中没有消费者/支付相关信息，返回 {"error": "NOT_A_RECEIPT"}
- 每个分类的判断标准：
  餐饮：餐厅/外卖/咖啡/茶饮/小吃/火锅/炸鸡/披萨
  交通：打车/加油/地铁/公交/航班/火车
  购物：超市/电商/淘宝/京东/拼多多/百货/服装/便利店/屈臣氏
  娱乐：电影/KTV/会员/游戏/视频/音乐/旅游/景点
  医疗：药房/医院/诊所/体检
  教育：课程/书本/培训/学费
  住房：房租/物业/水电/燃气

以下是 OCR 提取的文字：
---
{ocrText}
---

只返回纯 JSON：`;

export interface ParsedReceipt {
  merchant: string;
  amount: number;
  date: string;
  category: string;
}

interface ParseError {
  error: string;
}

export async function parseReceiptText(ocrText: string): Promise<ParsedReceipt> {
  const message = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 500,
    messages: [
      {
        role: "user",
        content: PARSE_PROMPT.replace("{ocrText}", ocrText),
      },
    ],
  });

  const textBlock = message.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("No text in response");
  }

  const jsonText = textBlock.text.trim();

  let parsed: ParsedReceipt | ParseError;
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

  if (!parsed.merchant || !parsed.amount) {
    throw new Error("Missing required fields in AI response");
  }

  return parsed;
}
