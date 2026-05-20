import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import { pgTable, serial, text, numeric, timestamp, jsonb, uniqueIndex } from "drizzle-orm/pg-core";
import "dotenv/config";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  throw new Error("DATABASE_URL is required");
}

const sql = neon(DATABASE_URL);
export const db = drizzle(sql);

// ── Transactions ──
export const transactions = pgTable("transactions", {
  id: serial("id").primaryKey(),
  category: text("category").notNull(),
  merchant: text("merchant").notNull(),
  amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
  date: timestamp("date", { mode: "string" }).notNull(),
  month: text("month").notNull(),
  createdAt: timestamp("created_at", { mode: "string", withTimezone: true }).defaultNow(),
});

// ── Budgets ──
export const budgets = pgTable(
  "budgets",
  {
    id: serial("id").primaryKey(),
    month: text("month").notNull(),
    monthlyBudget: numeric("monthly_budget", { precision: 10, scale: 2 }).notNull(),
    categories: jsonb("categories").notNull().$type<Record<string, number>>(),
    createdAt: timestamp("created_at", { mode: "string", withTimezone: true }).defaultNow(),
  },
  (table) => [uniqueIndex("budgets_month_idx").on(table.month)]
);

// ── Categories ──
export const categories = pgTable("categories", {
  name: text("name").primaryKey(),
  createdAt: timestamp("created_at", { mode: "string", withTimezone: true }).defaultNow(),
});
