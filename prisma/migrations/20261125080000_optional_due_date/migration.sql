-- تاريخ الاستحقاق اختياري: يمكن إلغاؤه من الفاتورة
ALTER TABLE "Invoice" ALTER COLUMN "dueDate" DROP NOT NULL;
