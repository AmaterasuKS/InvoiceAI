import { createClient } from "redis";

let client = null;
let connectPromise = null;

/**
 * Один общий клиент Redis (ленивое подключение).
 */
export async function getRedis() {
  const url = process.env.REDIS_URL;
  if (!url) {
    throw new Error("REDIS_URL is not set");
  }

  if (client?.isOpen) {
    return client;
  }

  if (!client) {
    client = createClient({ url });
    client.on("error", (err) => {
      console.error("Redis client error:", err.message);
    });
  }

  if (!connectPromise) {
    connectPromise = client.connect().catch((err) => {
      connectPromise = null;
      client = null;
      throw err;
    });
  }

  await connectPromise;
  return client;
}

/**
 * Закрытие соединения (graceful shutdown).
 */
export async function disconnectRedis() {
  try {
    if (client?.isOpen) {
      await client.quit();
    }
  } finally {
    client = null;
    connectPromise = null;
  }
}
