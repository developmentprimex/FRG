ALTER TABLE "KitchenAbDocument" ADD COLUMN "pdfStorageKey" TEXT;
ALTER TABLE "KitchenAbDocument" ALTER COLUMN "pdfBytes" DROP NOT NULL;
ALTER TABLE "KitchenAbDocument" ADD CONSTRAINT "KitchenAbDocument_pdf_storage_check"
    CHECK ("pdfBytes" IS NOT NULL OR "pdfStorageKey" IS NOT NULL);
