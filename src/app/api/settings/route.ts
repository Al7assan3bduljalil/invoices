import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/server/current-user";
import { handle } from "@/server/http";


const settingsSchema = z.object({
  name: z.string().trim().min(1),
  email: z.email(),
  companyName: z.string().trim().nullable().optional(),
  companyAddress: z.string().trim().nullable().optional(),
  taxNumber: z.string().trim().nullable().optional(),
  phone: z.string().trim().nullable().optional(),
  currency: z.string().trim().length(3),
  defaultTaxRate: z.coerce.number().min(0).max(100),
  invoicePrefix: z.string().trim().min(1).max(10),
});

const pick = (u: Awaited<ReturnType<typeof getCurrentUser>>) => ({
  name: u.name,
  email: u.email,
  companyName: u.companyName,
  companyAddress: u.companyAddress,
  taxNumber: u.taxNumber,
  phone: u.phone,
  currency: u.currency,
  defaultTaxRate: Number(u.defaultTaxRate),
  invoicePrefix: u.invoicePrefix,
  stampUrl: u.stampUrl,
  signatureUrl: u.signatureUrl,
});

export async function GET() {
  return handle(async () => pick(await getCurrentUser()));
}

export async function PUT(req: Request) {
  return handle(async () => {
    const user = await getCurrentUser();
    const data = settingsSchema.parse(await req.json());
    return pick(await prisma.user.update({ where: { id: user.id }, data }));
  });
}
