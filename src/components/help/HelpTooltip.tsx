import { HelpCircle } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface HelpTooltipProps {
  content: string | React.ReactNode;
  title?: string;
  learnMoreUrl?: string;
  className?: string;
  side?: "top" | "right" | "bottom" | "left";
}

export const HelpTooltip = ({
  content,
  title,
  learnMoreUrl,
  className,
  side = "top"
}: HelpTooltipProps) => {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "inline-flex items-center justify-center rounded-full p-1 text-muted-foreground hover:text-foreground active:text-foreground transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
            className
          )}
          aria-label="Help information"
        >
          <HelpCircle className="h-4 w-4" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-72 max-w-[calc(100vw-2rem)] p-4 space-y-2"
        side={side}
        align="center"
      >
        {title && (
          <div className="font-semibold text-sm">{title}</div>
        )}
        <div className="text-sm text-muted-foreground">
          {content}
        </div>
        {learnMoreUrl && (
          <a
            href={learnMoreUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-primary hover:underline active:underline inline-block mt-2"
          >
            Learn more →
          </a>
        )}
      </PopoverContent>
    </Popover>
  );
};
