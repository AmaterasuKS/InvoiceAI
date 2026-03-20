import PDFDocument from "pdfkit";

async function loadLogoBuffer(url) {
  if (!url || typeof url !== "string") return null;
  const u = url.trim();
  if (u.startsWith("data:image")) {
    const match = u.match(/^data:image\/(?:png|jpe?g|gif|webp);base64,(.+)$/i);
    if (!match) return null;
    try {
      return Buffer.from(match[1], "base64");
    } catch {
      return null;
    }
  }
  if (u.startsWith("http://") || u.startsWith("https://")) {
    try {
      const res = await fetch(u, { signal: AbortSignal.timeout(12_000) });
      if (!res.ok) return null;
      const buf = Buffer.from(await res.arrayBuffer());
      return buf.length > 0 ? buf : null;
    } catch {
      return null;
    }
  }
  return null;
}

const ACCENT = "#6366f1";
const TEXT = "#0f172a";
const MUTED = "#64748b";
const BORDER = "#e2e8f0";
const HEADER_BG = "#f8fafc";

/**
 * @param {object} params
 * @param {object} params.invoice — объект инвойса (как из API: invoiceNumber, status, dates, currency, lineItems, subtotal, taxRate, taxAmount, total, notes)
 * @param {object} params.issuer — { companyName, companyLogoUrl?, companyDetails? }
 * @param {object} params.client — { name, email?, phone?, address? }
 * @returns {Promise<Buffer>}
 */
export async function generateInvoicePdfBuffer({ invoice, issuer, client }) {
  const logoBuf = await loadLogoBuffer(issuer?.companyLogoUrl);

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 48, info: { Title: `Invoice ${invoice.invoiceNumber}` } });
    const chunks = [];
    doc.on("data", (c) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const currency = invoice.currency || "USD";
    const fmt = (n) =>
      new Intl.NumberFormat("en-US", { style: "currency", currency }).format(Number(n) || 0);

    const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
    let y = doc.y;

    const drawAccentBar = () => {
      doc.save();
      doc.rect(0, 0, doc.page.width, 6).fill(ACCENT);
      doc.restore();
      doc.y = doc.page.margins.top;
    };

    drawAccentBar();
    y = doc.y + 8;

    if (logoBuf) {
      try {
        doc.image(logoBuf, doc.page.margins.left, y, { height: 40, fit: [120, 40] });
        y += 48;
      } catch {
        /* ignore broken image */
      }
    }

    doc.fillColor(TEXT).fontSize(22).font("Helvetica-Bold").text("INVOICE", doc.page.margins.left, y);
    doc
      .fontSize(10)
      .font("Helvetica")
      .fillColor(MUTED)
      .text(`# ${invoice.invoiceNumber}`, doc.page.margins.left + pageWidth - 160, y, {
        width: 160,
        align: "right",
      });

    y = doc.y + 6;
    doc.fontSize(9).fillColor(MUTED).text(`Status: ${String(invoice.status || "").toUpperCase()}`, {
      align: "right",
    });
    y = doc.y + 16;

    const leftX = doc.page.margins.left;
    const rightX = leftX + pageWidth / 2 + 12;
    const colW = pageWidth / 2 - 12;

    const issuerName = issuer?.companyName || "Company";
    doc.fillColor(TEXT).fontSize(11).font("Helvetica-Bold").text("From", leftX, y);
    doc.font("Helvetica").fontSize(10).fillColor(TEXT).text(issuerName, leftX, y + 14, { width: colW });

    let iy = y + 14 + doc.heightOfString(issuerName, { width: colW });
    const details = formatCompanyDetails(issuer?.companyDetails);
    if (details) {
      doc.fontSize(9).fillColor(MUTED).text(details, leftX, iy, { width: colW, lineGap: 2 });
      iy = doc.y;
    }

    doc.fillColor(TEXT).fontSize(11).font("Helvetica-Bold").text("Bill to", rightX, y);
    doc.font("Helvetica").fontSize(10).fillColor(TEXT).text(client?.name || "Client", rightX, y + 14, { width: colW });
    let cy = y + 14 + doc.heightOfString(client?.name || "Client", { width: colW });
    const clientLines = [client?.email, client?.phone, client?.address].filter(Boolean).join("\n");
    if (clientLines) {
      doc.fontSize(9).fillColor(MUTED).text(clientLines, rightX, cy, { width: colW, lineGap: 2 });
      cy = doc.y;
    }

    y = Math.max(iy, cy, y + 72) + 8;

    doc.fillColor(TEXT).fontSize(9).font("Helvetica-Bold");
    doc.text("Issue date", leftX, y);
    doc.font("Helvetica").fillColor(MUTED).text(String(invoice.issueDate || "—"), leftX + 72, y);
    doc.font("Helvetica-Bold").fillColor(TEXT).text("Due date", leftX + 200, y);
    doc.font("Helvetica").fillColor(MUTED).text(String(invoice.dueDate || "—"), leftX + 260, y);

    y += 28;

    const tableLeft = leftX;
    const descW = pageWidth * 0.52;
    const qtyW = pageWidth * 0.12;
    const unitW = pageWidth * 0.16;
    const amtW = pageWidth * 0.2;

    doc.save();
    doc.rect(tableLeft, y, pageWidth, 22).fill(HEADER_BG);
    doc.fillColor(TEXT).font("Helvetica-Bold").fontSize(9);
    doc.text("Description", tableLeft + 8, y + 7, { width: descW - 8 });
    doc.text("Qty", tableLeft + descW, y + 7, { width: qtyW, align: "right" });
    doc.text("Unit", tableLeft + descW + qtyW, y + 7, { width: unitW, align: "right" });
    doc.text("Amount", tableLeft + descW + qtyW + unitW, y + 7, { width: amtW - 8, align: "right" });
    doc.restore();

    y += 22;

    const items = Array.isArray(invoice.lineItems) ? invoice.lineItems : [];
    if (items.length === 0) {
      doc.fillColor(MUTED).font("Helvetica").fontSize(9).text("No line items", tableLeft + 8, y + 8);
      y += 28;
    } else {
      doc.font("Helvetica").fontSize(9);
      for (const row of items) {
        const desc = row.description || "—";
        const qty = Number(row.quantity) || 0;
        const unit = Number(row.unitPrice) || 0;
        const lineTotal = qty * unit;
        const rowH = Math.max(26, doc.heightOfString(desc, { width: descW - 16 }) + 14);

        if (y + rowH > doc.page.height - doc.page.margins.bottom - 120) {
          doc.addPage();
          drawAccentBar();
          y = doc.y + 16;
        }

        doc.save();
        doc.rect(tableLeft, y, pageWidth, rowH).strokeColor(BORDER).lineWidth(0.5).stroke();
        doc.restore();

        doc.fillColor(TEXT).text(desc, tableLeft + 8, y + 8, { width: descW - 16 });
        doc.text(String(qty), tableLeft + descW, y + 8, { width: qtyW - 4, align: "right" });
        doc.text(fmt(unit), tableLeft + descW + qtyW, y + 8, { width: unitW - 4, align: "right" });
        doc.font("Helvetica-Bold").text(fmt(lineTotal), tableLeft + descW + qtyW + unitW, y + 8, {
          width: amtW - 8,
          align: "right",
        });
        doc.font("Helvetica");

        y += rowH;
      }
    }

    y += 16;
    const boxW = 220;
    const boxX = tableLeft + pageWidth - boxW;

    doc.fillColor(MUTED).fontSize(9).font("Helvetica");
    doc.text("Subtotal", boxX, y, { width: boxW - 80, align: "right" });
    doc.fillColor(TEXT).text(fmt(invoice.subtotal), boxX, y, { width: boxW, align: "right" });
    y += 16;

    doc.fillColor(MUTED).text(`Tax (${Number(invoice.taxRate || 0)}%)`, boxX, y, { width: boxW - 80, align: "right" });
    doc.fillColor(TEXT).text(fmt(invoice.taxAmount), boxX, y, { width: boxW, align: "right" });
    y += 20;

    doc.save();
    doc.rect(boxX - 8, y - 4, boxW + 8, 28).fill("#eef2ff");
    doc.restore();
    doc.fillColor(ACCENT).font("Helvetica-Bold").fontSize(11);
    doc.text("Total", boxX, y + 4, { width: boxW - 80, align: "right" });
    doc.text(fmt(invoice.total), boxX, y + 4, { width: boxW, align: "right" });
    y += 40;

    if (invoice.notes) {
      doc.fillColor(TEXT).font("Helvetica-Bold").fontSize(10).text("Notes", leftX, y);
      y += 14;
      doc.font("Helvetica").fontSize(9).fillColor(MUTED).text(String(invoice.notes), leftX, y, {
        width: pageWidth,
        lineGap: 3,
      });
      y = doc.y + 8;
    }

    const footerY = doc.page.height - doc.page.margins.bottom - 24;
    doc.fontSize(8).fillColor(MUTED).font("Helvetica").text("Generated by InvoiceAI — Smart Invoice Generator", leftX, footerY, {
      width: pageWidth,
      align: "center",
    });

    doc.end();
  });
}

function formatCompanyDetails(raw) {
  if (raw == null) return "";
  if (typeof raw === "string") return raw.trim();
  if (typeof raw !== "object") return String(raw);

  const order = ["legalName", "address", "city", "country", "taxId", "vat", "phone", "email", "website", "bank", "iban", "bic"];
  const lines = [];
  const used = new Set();

  for (const key of order) {
    if (raw[key] != null && String(raw[key]).trim()) {
      lines.push(String(raw[key]).trim());
      used.add(key);
    }
  }
  for (const [k, v] of Object.entries(raw)) {
    if (used.has(k) || v == null) continue;
    const s = String(v).trim();
    if (s) lines.push(`${humanizeKey(k)}: ${s}`);
  }
  return lines.join("\n");
}

function humanizeKey(k) {
  return String(k).replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase()).trim();
}
