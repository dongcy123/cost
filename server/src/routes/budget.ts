import { Router } from "express";
import { db, budgets } from "../db";
import { eq } from "drizzle-orm";
import { z } from "zod";

const router = Router();

const BudgetSchema = z.object({
  month: z.string(),
  monthlyBudget: z.number().positive(),
  categories: z.record(z.string(), z.number()),
});

// GET /api/budget?month=2026-05
router.get("/", async (req, res) => {
  try {
    const { month } = req.query;
    if (!month || typeof month !== "string") {
      res.status(400).json({ error: "month 参数是必须的" });
      return;
    }

    const [row] = await db
      .select()
      .from(budgets)
      .where(eq(budgets.month, month));

    if (!row) {
      res.json({
        month,
        monthlyBudget: 5000,
        categories: { 餐饮: 2000, 交通: 800, 购物: 1500, 娱乐: 500, 其他: 200 },
      });
      return;
    }

    res.json({
      month: row.month,
      monthlyBudget: Number(row.monthlyBudget),
      categories: row.categories as Record<string, number>,
    });
  } catch (err) {
    console.error("GET /budget error:", err);
    res.status(500).json({ error: "获取预算失败" });
  }
});

// PUT /api/budget?month=2026-05
router.put("/", async (req, res) => {
  try {
    const { month } = req.query;
    if (!month || typeof month !== "string") {
      res.status(400).json({ error: "month 参数是必须的" });
      return;
    }

    const body = BudgetSchema.omit({ month: true }).parse(req.body);

    const [row] = await db
      .insert(budgets)
      .values({
        month,
        monthlyBudget: body.monthlyBudget.toString(),
        categories: body.categories,
      })
      .onConflictDoUpdate({
        target: budgets.month,
        set: {
          monthlyBudget: body.monthlyBudget.toString(),
          categories: body.categories,
        },
      })
      .returning();

    res.json({
      month: row.month,
      monthlyBudget: Number(row.monthlyBudget),
      categories: row.categories,
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: "数据格式错误", details: err.errors });
      return;
    }
    console.error("PUT /budget error:", err);
    res.status(500).json({ error: "保存预算失败" });
  }
});

export default router;
