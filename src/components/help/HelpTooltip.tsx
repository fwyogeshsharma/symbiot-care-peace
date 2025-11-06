import { HelpCircle } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface HelpTooltipProps {
  content: string | React.ReactNode;
  title?: string;
  learnMoreUrl?: string;
  className?: string;
}

export const HelpTooltip = ({ 
  content, 
  title, 
  learnMoreUrl,
  className 
}: HelpTooltipProps) => {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            className={cn(
              "inline-flex items-center justify-center rounded-full p-1 text-muted-foreground hover:text-foreground transition-colors",
              className
            )}
            aria-label="Help information"
          >
            <HelpCircle className="h-4 w-4" />
          </button>
        </TooltipTrigger>
        <TooltipContent 
          className="max-w-xs p-4 space-y-2"
          side="top"
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
              className="text-sm text-primary hover:underline inline-block mt-2"
            >
              Learn more →
            </a>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
