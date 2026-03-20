import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import {
  getNextInvoiceNumberHandler,
  listInvoices,
  getInvoice,
  createInvoiceHandler,
  updateInvoiceHandler,
  deleteInvoiceHandler,
} from "../controllers/invoiceController.js";

const router = Router();

router.use(requireAuth);

router.get("/next-number", getNextInvoiceNumberHandler);
router.get("/", listInvoices);
router.get("/:id", getInvoice);
router.post("/", createInvoiceHandler);
router.patch("/:id", updateInvoiceHandler);
router.delete("/:id", deleteInvoiceHandler);

export default router;
