import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Video,
  VideoOff,
  Maximize2,
  Minimize2,
  Settings2,
  RefreshCw,
  Wifi,
  WifiOff,
  Play
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

// Professional webcam sources - iframe embeds that work directly
const PUBLIC_CAMERAS = [
  {
    name: "Times Square, New York",
    url: "https://www.earthcam.com/usa/newyork/timessquare/?cam=tsrobo1",
    embedUrl: "https://www.youtube.com/embed/rnXIjl_Rzy4?autoplay=1&mute=1",
    type: "youtube"
  },
  {
    name: "Abbey Road, London",
    url: "https://www.earthcam.com/world/england/london/abbeyroad/",
    embedUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ?autoplay=1&mute=1",
    type: "youtube"
  },
  {
    name: "Jackson Hole, Wyoming",
    url: "https://www.youtube.com/watch?v=psfFJR3vZ78",
    embedUrl: "https://www.youtube.com/embed/psfFJR3vZ78?autoplay=1&mute=1",
    type: "youtube"
  },
  {
    name: "Dublin, Ireland",
    url: "https://www.skylinewebcams.com/en/webcam/ireland/leinster/dublin/dublin-airport.html",
    embedUrl: "https://www.youtube.com/embed/qZkK5TOwsok?autoplay=1&mute=1",
    type: "youtube"
  },
  {
    name: "Venice, Italy",
    url: "https://www.skylinewebcams.com/en/webcam/italia/veneto/venezia/canal-grande-702.html",
    embedUrl: "https://www.youtube.com/embed/HQBcV1V3cF0?autoplay=1&mute=1",
    type: "youtube"
  }
];

interface CameraStreamProps {
  title?: string;
}

const CameraStream = ({ title = "Live Camera" }: CameraStreamProps) => {
  const [selectedCamera, setSelectedCamera] = useState(PUBLIC_CAMERAS[0]);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const containerRef = useRef<HTMLDivElement>(null);

  // Update time every second
  useEffect(() => {
    if (isConnected) {
      const interval = setInterval(() => {
        setCurrentTime(new Date());
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [isConnected]);

  const handleConnect = () => {
    setIsLoading(true);
    // Simulate connection time
    setTimeout(() => {
      setIsConnected(true);
      setIsLoading(false);
    }, 1500);
  };

  const handleDisconnect = () => {
    setIsConnected(false);
    setIsLoading(false);
  };

  const handleRefresh = () => {
    setIsLoading(true);
    setIsConnected(false);
    setTimeout(() => {
      setIsConnected(true);
      setIsLoading(false);
    }, 1000);
  };

  const handleFullscreen = () => {
    if (!containerRef.current) return;

    if (!isFullscreen) {
      if (containerRef.current.requestFullscreen) {
        containerRef.current.requestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
    setIsFullscreen(!isFullscreen);
  };

  const handleCameraSelect = (cameraName: string) => {
    const camera = PUBLIC_CAMERAS.find(c => c.name === cameraName);
    if (camera) {
      setSelectedCamera(camera);
      if (isConnected) {
        handleRefresh();
      }
    }
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Video className="w-5 h-5 text-primary" />
            <CardTitle className="text-lg">{title}</CardTitle>
            {isConnected ? (
              <Badge variant="outline" className="border-success text-success">
                <Wifi className="w-3 h-3 mr-1" />
                Live
              </Badge>
            ) : (
              <Badge variant="outline" className="border-muted-foreground text-muted-foreground">
                <WifiOff className="w-3 h-3 mr-1" />
                Offline
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1">
            {isConnected && (
              <>
                <Button variant="ghost" size="icon" onClick={handleRefresh} disabled={isLoading}>
                  <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                </Button>
                <Button variant="ghost" size="icon" onClick={handleFullscreen}>
                  {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                </Button>
              </>
            )}
            <Button variant="ghost" size="icon" onClick={() => setShowSettings(true)}>
              <Settings2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <div
          ref={containerRef}
          className="relative bg-black aspect-video w-full overflow-hidden"
        >
          {!isConnected ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-white bg-muted/90">
              <VideoOff className="w-12 h-12 mb-4 text-muted-foreground" />
              <p className="text-muted-foreground mb-2 text-sm">Camera not connected</p>
              <p className="text-muted-foreground mb-4 text-xs text-center px-4">
                {selectedCamera.name}
              </p>
              <Button onClick={handleConnect} disabled={isLoading}>
                <Play className="w-4 h-4 mr-2" />
                {isLoading ? 'Connecting...' : 'Connect to Stream'}
              </Button>
            </div>
          ) : isLoading ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black z-10">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-white mb-4"></div>
              <p className="text-white text-sm">Loading stream...</p>
            </div>
          ) : (
            <>
              <iframe
                src={selectedCamera.embedUrl}
                className="w-full h-full border-0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
              {/* Overlay with timestamp */}
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent px-3 py-2 pointer-events-none">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white text-xs font-medium">{selectedCamera.name}</p>
                    <p className="text-white/70 text-xs font-mono">
                      {currentTime.toLocaleDateString()} {currentTime.toLocaleTimeString()}
                    </p>
                  </div>
                  <span className="text-green-400 text-xs font-mono flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                    LIVE
                  </span>
                </div>
              </div>
            </>
          )}
        </div>

        {isConnected && (
          <div className="p-2 border-t flex items-center justify-between">
            <span className="text-xs text-muted-foreground truncate max-w-[70%]">
              {selectedCamera.name}
            </span>
            <Button variant="ghost" size="sm" onClick={handleDisconnect}>
              Disconnect
            </Button>
          </div>
        )}
      </CardContent>

      {/* Settings Dialog */}
      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Camera Settings</DialogTitle>
            <DialogDescription>
              Select a live camera stream to monitor.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Select Camera</Label>
              <Select value={selectedCamera.name} onValueChange={handleCameraSelect}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a camera" />
                </SelectTrigger>
                <SelectContent>
                  {PUBLIC_CAMERAS.map((camera) => (
                    <SelectItem key={camera.name} value={camera.name}>
                      {camera.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="bg-muted p-3 rounded-md">
              <p className="text-sm font-medium mb-2">Available Cameras:</p>
              <ul className="text-xs text-muted-foreground space-y-1">
                {PUBLIC_CAMERAS.map((camera) => (
                  <li key={camera.name}>• {camera.name}</li>
                ))}
              </ul>
            </div>

            <Button className="w-full" onClick={() => setShowSettings(false)}>
              Done
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default CameraStream;
