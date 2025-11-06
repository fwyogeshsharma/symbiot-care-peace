import { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  learnMoreUrl?: string;
  className?: string;
}

export const EmptyState = ({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  learnMoreUrl,
  className,
}: EmptyStateProps) => {
  return (
    <Card className={`p-8 text-center ${className || ""}`}>
      <div className="flex flex-col items-center space-y-4">
        <div className="rounded-full bg-muted p-4">
          <Icon className="h-8 w-8 text-muted-foreground" />
        </div>
        <div className="space-y-2">
          <h3 className="text-lg font-semibold">{title}</h3>
          <p className="text-sm text-muted-foreground max-w-md">
            {description}
          </p>
        </div>
        <div className="flex gap-2">
          {actionLabel && onAction && (
            <Button onClick={onAction} variant="default">
              {actionLabel}
            </Button>
          )}
          {learnMoreUrl && (
            <Button 
              variant="outline" 
              onClick={() => window.open(learnMoreUrl, '_blank')}
            >
              Learn More
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
};
