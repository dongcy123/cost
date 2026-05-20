import { Router } from "express";
import { baiduOCR, parseReceiptText, ParsedReceipt } from "../client";
import { db, categories } from "../db";

const router = Router();

// POST /api/transactions/parse-receipt
// Accepts: { image: "base64..." }  or  { images: ["base64...", ...] }
router.post("/", async (req, res) => {
  try {
    const { image, images } = req.body;

    // Normalize to string[] of base64 images
    let imageList: string[];

    if (Array.isArray(images) && images.length > 0) {
      imageList = images.map((img: string) =>
        img.replace(/^data:image\/\w+;base64,/, "")
      );
    } else if (typeof image === "string") {
      imageList = [image.replace(/^data:image\/\w+;base64,/, "")];
    } else {
      res.status(400).json({ error: "缺少图片数据" });
      return;
    }

    if (imageList.length > 10) {
      res.status(400).json({ error: "单次最多上传 10 张图片" });
      return;
    }

    // Fetch custom categories for LLM prompt
    let categoryList: string[] = [];
    try {
      const rows = await db.select({ name: categories.name }).from(categories);
      categoryList = rows.map((r) => r.name);
    } catch {
      // fallback to defaults
    }

    // Step 1: OCR each image sequentially (Baidu API rate limit)
    const ocrResults: string[] = [];
    for (const img of imageList) {
      try {
        const text = await baiduOCR(img);
        if (text && text.trim().length >= 3) {
          ocrResults.push(text.trim());
        }
      } catch (err: any) {
        console.error("Baidu OCR error on image:", err.message);
      }
    }

    if (ocrResults.length === 0) {
      res.status(422).json({ error: "未能从图片中识别出文字，请上传清晰的截图" });
      return;
    }

    // Step 2: LLM parse each OCR result
    const allTransactions: ParsedReceipt[] = [];
    const errors: string[] = [];

    for (let i = 0; i < ocrResults.length; i++) {
      try {
        const txs = await parseReceiptText(ocrResults[i], categoryList);
        allTransactions.push(...txs);
      } catch (err: any) {
        if (err.message === "NOT_A_RECEIPT") {
          if (imageList.length === 1) {
            errors.push("未识别到有效票据");
          }
        } else {
          console.error(`Parse error on image ${i}:`, err.message);
          errors.push(`第 ${i + 1} 张图片识别失败`);
        }
      }
    }

    if (allTransactions.length === 0) {
      res.status(422).json({
        error:
          errors.length > 0 ? errors[0] : "未识别到有效票据，请上传清晰的消费截图",
      });
      return;
    }

    res.json({ transactions: allTransactions, errors: errors.length > 0 ? errors : undefined });
  } catch (err: any) {
    console.error("POST /parse-receipt error:", err);
    res.status(500).json({ error: "票据识别失败，请重试" });
  }
});

export default router;
