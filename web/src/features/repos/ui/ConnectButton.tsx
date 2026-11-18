import { ExternalLink } from "lucide-react";

import { cn } from "@/shared/lib/cn";
import { relayWsUrl } from "@/shared/lib/relay-url";
import { Button } from "@/shared/ui/button";

export function ConnectButton({ className }: { className?: string }) {
  const deepLink = `buzz://connect?relay=${encodeURIComponent(relayWsUrl())}`;

  return (
    <Button
      asChild
      className={cn(
        "bg-ink text-page shadow-none hover:bg-ink/85 focus-visible:ring-2 focus-visible:ring-honey",
        className,
      )}
    >
      <a href={deepLink}>
        <ExternalLink className="h-4 w-4" />
        Open in Buzz
      </a>
    </Button>
  );
}
