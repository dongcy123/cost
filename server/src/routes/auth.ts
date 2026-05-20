import { Router } from "express";

const router = Router();

router.get("/verify", (req, res) => {
  const password = process.env.ACCESS_PASSWORD;

  if (!password) {
    return res.json({ valid: true });
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ valid: false, error: "未授权访问" });
  }

  const token = authHeader.slice(7);
  if (token !== password) {
    return res.status(401).json({ valid: false, error: "密码错误" });
  }

  res.json({ valid: true });
});

export default router;
