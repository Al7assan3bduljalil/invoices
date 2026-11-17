import { prisma } from "@/lib/prisma";

/**
 * يعيد التاجر الحالي.
 * النسخة الحالية تعمل بحساب واحد (أول مستخدم في قاعدة البيانات، ويُنشأ تلقائياً إن لم يوجد).
 * عند إضافة نظام تسجيل الدخول يكفي تعديل هذه الدالة لتقرأ المستخدم من الجلسة.
 */
export async function getCurrentUser() {
  const existing = await prisma.user.findFirst({ orderBy: { createdAt: "asc" } });
  if (existing) return existing;
  return prisma.user.create({
    data: { name: "التاجر", email: "owner@example.com", companyName: "شركتي" },
  });
}
