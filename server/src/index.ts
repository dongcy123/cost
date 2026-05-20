import "dotenv/config";
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import cors from "cors";
import transactionRoutes from "./routes/transactions";
import budgetRoutes from "./routes/budget";
import parseReceiptRoutes from "./routes/parse-receipt";
import authRoutes from "./routes/auth";

const app = express();
const PORT = process.env.PORT || 3001;
const isProduction = process.env.NODE_ENV === "production";

app.use(cors({
  origin: process.env.CORS_ORIGIN || "*",
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));
app.use(express.json({ limit: "20mb" }));

// Auth middleware — checks Bearer token against ACCESS_PASSWORD
app.use("/api", (req, res, next) => {
  const password = process.env.ACCESS_PASSWORD;
  if (!password) return next();
  if (req.path === "/health" || req.path === "/auth/verify") return next();

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "未授权访问" });
  }

  const token = authHeader.slice(7);
  if (token !== password) {
    return res.status(401).json({ error: "密码错误" });
  }

  next();
});

// API Routes
app.use("/api/auth", authRoutes);
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
