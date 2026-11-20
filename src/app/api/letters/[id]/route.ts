import { getCurrentUser } from "@/server/current-user";
import { handle } from "@/server/http";
import { deleteLetter, getLetter, updateLetter } from "@/server/letters";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_: Request, { params }: Ctx) {
  return handle(async () => getLetter((await getCurrentUser()).id, (await params).id));
}

export async function PUT(req: Request, { params }: Ctx) {
  return handle(async () =>
    updateLetter((await getCurrentUser()).id, (await params).id, await req.json()),
  );
}

export async function DELETE(_: Request, { params }: Ctx) {
  return handle(async () => {
    await deleteLetter((await getCurrentUser()).id, (await params).id);
    return { ok: true };
  });
}
