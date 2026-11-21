import { getCurrentUser } from "@/server/current-user";
import { handle } from "@/server/http";
import { setExchangeRate } from "@/server/invoices";
import { exchangeRateSchema } from "@/server/validation";

type Ctx = { params: Promise<{ id: string }> };

/** { exchangeRate?, exchangeCurrency?, showExchangeRate? } */
export async function PATCH(req: Request, { params }: Ctx) {
  return handle(async () => {
    const data = exchangeRateSchema.parse(await req.json());
    return setExchangeRate((await getCurrentUser()).id, (await params).id, data);
  });
}
