import { withAdminPermission } from "../../../../../lib/auth";
import fs from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { requireAdminApi } from "../../../../../lib/auth";
import { buildAiEnhancedProductInfoDraft, buildProductInfoDraft, extractProductInfoPdfText } from "../../../../../lib/product-info-pdf";

export const runtime = "nodejs";

const MAX_PDF_BYTES = 16 * 1024 * 1024;

function sanitizeFileName(value) {
  const baseName = path.basename(String(value || "product-info.pdf")).replace(/\.pdf$/i, "");
  const safeName = baseName
    .normalize("NFKD")
    .replace(/[^\w.-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();

  return `${safeName || "product-info"}.pdf`;
}

async function handlePOST(request) {
  try {
    await requireAdminApi();

    const formData = await request.formData();
    const file = formData.get("pdf");

    if (!file || typeof file.arrayBuffer !== "function") {
      return NextResponse.json({ error: "Choose a PDF file first." }, { status: 400 });
    }

    if (file.size > MAX_PDF_BYTES) {
      return NextResponse.json({ error: "PDF is too large. Maximum size is 16 MB." }, { status: 400 });
    }

    const originalName = sanitizeFileName(file.name);
    const isPdf = file.type === "application/pdf" || /\.pdf$/i.test(originalName);
    if (!isPdf) {
      return NextResponse.json({ error: "Only PDF files are supported." }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const extractedText = await extractProductInfoPdfText(buffer);

    if (!extractedText) {
      return NextResponse.json({ error: "No readable text was found in this PDF." }, { status: 400 });
    }

    const publicDirectory = path.join(process.cwd(), "public", "product-info", "uploads");
    await fs.mkdir(publicDirectory, { recursive: true });

    const storedName = `${randomUUID().slice(0, 8)}-${originalName}`;
    const absolutePath = path.join(publicDirectory, storedName);
    await fs.writeFile(absolutePath, buffer);

    const publicPath = `/product-info/uploads/${storedName}`;
    const fallbackDraft = buildProductInfoDraft({ text: extractedText, fileName: file.name });
    const draft = await buildAiEnhancedProductInfoDraft({
      text: extractedText,
      fileName: file.name,
      fallbackDraft,
    });

    return NextResponse.json({
      pdfPath: publicPath,
      ...draft,
    });
  } catch (error) {
    const status = Number.isInteger(error?.status) ? error.status : 500;
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "PDF extraction failed." },
      { status },
    );
  }
}

export const POST = withAdminPermission("FRG_MANAGE", handlePOST);
