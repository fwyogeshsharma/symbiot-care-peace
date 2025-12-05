import { Info } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export function ILQInfoDialog() {
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="cursor-help inline-flex">
            <Info className="h-4 w-4 text-muted-foreground hover:text-primary" />
          </span>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs p-3">
          <div className="space-y-2 text-xs">
            <p className="font-semibold text-sm">Independent Living Quotient (ILQ)</p>
            <p>
              A score from 0-100 measuring an elderly person's ability to live independently.
            </p>
            <div className="space-y-1">
              <p className="font-medium">Components:</p>
              <ul className="space-y-0.5 text-muted-foreground">
                <li>Health Vitals (30%)</li>
                <li>Physical Activity (25%)</li>
                <li>Cognitive Function (15%)</li>
                <li>Environmental Safety (15%)</li>
                <li>Emergency Response (10%)</li>
                <li>Social Engagement (5%)</li>
              </ul>
            </div>
            <div className="flex gap-2 pt-1 flex-wrap">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-green-500" />85+</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-yellow-500" />70-84</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-orange-500" />55-69</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-red-500" />&lt;55</span>
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
