"use client";
import { Button } from "@/components/ui/button";

export function Header({ onMenuClick }: { onMenuClick: () => void }) {
  return (
    <header className="h-14 border-b bg-card flex items-center px-4 gap-3 lg:px-6">
      <Button variant="ghost" size="icon" className="lg:hidden" onClick={onMenuClick}>
        <span className="text-lg">☰</span>
      </Button>
      <div className="flex-1" />
      <ThemeToggle />
    </header>
  );
}

function ThemeToggle() {
  return (
    <Button
      variant="ghost"
      size="icon"
      title="تبديل الوضع"
      onClick={() => {
        const html = document.documentElement;
        html.classList.toggle("dark");
        localStorage.setItem("theme", html.classList.contains("dark") ? "dark" : "light");
      }}
    >
      <span className="text-base">🌙</span>
    </Button>
  );
}
