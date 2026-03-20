import { runChatTurn } from "../services/aiService.js";

export async function chat(req, res, next) {
  try {
    const { message } = req.body ?? {};
    const result = await runChatTurn(req.userId, message);
    return res.json(result);
  } catch (err) {
    if (
      err.message?.includes("Пустое сообщение") ||
      err.message?.includes("слишком длинное")
    ) {
      return res.status(400).json({ message: err.message });
    }
    if (err.message?.includes("GROQ_API_KEY")) {
      return res.status(503).json({ message: err.message });
    }
    next(err);
  }
}
