import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import {
  listClients,
  getClient,
  createClientHandler,
  updateClientHandler,
  deleteClientHandler,
} from "../controllers/clientController.js";

const router = Router();

router.use(requireAuth);

router.get("/", listClients);
router.get("/:id", getClient);
router.post("/", createClientHandler);
router.patch("/:id", updateClientHandler);
router.delete("/:id", deleteClientHandler);

export default router;
