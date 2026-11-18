import { useMemo } from "react";

import { truncatePubkey } from "@/shared/lib/pubkey";
import { cn } from "@/shared/lib/cn";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/shared/ui/tooltip";

/** FNV-1a over the hex pubkey — stable, cheap, well distributed. */
function hashPubkey(hex: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < hex.length; i++) {
    hash ^= hex.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/**
 * A 5×5 horizontally mirrored identicon. Each pubkey gets a recognisable
 * pattern and hue, which reads better at a glance than two hex characters.
 */
function useIdenticon(pubkey: string) {
  return useMemo(() => {
    const seed = hashPubkey(pubkey);
    const hue = seed % 360;
    const cells: { x: number; y: number }[] = [];
    let bits = hashPubkey(`${pubkey}:cells`);
    for (let y = 0; y < 5; y++) {
      for (let x = 0; x < 3; x++) {
        const on = bits & 1;
        bits >>>= 1;
        if (bits === 0) bits = hashPubkey(`${pubkey}:${x}:${y}`);
        if (!on) continue;
        cells.push({ x, y });
        if (x < 2) cells.push({ x: 4 - x, y });
      }
    }
    return { hue, cells };
  }, [pubkey]);
}

const SIZES = {
  xs: "h-5 w-5 rounded-[5px]",
  sm: "h-6 w-6 rounded-md",
  md: "h-8 w-8 rounded-lg",
} as const;

export function PubkeyAvatar({
  pubkey,
  size = "md",
  className,
  tooltip = true,
}: {
  pubkey: string;
  size?: keyof typeof SIZES;
  className?: string;
  tooltip?: boolean;
}) {
  const { hue, cells } = useIdenticon(pubkey);
  const avatar = (
    <svg
      viewBox="-0.5 -0.5 6 6"
      role="img"
      aria-label={`Member ${truncatePubkey(pubkey)}`}
      className={cn("shrink-0 ring-1 ring-line", SIZES[size], className)}
      style={{ backgroundColor: `hsl(${hue} 60% 92%)` }}
    >
      {cells.map(({ x, y }) => (
        <rect
          key={`${x}-${y}`}
          x={x}
          y={y}
          width={1.02}
          height={1.02}
          fill={`hsl(${hue} 55% 42%)`}
        />
      ))}
    </svg>
  );

  if (!tooltip) return avatar;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex">{avatar}</span>
      </TooltipTrigger>
      <TooltipContent>
        <span className="font-mono text-xs">{pubkey}</span>
      </TooltipContent>
    </Tooltip>
  );
}

/** Overlapping stack of avatars with a "+N" overflow chip. */
export function AvatarStack({
  pubkeys,
  max = 4,
}: {
  pubkeys: string[];
  max?: number;
}) {
  const visible = pubkeys.slice(0, max);
  const extra = pubkeys.length - visible.length;
  return (
    <span className="flex items-center -space-x-1.5">
      {visible.map((pk) => (
        <PubkeyAvatar
          key={pk}
          pubkey={pk}
          size="xs"
          tooltip={false}
          className="ring-2 ring-panel"
        />
      ))}
      {extra > 0 && (
        <span className="z-10 flex h-5 min-w-5 items-center justify-center rounded-[5px] bg-hover px-1 text-[10px] font-medium text-ink-muted ring-2 ring-panel">
          +{extra}
        </span>
      )}
    </span>
  );
}
