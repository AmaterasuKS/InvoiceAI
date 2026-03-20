import jwt from "jsonwebtoken";

function getBearerToken(req) {
  const h = req.headers.authorization;
  if (!h || typeof h !== "string") return null;
  const [type, token] = h.split(" ");
  if (type !== "Bearer" || !token) return null;
  return token.trim();
}

/**
 * Проверяет JWT и выставляет req.userId (UUID пользователя).
 */
export function requireAuth(req, res, next) {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    return res.status(500).json({ message: "JWT_SECRET is not configured" });
  }

  const token = getBearerToken(req);
  if (!token) {
    return res.status(401).json({ message: "Требуется авторизация" });
  }

  try {
    const payload = jwt.verify(token, secret);
    if (!payload?.sub) {
      return res.status(401).json({ message: "Недействительный токен" });
    }
    req.userId = payload.sub;
    next();
  } catch {
    return res.status(401).json({ message: "Недействительный или просроченный токен" });
  }
}
