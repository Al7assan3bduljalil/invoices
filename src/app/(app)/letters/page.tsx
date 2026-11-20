export const dynamic = "force-dynamic";

import { getCurrentUser } from "@/server/current-user";
import { listLetters } from "@/server/letters";
import { LettersTable } from "./letters-table";

export const metadata = { title: "المراسلات" };

export default async function LettersPage() {
  const user = await getCurrentUser();
  const letters = await listLetters(user.id);
  return <LettersTable letters={letters} />;
}
