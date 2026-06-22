import { Router } from "express";
import { db, transactions } from "../db";
import { asc, desc, eq, inArray } from "drizzle-orm";
import { z } from "zod";

const router = Router();

const TransactionSchema = z.object({
  category: z.string(),
  merchant: z.string(),
  amount: z.number().positive(),
  date: z.string(),
  month: z.string(),
});

// GET /api/transactions?month=2026-05
router.get("/", async (req, res) => {
  try {
    const { month } = req.query;
    let rows;

    if (month && typeof month === "string") {
      rows = await db
        .select()
        .from(transactions)
        .where(eq(transactions.month, month))
        .orderBy(desc(transactions.date));
    } else {
      rows = await db
        .select()
        .from(transactions)
        .orderBy(desc(transactions.date));
    }

    res.json(rows);
  } catch (err) {
    console.error("GET /transactions error:", err);
    res.status(500).json({ error: "获取交易记录失败" });
  }
});

// POST /api/transactions
router.post("/", async (req, res) => {
  try {
    const body = TransactionSchema.parse(req.body);
    const [row] = await db.insert(transactions).values(body).returning();
    res.status(201).json(row);
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: "数据格式错误", details: err.errors });
      return;
    }
    console.error("POST /transactions error:", err);
    res.status(500).json({ error: "创建交易记录失败" });
  }
});

// PUT /api/transactions/:id
router.put("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const body = TransactionSchema.partial().parse(req.body);

    const [row] = await db
      .update(transactions)
      .set(body)
      .where(eq(transactions.id, id))
      .returning();

    if (!row) {
      res.status(404).json({ error: "交易记录不存在" });
      return;
    }

    res.json(row);
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: "数据格式错误", details: err.errors });
      return;
    }
    console.error("PUT /transactions error:", err);
    res.status(500).json({ error: "更新交易记录失败" });
  }
});

// DELETE /api/transactions/:id
router.delete("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [row] = await db
      .delete(transactions)
      .where(eq(transactions.id, id))
      .returning();

    if (!row) {
      res.status(404).json({ error: "交易记录不存在" });
      return;
    }

    res.json({ success: true });
  } catch (err) {
    console.error("DELETE /transactions error:", err);
    res.status(500).json({ error: "删除交易记录失败" });
  }
});

// POST /api/transactions/dedupe — remove duplicates (same date + amount + time + merchant)
router.post("/dedupe", async (_req, res) => {
  try {
    const all = await db
      .select()
      .from(transactions)
      .orderBy(asc(transactions.id));

    const seen = new Map<string, number>();
    const dupIds: number[] = [];

    for (const t of all) {
      const d = new Date(t.date);
      const day = d.toISOString().slice(0, 10); // YYYY-MM-DD
      const time = d.toISOString().slice(11, 16); // HH:mm
      const key = `${day}|${t.amount}|${time}|${t.merchant}`;

      if (seen.has(key)) {
        dupIds.push(t.id);
      } else {
        seen.set(key, t.id);
      }
    }

    if (dupIds.length > 0) {
      await db.delete(transactions).where(inArray(transactions.id, dupIds));
    }

    res.json({ deleted: dupIds.length });
  } catch (err) {
    console.error("POST /transactions/dedupe error:", err);
    res.status(500).json({ error: "去重失败" });
  }
});

export default router;
