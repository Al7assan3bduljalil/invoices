import { getCurrentUser } from "@/server/current-user";
import { handle } from "@/server/http";
import { createLetter, listLetters } from "@/server/letters";
import { LETTER_DIRECTIONS, type LetterDirectionValue } from "@/lib/letters";

export async function GET(req: Request) {
  return handle(async () => {
    const user = await getCurrentUser();
    const sp = new URL(req.url).searchParams;
    const d = sp.get("direction");
    return listLetters(user.id, {
      q: sp.get("q") ?? undefined,
      clientId: sp.get("clientId") ?? undefined,
      direction: LETTER_DIRECTIONS.includes(d as LetterDirectionValue) ? (d as LetterDirectionValue) : undefined,
    });
  });
}

export async function POST(req: Request) {
  return handle(async () => {
    const user = await getCurrentUser();
    return Response.json(await createLetter(user.id, await req.json()), { status: 201 });
  });
}
