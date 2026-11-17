import { getCurrentUser } from "@/server/current-user";
import { handle } from "@/server/http";
import { getDashboardStats } from "@/server/stats";


export async function GET() {
  return handle(async () => getDashboardStats((await getCurrentUser()).id));
}
