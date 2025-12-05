import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Play, Pause, SkipBack, SkipForward, FastForward } from 'lucide-react';
import { Position } from '@/lib/positionUtils';
import { format } from 'date-fns';
import { useTranslation } from 'react-i18next';

interface MovementPlaybackProps {
  positions: { position: Position; timestamp: Date }[];
  onPositionChange: (index: number) => void;
  currentIndex: number;
}

export const MovementPlayback = ({
  positions,
  onPositionChange,
  currentIndex
}: MovementPlaybackProps) => {
  const { t } = useTranslation();
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  
  const speeds = [1, 2, 5, 10, 20];

  useEffect(() => {
    if (!isPlaying || positions.length === 0) return;

    const interval = setInterval(() => {
      onPositionChange((currentIndex + 1) % positions.length);
    }, 1000 / playbackSpeed);

    return () => clearInterval(interval);
  }, [isPlaying, currentIndex, playbackSpeed, positions.length, onPositionChange]);

  const handleSliderChange = (value: number[]) => {
    setIsPlaying(false);
    onPositionChange(value[0]);
  };

  const togglePlay = () => setIsPlaying(!isPlaying);
  
  const skipBackward = () => {
    setIsPlaying(false);
    onPositionChange(Math.max(0, currentIndex - 10));
  };
  
  const skipForward = () => {
    setIsPlaying(false);
    onPositionChange(Math.min(positions.length - 1, currentIndex + 10));
  };

  const cycleSpeed = () => {
    const currentSpeedIndex = speeds.indexOf(playbackSpeed);
    const nextSpeed = speeds[(currentSpeedIndex + 1) % speeds.length];
    setPlaybackSpeed(nextSpeed);
  };

  if (positions.length === 0) {
    return (
      <Card className="p-4">
        <p className="text-center text-muted-foreground">{t('tracking.playback.noData')}</p>
      </Card>
    );
  }

  const currentPosition = positions[currentIndex];

  return (
    <Card className="p-4">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">{t('tracking.playback.title')}</h3>
          <div className="text-sm text-muted-foreground">
            {format(currentPosition.timestamp, 'PPpp')}
          </div>
        </div>

        <div className="space-y-2">
          <Slider
            value={[currentIndex]}
            min={0}
            max={positions.length - 1}
            step={1}
            onValueChange={handleSliderChange}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{format(positions[0].timestamp, 'HH:mm')}</span>
            <span>
              {currentIndex + 1} / {positions.length}
            </span>
            <span>{format(positions[positions.length - 1].timestamp, 'HH:mm')}</span>
          </div>
        </div>

        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={skipBackward}
            disabled={currentIndex === 0}
          >
            <SkipBack className="h-4 w-4" />
          </Button>
          
          <Button
            variant="default"
            size="icon"
            onClick={togglePlay}
            className="h-12 w-12"
          >
            {isPlaying ? (
              <Pause className="h-5 w-5" />
            ) : (
              <Play className="h-5 w-5" />
            )}
          </Button>
          
          <Button
            variant="outline"
            size="icon"
            onClick={skipForward}
            disabled={currentIndex === positions.length - 1}
          >
            <SkipForward className="h-4 w-4" />
          </Button>
          
          <Button
            variant="outline"
            onClick={cycleSpeed}
            className="gap-2"
          >
            <FastForward className="h-4 w-4" />
            {playbackSpeed}x
          </Button>
        </div>

        <div className="grid grid-cols-3 gap-4 pt-2 border-t text-sm">
          <div>
            <div className="text-muted-foreground">{t('tracking.playback.zone')}</div>
            <div className="font-medium">{currentPosition.position.zone}</div>
          </div>
          <div>
            <div className="text-muted-foreground">{t('tracking.playback.speed')}</div>
            <div className="font-medium">
              {currentPosition.position.speed?.toFixed(2) || '0.00'} m/s
            </div>
          </div>
          <div>
            <div className="text-muted-foreground">{t('tracking.playback.accuracy')}</div>
            <div className="font-medium">
              ±{currentPosition.position.accuracy?.toFixed(1) || '0.0'}m
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};
