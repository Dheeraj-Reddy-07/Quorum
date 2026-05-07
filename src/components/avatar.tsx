import { initialsOf } from "@/lib/store";
import { cn } from "@/lib/utils";

const palette = [
  "bg-sky-500/20 text-sky-300 ring-sky-500/30",
  "bg-violet-500/20 text-violet-300 ring-violet-500/30",
  "bg-emerald-500/20 text-emerald-300 ring-emerald-500/30",
  "bg-amber-500/20 text-amber-300 ring-amber-500/30",
  "bg-rose-500/20 text-rose-300 ring-rose-500/30",
  "bg-fuchsia-500/20 text-fuchsia-300 ring-fuchsia-500/30",
];

function hash(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h << 5) - h + s.charCodeAt(i);
  return Math.abs(h);
}

export function Avatar({ name, size = 28, className }: { name?: string; size?: number; className?: string }) {
  const safe = name ?? "?";
  const color = palette[hash(safe) % palette.length];
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded-full ring-1 font-medium",
        color,
        className
      )}
      style={{ width: size, height: size, fontSize: Math.max(10, size * 0.38) }}
      title={name}
    >
      {name ? initialsOf(name) : "?"}
    </span>
  );
}

export function AvatarStack({ names, max = 4, size = 24 }: { names: string[]; max?: number; size?: number }) {
  const visible = names.slice(0, max);
  const rest = names.length - visible.length;
  return (
    <div className="flex -space-x-2">
      {visible.map((n, i) => (
        <Avatar key={n + i} name={n} size={size} className="ring-2 ring-background" />
      ))}
      {rest > 0 && (
        <span
          className="grid place-items-center rounded-full bg-surface ring-2 ring-background text-[10px] text-muted-foreground"
          style={{ width: size, height: size }}
        >
          +{rest}
        </span>
      )}
    </div>
  );
}
