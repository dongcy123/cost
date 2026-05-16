import { Router } from "express";
import { baiduOCR, parseReceiptText } from "../client";

const router = Router();

// POST /api/transactions/parse-receipt
router.post("/", async (req, res) => {
  try {
    const { image } = req.body;

    if (!image || typeof image !== "string") {
      res.status(400).json({ error: "缺少图片数据" });
      return;
    }

    // Strip data URL prefix if present (e.g. "data:image/png;base64,...")
    const base64 = image.replace(/^data:image\/\w+;base64,/, "");

    // Step 1: Baidu OCR
    let ocrText: string;
    try {
      ocrText = await baiduOCR(base64);
    } catch (err: any) {
      console.error("Baidu OCR error:", err);
      res.status(502).json({ error: "OCR 识别服务异常，请检查百度 API 配置" });
      return;
    }

    if (!ocrText || ocrText.trim().length < 3) {
      res.status(422).json({ error: "未能从图片中识别出文字，请上传清晰的截图" });
      return;
    }

    // Step 2: DeepSeek LLM parsing
    const result = await parseReceiptText(ocrText.trim());
    res.json(result);
  } catch (err: any) {
    console.error("POST /parse-receipt error:", err);

    const message = err?.message || "";

    if (message === "NOT_A_RECEIPT") {
      res.status(422).json({ error: "未识别到有效票据，请上传清晰的消费截图" });
      return;
    }

    if (message.includes("Missing required fields")) {
      res.status(422).json({ error: "票据信息不完整，请尝试重新截取" });
      return;
    }

    if (message.includes("JSON") || message.includes("parse")) {
      res.status(502).json({ error: "AI 识别结果异常，请重试" });
      return;
    }

    res.status(500).json({ error: "票据识别失败，请重试" });
  }
});

export default router;
