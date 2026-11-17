"use client";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function MarkdownText({ text }: { text: string }) {
  const parts = text
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/`([^`]+)`/g, '<code class="bg-muted px-1 rounded text-xs">$1</code>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-blue-500 underline" target="_blank">$1</a>')
    .split("\n");
  return (
    <div className="space-y-1 leading-relaxed text-sm">
      {parts.map((p, i) => (
        <p key={i} dangerouslySetInnerHTML={{ __html: p || "&nbsp;" }} />
      ))}
    </div>
  );
}

export function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  const { messages, sendMessage, status, error } = useChat({
    transport: new DefaultChatTransport({ api: "/api/chat" }),
  });

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open]);

  const isLoading = status === "submitted" || status === "streaming";

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || isLoading) return;
    const text = input;
    setInput("");
    await sendMessage({ text });
  };

  const fillSuggestion = (s: string) => setInput(s);

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-5 start-5 z-40 w-14 h-14 rounded-full bg-blue-600 text-white shadow-xl flex items-center justify-center text-2xl hover:bg-blue-700 transition-all hover:scale-105"
        title="المساعد الذكي"
      >
        {open ? "✕" : "🤖"}
      </button>

      {/* Chat panel */}
      <div className={cn(
        "fixed bottom-24 start-5 z-40 w-80 sm:w-96 h-[520px] rounded-2xl shadow-2xl border bg-card flex flex-col transition-all duration-200 origin-bottom-left",
        open ? "opacity-100 scale-100" : "opacity-0 scale-95 pointer-events-none",
      )}>
        {/* Header */}
        <div className="flex items-center gap-3 p-4 border-b">
          <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-base">🤖</div>
          <div>
            <p className="font-semibold text-sm">مساعد الفوترة</p>
            <p className="text-xs text-muted-foreground">{isLoading ? "يكتب..." : "جاهز للمساعدة"}</p>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.length === 0 && (
            <div className="text-center space-y-3 mt-4">
              <div className="text-4xl">💬</div>
              <p className="text-sm text-muted-foreground font-medium">كيف يمكنني مساعدتك؟</p>
              <div className="space-y-2">
                {[
                  "اصنع فاتورة لشركة ABC بمبلغ 1000 دولار",
                  "من هو العميل الأكثر شراءً هذا الشهر؟",
                  "ما هي الفواتير المتأخرة؟",
                  "اكتب رسالة تذكير للفاتورة INV-2026-0001",
                ].map((s) => (
                  <button key={s}
                    onClick={() => fillSuggestion(s)}
                    className="block w-full text-xs text-start px-3 py-2 rounded-lg bg-muted hover:bg-muted/80 transition-colors text-muted-foreground">
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((m) => {
            const text = m.parts.filter(p => p.type === "text").map(p => p.type === "text" ? p.text : "").join("");
            return (
              <div key={m.id} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
                <div className={cn(
                  "max-w-[85%] rounded-2xl px-4 py-2.5",
                  m.role === "user"
                    ? "bg-blue-600 text-white rounded-br-sm"
                    : "bg-muted rounded-bl-sm",
                )}>
                  {m.role === "user"
                    ? <p className="text-sm">{text}</p>
                    : <MarkdownText text={text} />
                  }
                </div>
              </div>
            );
          })}

          {error && (
            <div className="text-xs text-destructive bg-destructive/10 rounded-lg p-2 text-center">
              {error.message || "حدث خطأ، حاول مرة أخرى"}
            </div>
          )}

          <div ref={endRef} />
        </div>

        {/* Input */}
        <form onSubmit={handleSubmit} className="p-3 border-t flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="اكتب رسالتك..."
            disabled={isLoading}
            className="flex-1 rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
            dir="auto"
          />
          <Button type="submit" size="icon" disabled={isLoading || !input.trim()}>
            {isLoading ? "⏳" : "⬆️"}
          </Button>
        </form>
      </div>
    </>
  );
}
