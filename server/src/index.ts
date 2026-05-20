import "dotenv/config";
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import cors from "cors";
import transactionRoutes from "./routes/transactions";
import budgetRoutes from "./routes/budget";
import parseReceiptRoutes from "./routes/parse-receipt";

const app = express();
const PORT = process.env.PORT || 3001;
const isProduction = process.env.NODE_ENV === "production";

app.use(cors());
app.use(express.json({ limit: "20mb" }));

// API Routes
app.use("/api/transactions", transactionRoutes);
app.use("/api/budget", budgetRoutes);
app.use("/api/transactions/parse-receipt", parseReceiptRoutes);

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

// In production, serve the built frontend
if (isProduction) {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const distPath = path.resolve(__dirname, "../../by_figma/dist");
  app.use(express.static(distPath));
  // SPA fallback — all non-API routes serve index.html
  app.get("/*splat", (_req, res) => {
    res.sendFile(path.join(distPath, "index.html"));
  });
}

app.listen(PORT, () => {
  console.log(
    `Server running on http://localhost:${PORT} (${isProduction ? "production" : "development"})`
  );
});
