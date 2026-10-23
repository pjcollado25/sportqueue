import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "ghost" | "danger";

export function buttonClasses(variant: Variant = "primary", full = false, className?: string): string {
  return cn(
    "inline-flex min-h-14 touch-manipulation items-center justify-center gap-2 rounded-2xl px-4 text-center text-base font-bold transition active:scale-[0.99] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pine disabled:cursor-not-allowed disabled:opacity-50",
    full && "w-full",
    variant === "primary" && "bg-lime text-pine",
    variant === "secondary" && "border border-line bg-white text-pine",
    variant === "ghost" && "bg-transparent text-pine",
    variant === "danger" && "bg-red-50 text-red-800",
    className,
  );
}

export function Button({
  variant = "primary",
  full = false,
  className,
  type = "button",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; full?: boolean }) {
  return <button type={type} className={buttonClasses(variant, full, className)} {...props} />;
}

export function ButtonLink({
  href,
  children,
  variant = "primary",
  full = false,
  className,
}: {
  href: string;
  children: ReactNode;
  variant?: Variant;
  full?: boolean;
  className?: string;
}) {
  return (
    <Link href={href} className={buttonClasses(variant, full, className)}>
      {children}
    </Link>
  );
}
