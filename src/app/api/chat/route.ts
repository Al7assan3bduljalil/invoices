import { convertToModelMessages, stepCountIs, streamText, type UIMessage } from "ai";
import { getCurrentUser } from "@/server/current-user";
import { aiEnabled, getModel } from "@/server/ai/model";
import { systemPrompt } from "@/server/ai/prompt";
import { buildTools } from "@/server/ai/tools";

export const maxDuration = 60;

export async function POST(req: Request) {
  if (!aiEnabled()) {
    return Response.json(
      { error: "المساعد الذكي غير مفعّل. أضف GOOGLE_GENERATIVE_AI_API_KEY إلى ملف .env" },
      { status: 503 },
    );
  }
  const { messages }: { messages: UIMessage[] } = await req.json();
  const user = await getCurrentUser();

  const result = streamText({
    model: getModel(),
    system: systemPrompt({
      userName: user.name,
      companyName: user.companyName,
      currency: user.currency,
      taxRate: Number(user.defaultTaxRate),
    }),
    messages: convertToModelMessages(messages),
    tools: buildTools(user.id),
    stopWhen: stepCountIs(10),
  });

  return result.toUIMessageStreamResponse({
    onError: (err) => {
      console.error(err);
      return "تعذر الاتصال بالمساعد الذكي، حاول مرة أخرى.";
    },
  });
}
