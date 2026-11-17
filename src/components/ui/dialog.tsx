"use client";
import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "./button";

interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}
export function Dialog({ open, onOpenChange, children }: DialogProps) {
  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onOpenChange(false); };
    if (open) window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onOpenChange]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={() => onOpenChange(false)} />
      <div className="relative z-10 w-full max-w-lg mx-4">{children}</div>
    </div>
  );
}
export const DialogContent = ({ className, children, ...p }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("bg-card rounded-xl shadow-2xl border p-6 max-h-[90vh] overflow-y-auto", className)} {...p}>{children}</div>
);
export const DialogHeader = ({ className, ...p }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("mb-4", className)} {...p} />
);
export const DialogTitle = ({ className, ...p }: React.HTMLAttributes<HTMLHeadingElement>) => (
  <h2 className={cn("text-lg font-semibold", className)} {...p} />
);
export const DialogFooter = ({ className, ...p }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex justify-end gap-2 mt-6", className)} {...p} />
);
interface DialogCloseProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {}
export function DialogClose({ children, ...p }: DialogCloseProps) {
  return <Button variant="outline" {...p}>{children ?? "إغلاق"}</Button>;
}
