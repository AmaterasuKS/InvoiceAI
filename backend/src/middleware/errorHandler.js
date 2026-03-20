/**
 * Централизованная обработка ошибок Express.
 */
export function errorHandler(err, req, res, _next) {
  if (res.headersSent) {
    return;
  }

  console.error(err);

  let status = err.status ?? err.statusCode ?? 500;
  if (!Number.isInteger(status) || status < 400 || status > 599) {
    status = 500;
  }

  const isDev = process.env.NODE_ENV !== "production";
  const exposeMessage = status !== 500 || isDev || err.expose === true;
  const message = exposeMessage
    ? err.message || "Ошибка запроса"
    : "Внутренняя ошибка сервера";

  res.status(status).json({ message });
}
