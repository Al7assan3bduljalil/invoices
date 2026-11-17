import * as React from "react";
import { cn } from "@/lib/utils";
type Variant = "default" | "secondary" | "destructive" | "outline" | "success" | "warning";
const v: Record<Variant, string> = {
  default: "bg-primary text-primary-foreground",
  secondary: "bg-secondary text-secondary-foreground",
  destructive: "bg-destructive text-white",
  outline: "border border-current",
  success: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  warning: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
};
export const Badge = ({ className, variant = "default", ...p }: React.HTMLAttributes<HTMLDivElement> & { variant?: Variant }) => (
  <div className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium", v[variant], className)} {...p} />
);
