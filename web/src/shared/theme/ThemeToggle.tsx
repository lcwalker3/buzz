import { Moon, Sun, Monitor } from "lucide-react";
import { useTheme } from "@/shared/theme/ThemeProvider";
import { Button } from "@/shared/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/shared/ui/tooltip";

const icons = {
  light: Sun,
  dark: Moon,
  system: Monitor,
} as const;

const labels = {
  light: "Light theme",
  dark: "Dark theme",
  system: "System theme",
} as const;

const next: Record<string, "dark" | "system" | "light"> = {
  light: "dark",
  dark: "system",
  system: "light",
};

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const Icon = icons[theme];

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-ink-muted hover:bg-hover hover:text-ink"
          onClick={() => setTheme(next[theme])}
          aria-label={`${labels[theme]}. Switch to ${labels[next[theme]].toLowerCase()}.`}
        >
          <Icon className="h-4 w-4" />
        </Button>
      </TooltipTrigger>
      <TooltipContent>{labels[theme]}</TooltipContent>
    </Tooltip>
  );
}
