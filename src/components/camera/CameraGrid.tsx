import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Video,
  VideoOff,
  Maximize2,
  Minimize2,
  RefreshCw,
  Wifi,
  WifiOff,
  Play,
  Pause,
  Grid2X2,
  LayoutGrid
} from 'lucide-react';

// Public webcam sources using YouTube embeds
const PUBLIC_CAMERAS = [
  {
    id: 'times-square',
    name: "Times Square, NYC",
    location: "New York, USA",
    embedUrl: "https://www.youtube.com/embed/rnXIjl_Rzy4?autoplay=1&mute=1",
  },
  {
    id: 'jackson-hole',
    name: "Jackson Hole",
    location: "Wyoming, USA",
    embedUrl: "https://www.youtube.com/embed/psfFJR3vZ78?autoplay=1&mute=1",
  },
  {
    id: 'dublin',
    name: "Dublin Airport",
    location: "Ireland",
    embedUrl: "https://www.youtube.com/embed/qZkK5TOwsok?autoplay=1&mute=1",
  },
  {
    id: 'venice',
    name: "Canal Grande",
    location: "Venice, Italy",
    embedUrl: "https://www.youtube.com/embed/HQBcV1V3cF0?autoplay=1&mute=1",
  },
];

interface CameraCardProps {
  camera: typeof PUBLIC_CAMERAS[0];
  isConnected: boolean;
  isLoading: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
  onRefresh: () => void;
  onFullscreen: () => void;
  isFullscreen: boolean;
}

const CameraCard = ({
  camera,
  isConnected,
  isLoading,
  onConnect,
  onDisconnect,
  onRefresh,
  onFullscreen,
  isFullscreen
}: CameraCardProps) => {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    if (isConnected) {
      const interval = setInterval(() => {
        setCurrentTime(new Date());
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [isConnected]);

  return (
    <Card className="overflow-hidden h-full flex flex-col">
      <CardHeader className="py-2 px-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <Video className="w-4 h-4 text-primary flex-shrink-0" />
            <div className="min-w-0">
              <CardTitle className="text-sm truncate">{camera.name}</CardTitle>
              <p className="text-xs text-muted-foreground truncate">{camera.location}</p>
            </div>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            {isConnected ? (
              <Badge variant="outline" className="border-success text-success text-xs px-1.5 py-0">
                <Wifi className="w-3 h-3 mr-1" />
                Live
              </Badge>
            ) : (
              <Badge variant="outline" className="border-muted-foreground text-muted-foreground text-xs px-1.5 py-0">
                <WifiOff className="w-3 h-3 mr-1" />
                Off
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0 flex-1">
        <div className="relative bg-black aspect-video w-full overflow-hidden">
          {!isConnected ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-white bg-muted/90">
              <VideoOff className="w-8 h-8 mb-2 text-muted-foreground" />
              <p className="text-muted-foreground mb-2 text-xs">Not connected</p>
              <Button size="sm" onClick={onConnect} disabled={isLoading}>
                <Play className="w-3 h-3 mr-1" />
                {isLoading ? 'Connecting...' : 'Connect'}
              </Button>
            </div>
          ) : isLoading ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black z-10">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white mb-2"></div>
              <p className="text-white text-xs">Loading...</p>
            </div>
          ) : (
            <>
              <iframe
                src={camera.embedUrl}
                className="w-full h-full border-0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
              {/* Overlay with timestamp */}
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent px-2 py-1 pointer-events-none">
                <div className="flex items-center justify-between">
                  <p className="text-white/70 text-[10px] font-mono">
                    {currentTime.toLocaleTimeString()}
                  </p>
                  <span className="text-green-400 text-[10px] font-mono flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                    LIVE
                  </span>
                </div>
              </div>
            </>
          )}
        </div>

        {isConnected && (
          <div className="p-1.5 border-t flex items-center justify-end gap-1">
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onRefresh} disabled={isLoading}>
              <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onFullscreen}>
              {isFullscreen ? <Minimize2 className="w-3 h-3" /> : <Maximize2 className="w-3 h-3" />}
            </Button>
            <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={onDisconnect}>
              <Pause className="w-3 h-3 mr-1" />
              Stop
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

interface CameraGridProps {
  title?: string;
}

const CameraGrid = ({ title = "Security Cameras" }: CameraGridProps) => {
  const [cameraStates, setCameraStates] = useState<Record<string, { isConnected: boolean; isLoading: boolean }>>(() => {
    const initial: Record<string, { isConnected: boolean; isLoading: boolean }> = {};
    PUBLIC_CAMERAS.forEach(cam => {
      initial[cam.id] = { isConnected: false, isLoading: false };
    });
    return initial;
  });
  const [fullscreenCamera, setFullscreenCamera] = useState<string | null>(null);
  const [allConnected, setAllConnected] = useState(false);
  const gridRef = useRef<HTMLDivElement>(null);

  const handleConnect = (cameraId: string) => {
    setCameraStates(prev => ({
      ...prev,
      [cameraId]: { ...prev[cameraId], isLoading: true }
    }));

    setTimeout(() => {
      setCameraStates(prev => ({
        ...prev,
        [cameraId]: { isConnected: true, isLoading: false }
      }));
    }, 1500);
  };

  const handleDisconnect = (cameraId: string) => {
    setCameraStates(prev => ({
      ...prev,
      [cameraId]: { isConnected: false, isLoading: false }
    }));
  };

  const handleRefresh = (cameraId: string) => {
    setCameraStates(prev => ({
      ...prev,
      [cameraId]: { ...prev[cameraId], isLoading: true }
    }));

    setTimeout(() => {
      setCameraStates(prev => ({
        ...prev,
        [cameraId]: { ...prev[cameraId], isLoading: false }
      }));
    }, 1000);
  };

  const handleFullscreen = (cameraId: string) => {
    setFullscreenCamera(fullscreenCamera === cameraId ? null : cameraId);
  };

  const handleConnectAll = () => {
    PUBLIC_CAMERAS.forEach(cam => {
      setCameraStates(prev => ({
        ...prev,
        [cam.id]: { ...prev[cam.id], isLoading: true }
      }));
    });

    setTimeout(() => {
      setCameraStates(prev => {
        const newState = { ...prev };
        PUBLIC_CAMERAS.forEach(cam => {
          newState[cam.id] = { isConnected: true, isLoading: false };
        });
        return newState;
      });
      setAllConnected(true);
    }, 2000);
  };

  const handleDisconnectAll = () => {
    PUBLIC_CAMERAS.forEach(cam => {
      setCameraStates(prev => ({
        ...prev,
        [cam.id]: { isConnected: false, isLoading: false }
      }));
    });
    setAllConnected(false);
  };

  const connectedCount = Object.values(cameraStates).filter(s => s.isConnected).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Grid2X2 className="w-5 h-5 text-primary" />
            <h2 className="text-xl font-semibold">{title}</h2>
          </div>
          <Badge variant="secondary">
            {connectedCount}/{PUBLIC_CAMERAS.length} Active
          </Badge>
        </div>

        <div className="flex items-center gap-2">
          {!allConnected ? (
            <Button onClick={handleConnectAll} size="sm">
              <Play className="w-4 h-4 mr-2" />
              Connect All
            </Button>
          ) : (
            <Button onClick={handleDisconnectAll} variant="outline" size="sm">
              <Pause className="w-4 h-4 mr-2" />
              Disconnect All
            </Button>
          )}
        </div>
      </div>

      {fullscreenCamera ? (
        // Single camera fullscreen view
        <div ref={gridRef} className="w-full">
          {PUBLIC_CAMERAS.filter(cam => cam.id === fullscreenCamera).map(camera => (
            <CameraCard
              key={camera.id}
              camera={camera}
              isConnected={cameraStates[camera.id]?.isConnected || false}
              isLoading={cameraStates[camera.id]?.isLoading || false}
              onConnect={() => handleConnect(camera.id)}
              onDisconnect={() => handleDisconnect(camera.id)}
              onRefresh={() => handleRefresh(camera.id)}
              onFullscreen={() => handleFullscreen(camera.id)}
              isFullscreen={true}
            />
          ))}
        </div>
      ) : (
        // 2x2 Grid view
        <div ref={gridRef} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {PUBLIC_CAMERAS.map(camera => (
            <CameraCard
              key={camera.id}
              camera={camera}
              isConnected={cameraStates[camera.id]?.isConnected || false}
              isLoading={cameraStates[camera.id]?.isLoading || false}
              onConnect={() => handleConnect(camera.id)}
              onDisconnect={() => handleDisconnect(camera.id)}
              onRefresh={() => handleRefresh(camera.id)}
              onFullscreen={() => handleFullscreen(camera.id)}
              isFullscreen={false}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default CameraGrid;
