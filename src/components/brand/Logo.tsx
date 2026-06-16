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
      {/* Coin / shield base */}
      <path
        d="M16 2.5 4 7.5v9c0 6.5 5.1 11.4 12 13 6.9-1.6 12-6.5 12-13v-9L16 2.5Z"
        className="fill-current opacity-15"
      />
      {/* Ascending bars */}
      <rect x="9" y="17" width="3" height="6" rx="1" className="fill-current" />
      <rect x="14.5" y="13" width="3" height="10" rx="1" className="fill-current" />
      <rect x="20" y="9" width="3" height="14" rx="1" className="fill-current" />
      {/* Spark dot */}
      <circle cx="21.5" cy="6" r="1.6" className="fill-current" />
    </svg>
  );
}

export function Logo({
  collapsed = false,
  className,
}: {
  collapsed?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <div className="size-9 rounded-xl bg-gradient-to-br from-accent to-accent/70 text-accent-foreground grid place-items-center shadow-sm ring-1 ring-white/10">
        <LogoMark className="size-5" />
      </div>
      {!collapsed && (
        <div className="leading-tight">
          <div className="font-semibold tracking-tight text-[15px]">Budget Buddy</div>
          <div className="text-[10px] uppercase tracking-[0.14em] text-current/50">
            Smart finance
          </div>
        </div>
      )}
    </div>
  );
}
