/**
 * سجلات منظمة: كل حدث سطر JSON واحد على stdout/stderr، فيسهل تصفيتها من
 * `docker compose logs app | grep '"event":"tg.agent"'` أو إرسالها لأي أداة مراقبة.
 */
type Level = "info" | "warn" | "error";

export function log(level: Level, event: string, fields: Record<string, unknown> = {}) {
  const line = JSON.stringify({ t: new Date().toISOString(), level, event, ...fields }, (_, v) =>
    v instanceof Error ? { name: v.name, message: v.message } : typeof v === "bigint" ? Number(v) : v,
  );
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

/** مؤقت بسيط: ms() يعيد الزمن المنقضي بالمللي ثانية */
export function timer() {
  const start = performance.now();
  return () => Math.round(performance.now() - start);
}
