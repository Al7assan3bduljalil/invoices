"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/", label: "لوحة المؤشرات", icon: "📊" },
  { href: "/invoices", label: "الفواتير", icon: "🧾" },
  { href: "/archive", label: "الأرشيف", icon: "🗄️" },
  { href: "/clients", label: "العملاء", icon: "👥" },
  { href: "/products", label: "المنتجات والخدمات", icon: "📦" },
  { href: "/settings", label: "الإعدادات", icon: "⚙️" },
];

export function Sidebar({ open, onClose }: { open?: boolean; onClose?: () => void }) {
  const path = usePathname();
  return (
    <>
      {/* Overlay mobile */}
      {open && <div className="fixed inset-0 bg-black/40 z-20 lg:hidden" onClick={onClose} />}

      <aside className={cn(
        "fixed top-0 end-0 h-full w-64 bg-card border-s z-30 flex flex-col transition-transform duration-200",
        "lg:translate-x-0 lg:static lg:z-auto",
        open ? "translate-x-0" : "translate-x-full lg:translate-x-0",
      )}>
        {/* Logo */}
        <div className="p-6 border-b">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white text-lg font-bold">ف</div>
            <div>
              <p className="font-bold text-sm">فواتير</p>
              <p className="text-xs text-muted-foreground">نظام الفواتير الذكي</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
          {NAV.map((item) => (
            <Link key={item.href} href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors",
                path === item.href
                  ? "bg-blue-50 text-blue-700 font-medium dark:bg-blue-950 dark:text-blue-300"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
              onClick={onClose}>
              <span className="text-base">{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t text-xs text-muted-foreground text-center">
          نظام الفواتير v1.0
        </div>
      </aside>
    </>
  );
}
