import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { chat } from "../controllers/aiController.js";

const router = Router();

router.use(requireAuth);

router.post("/chat", chat);

export default router;
