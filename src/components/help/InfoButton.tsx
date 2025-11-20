import { Info } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface InfoButtonProps {
  content: string | React.ReactNode;
  title?: string;
  learnMoreUrl?: string;
  className?: string;
  side?: "top" | "right" | "bottom" | "left";
}

export const InfoButton = ({
  content,
  title,
  learnMoreUrl,
  className,
  side = "top"
}: InfoButtonProps) => {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "inline-flex items-center justify-center rounded-full p-1 text-muted-foreground hover:text-foreground transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
            className
          )}
          aria-label="Information"
        >
          <Info className="h-4 w-4" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-80 max-w-[calc(100vw-2rem)]"
        side={side}
        align="start"
      >
        <div className="space-y-2">
          {title && (
            <h4 className="font-semibold text-sm">{title}</h4>
          )}
          <div className="text-sm text-muted-foreground">
            {content}
          </div>
          {learnMoreUrl && (
            <a
              href={learnMoreUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-primary hover:underline inline-block mt-2"
            >
              Learn more →
            </a>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};
