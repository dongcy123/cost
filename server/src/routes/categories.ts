import { Router } from "express";
import { db, categories } from "../db";
import { z } from "zod";

const router = Router();

router.get("/", async (_req, res) => {
  try {
    const rows = await db.select({ name: categories.name }).from(categories).orderBy(categories.name);
    res.json(rows.map((r) => r.name));
  } catch {
    res.status(500).json({ error: "获取分类失败" });
  }
});

const CreateCategorySchema = z.object({
  name: z.string().min(1, "分类名不能为空").max(20, "分类名最多20字"),
});

router.post("/", async (req, res) => {
  try {
    const { name } = CreateCategorySchema.parse(req.body);
    await db.insert(categories).values({ name }).onConflictDoNothing();
    res.status(201).json({ name });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: err.errors[0].message });
      return;
    }
    res.status(500).json({ error: "添加分类失败" });
  }
});

export default router;
