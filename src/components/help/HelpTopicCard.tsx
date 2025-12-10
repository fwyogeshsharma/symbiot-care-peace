import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, Play, Image as ImageIcon, Youtube } from 'lucide-react';
import { HelpTopic } from '@/data/help-content';
import { cn } from '@/lib/utils';

interface HelpTopicCardProps {
  topic: HelpTopic;
  onNavigate: (path: string) => void;
  highlighted?: boolean;
  showCategory?: boolean;
  compact?: boolean;
}

export const HelpTopicCard = ({ 
  topic, 
  onNavigate, 
  highlighted = false,
  showCategory = false,
  compact = false
}: HelpTopicCardProps) => {
  const [mediaError, setMediaError] = useState(false);

  return (
    <div
      className={cn(
        "rounded-lg border hover:border-primary/50 transition-colors overflow-hidden",
        highlighted && "bg-accent/50",
        compact ? "p-2" : "p-3"
      )}
    >
      <div className={cn("flex items-start justify-between gap-2", compact ? "mb-1" : "mb-2")}>
        <div className="flex items-center gap-2 flex-1">
          <h4 className={cn("font-medium", compact ? "text-sm" : "text-sm")}>{topic.title}</h4>
          {topic.mediaUrl && (
            <Badge variant="secondary" className="text-xs shrink-0 flex items-center gap-1">
              {topic.mediaType === 'video' ? (
                <>
                  <Play className="w-3 h-3" />
                  Video
                </>
              ) : (
                <>
                  <ImageIcon className="w-3 h-3" />
                  GIF
                </>
              )}
            </Badge>
          )}
          {topic.youtubeUrl && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 shrink-0"
              onClick={() => window.open(topic.youtubeUrl, '_blank')}
              title="Watch on YouTube"
            >
              <Youtube className="w-4 h-4 text-red-600" />
            </Button>
          )}
        </div>
        {showCategory && (
          <Badge variant="outline" className="text-xs shrink-0">
            {topic.category}
          </Badge>
        )}
      </div>

      <p className={cn("text-muted-foreground", compact ? "text-xs" : "text-sm")}>{topic.content}</p>

      {/* Video or GIF Tutorial */}
      {topic.mediaUrl && !mediaError && (
        <div className="mt-3 rounded-md overflow-hidden bg-muted/30">
          {topic.mediaType === 'video' ? (
            <video
              src={topic.mediaUrl}
              controls
              className="w-full"
              onError={() => setMediaError(true)}
              preload="metadata"
            >
              <track kind="captions" />
              Your browser does not support the video tag.
            </video>
          ) : (
            <img
              src={topic.mediaUrl}
              alt={`${topic.title} tutorial`}
              className="w-full"
              onError={() => setMediaError(true)}
            />
          )}
        </div>
      )}

      {topic.relatedPages && topic.relatedPages.length > 0 && (
        <Button
          variant="link"
          size="sm"
          className={cn("h-auto p-0", compact ? "mt-1 text-xs" : "mt-2 text-xs")}
          onClick={() => onNavigate(topic.relatedPages![0])}
        >
          Go to page <ArrowRight className="w-3 h-3 ml-1" />
        </Button>
      )}
    </div>
  );
};
