import { cn } from "@/lib/utils";

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className={cn("size-5", className)}
    >
      <path
        d="M16 2.5 4 7.5v9c0 6.5 5.1 11.4 12 13 6.9-1.6 12-6.5 12-13v-9L16 2.5Z"
        className="fill-current opacity-20"
      />
      <rect x="9" y="17" width="3" height="6" rx="1" className="fill-current" />
      <rect x="14.5" y="13" width="3" height="10" rx="1" className="fill-current" />
      <rect x="20" y="9" width="3" height="14" rx="1" className="fill-current" />
      <circle cx="21.5" cy="6" r="1.6" className="fill-current" />
    </svg>
  );
}

export function Logo({
  collapsed = false,
  className,
  tone = "dark",
}: {
  collapsed?: boolean;
  className?: string;
  tone?: "dark" | "light";
}) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <div className="relative size-9 rounded-xl bg-grad-accent text-accent-foreground grid place-items-center shadow-glow ring-1 ring-white/15">
        <LogoMark className="size-5" />
      </div>
      {!collapsed && (
        <div className="leading-tight">
          <div className={cn("font-semibold tracking-tight text-[15px]", tone === "light" && "text-foreground")}>
            Budget Buddy
          </div>
          <div className="text-[10px] uppercase tracking-[0.18em] opacity-50">
            Smart finance
          </div>
        </div>
      )}
    </div>
  );
}
