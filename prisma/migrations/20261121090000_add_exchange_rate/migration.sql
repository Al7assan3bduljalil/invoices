-- سعر الصرف وخيار إظهاره في الفاتورة المطبوعة
ALTER TABLE "Invoice" ADD COLUMN "exchangeRate" DECIMAL(14,4);
ALTER TABLE "Invoice" ADD COLUMN "exchangeCurrency" TEXT NOT NULL DEFAULT 'LYD';
ALTER TABLE "Invoice" ADD COLUMN "showExchangeRate" BOOLEAN NOT NULL DEFAULT true;
