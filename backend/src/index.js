import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";

import { initDatabase, pool } from "./config/database.js";
import { disconnectRedis } from "./config/redis.js";
import { errorHandler } from "./middleware/errorHandler.js";

import authRoutes from "./routes/auth.js";
import clientsRoutes from "./routes/clients.js";
import invoicesRoutes from "./routes/invoices.js";
import aiRoutes from "./routes/ai.js";

const app = express();
app.set("trust proxy", 1);
const PORT = Number(process.env.PORT) || 3000;

const corsOrigins = (process.env.CORS_ORIGIN || "http://localhost:5173,http://127.0.0.1:5173")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);
app.use(
  cors({
    origin: corsOrigins.length ? corsOrigins : true,
    credentials: true,
  })
);
app.use(morgan("combined"));
app.use(express.json({ limit: "2mb" }));

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Слишком много запросов, попробуйте позже" },
});
app.use("/api/", apiLimiter);

app.get("/health", (req, res) => {
  res.json({
    ok: true,
    service: "invoiceai-api",
    time: new Date().toISOString(),
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/clients", clientsRoutes);
app.use("/api/invoices", invoicesRoutes);
app.use("/api/ai", aiRoutes);

app.use((req, res) => {
  res.status(404).json({ message: "Маршрут не найден" });
});

app.use(errorHandler);

async function bootstrap() {
  await initDatabase();

  const server = app.listen(PORT, "0.0.0.0", () => {
    console.log(`InvoiceAI API — http://0.0.0.0:${PORT}`);
  });

  const shutdown = async (signal) => {
    console.log(`${signal}: завершение работы…`);
    await new Promise((resolve) => server.close(resolve));
    await pool.end().catch(() => {});
    await disconnectRedis().catch(() => {});
    process.exit(0);
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}

bootstrap().catch((err) => {
  console.error("Не удалось запустить сервер:", err);
  process.exit(1);
});
