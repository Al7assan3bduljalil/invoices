import { Prisma, type Letter } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
  DIRECTION_PREFIX,
  LETTER_DIRECTIONS,
  LETTER_STATUSES,
  type LetterDirectionValue,
  type LetterDTO,
} from "@/lib/letters";
import { HttpError } from "./http";

const optionalText = z
  .string()
  .trim()
  .optional()
  .nullable()
  .transform((v) => (v ? v : null));

export const letterSchema = z.object({
  direction: z.enum(LETTER_DIRECTIONS).default("OUTGOING"),
  status: z.enum(LETTER_STATUSES).default("DRAFT"),
  date: z.coerce.date().default(() => new Date()),
  subject: z.string().trim().min(1, "الموضوع مطلوب"),
  party: z.string().trim().min(1, "اسم الجهة مطلوب"),
  partyTitle: optionalText,
  externalRef: optionalText,
  body: z.string().trim().default(""),
  signatory: optionalText,
  cc: optionalText,
  notes: optionalText,
  clientId: optionalText,
});
export type LetterInput = z.input<typeof letterSchema>;

type LetterRow = Letter & { client?: { id: string; name: string } | null };

export function serializeLetter(l: LetterRow): LetterDTO {
  return {
    id: l.id,
    number: l.number,
    direction: l.direction,
    status: l.status,
    date: l.date.toISOString(),
    subject: l.subject,
    party: l.party,
    partyTitle: l.partyTitle,
    externalRef: l.externalRef,
    body: l.body,
    signatory: l.signatory,
    cc: l.cc,
    notes: l.notes,
    clientId: l.clientId,
    client: l.client ? { id: l.client.id, name: l.client.name } : null,
    createdByAI: l.createdByAI,
    createdAt: l.createdAt.toISOString(),
    updatedAt: l.updatedAt.toISOString(),
  };
}

const withClient = { client: { select: { id: true, name: true } } } as const;

/** الرقم الإشاري التالي: ص/2026/0001 — تسلسل مستقل لكل نوع ولكل سنة */
async function nextNumber(userId: string, direction: LetterDirectionValue, date: Date) {
  const prefix = `${DIRECTION_PREFIX[direction]}/${date.getFullYear()}/`;
  const rows = await prisma.letter.findMany({
    where: { userId, number: { startsWith: prefix } },
    select: { number: true },
  });
  const max = rows.reduce((m, r) => Math.max(m, Number(r.number.slice(prefix.length)) || 0), 0);
  return `${prefix}${String(max + 1).padStart(4, "0")}`;
}

async function assertClient(userId: string, clientId: string | null) {
  if (!clientId) return;
  const c = await prisma.client.findFirst({ where: { id: clientId, userId }, select: { id: true } });
  if (!c) throw new HttpError(400, "العميل غير موجود");
}

export async function createLetter(userId: string, raw: unknown, opts: { createdByAI?: boolean } = {}) {
  const data = letterSchema.parse(raw);
  await assertClient(userId, data.clientId);
  // إعادة المحاولة عند تزامن إنشاء خطابين بنفس الرقم
  for (let attempt = 0; ; attempt++) {
    const number = await nextNumber(userId, data.direction, data.date);
    try {
      const l = await prisma.letter.create({
        data: { ...data, number, userId, createdByAI: opts.createdByAI ?? false },
        include: withClient,
      });
      return serializeLetter(l);
    } catch (e) {
      if (attempt < 3 && e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") continue;
      throw e;
    }
  }
}

async function own(userId: string, id: string) {
  const l = await prisma.letter.findFirst({ where: { id, userId }, include: withClient });
  if (!l) throw new HttpError(404, "المراسلة غير موجودة");
  return l;
}

export async function getLetter(userId: string, id: string) {
  return serializeLetter(await own(userId, id));
}

export async function updateLetter(userId: string, id: string, raw: unknown) {
  const current = await own(userId, id);
  const data = letterSchema.parse(raw);
  await assertClient(userId, data.clientId);
  // تغيير النوع (صادر/وارد) يعطي رقماً إشارياً جديداً من تسلسل النوع الجديد
  const number =
    data.direction !== current.direction ? await nextNumber(userId, data.direction, data.date) : undefined;
  const l = await prisma.letter.update({
    where: { id: current.id },
    data: { ...data, ...(number ? { number } : {}) },
    include: withClient,
  });
  return serializeLetter(l);
}

export async function deleteLetter(userId: string, id: string) {
  const l = await own(userId, id);
  await prisma.letter.delete({ where: { id: l.id } });
}

export async function listLetters(
  userId: string,
  opts: { q?: string; direction?: LetterDirectionValue; clientId?: string; take?: number } = {},
) {
  const q = opts.q?.trim();
  const rows = await prisma.letter.findMany({
    where: {
      userId,
      ...(opts.direction ? { direction: opts.direction } : {}),
      ...(opts.clientId ? { clientId: opts.clientId } : {}),
      ...(q
        ? {
            OR: [
              { number: { contains: q, mode: "insensitive" as const } },
              { subject: { contains: q, mode: "insensitive" as const } },
              { party: { contains: q, mode: "insensitive" as const } },
              { externalRef: { contains: q, mode: "insensitive" as const } },
              { body: { contains: q, mode: "insensitive" as const } },
            ],
          }
        : {}),
    },
    include: withClient,
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    take: opts.take ?? 500,
  });
  return rows.map(serializeLetter);
}
