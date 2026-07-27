import { useEffect, useState } from 'react';
import { X } from 'lucide-react';

interface ChristmasLightsProps {
  isActive: boolean;
  onClose: () => void;
}

export const ChristmasLights = ({ isActive, onClose }: ChristmasLightsProps) => {
  const [lights, setLights] = useState<Array<{ id: number; left: string; top: string; delay: number; color: string }>>([]);

  useEffect(() => {
    if (isActive) {
      // Generate random lights across the viewport
      const generatedLights = Array.from({ length: 50 }, (_, i) => ({
        id: i,
        left: `${Math.random() * 100}%`,
        top: `${Math.random() * 100}%`,
        delay: Math.random() * 2,
        color: ['#ff0000', '#00ff00', '#ffff00', '#0000ff', '#ff00ff', '#00ffff', '#ffa500'][Math.floor(Math.random() * 7)]
      }));
      setLights(generatedLights);
    }
  }, [isActive]);

  if (!isActive) return null;

  return (
    <div className="fixed inset-0 z-[100] pointer-events-none">
      {/* Close button */}
      <button
        onClick={onClose}
        className="fixed top-4 right-4 z-[101] pointer-events-auto bg-white/90 hover:bg-white rounded-full p-2 shadow-lg transition-all duration-300"
        aria-label="Close Christmas Lights"
      >
        <X className="w-6 h-6 text-gray-800" />
      </button>

      {/* Christmas lights */}
      {lights.map((light) => (
        <div
          key={light.id}
          className="absolute w-3 h-3 rounded-full animate-christmas-twinkle"
          style={{
            left: light.left,
            top: light.top,
            backgroundColor: light.color,
            boxShadow: `0 0 10px ${light.color}, 0 0 20px ${light.color}`,
            animationDelay: `${light.delay}s`
          }}
        >
          {/* Light glow effect */}
          <div
            className="absolute inset-0 rounded-full blur-sm"
            style={{
              backgroundColor: light.color,
              opacity: 0.6,
              transform: 'scale(2)'
            }}
          />
        </div>
      ))}

      {/* Light strings - decorative lines connecting some lights */}
      <svg className="absolute inset-0 w-full h-full" style={{ opacity: 0.3 }}>
        {/* Top border */}
        <line x1="0" y1="20" x2="100%" y2="20" stroke="#ffd700" strokeWidth="2" strokeDasharray="5,5" />
        {/* Left border */}
        <line x1="20" y1="0" x2="20" y2="100%" stroke="#ffd700" strokeWidth="2" strokeDasharray="5,5" />
        {/* Right border */}
        <line x1="calc(100% - 20px)" y1="0" x2="calc(100% - 20px)" y2="100%" stroke="#ffd700" strokeWidth="2" strokeDasharray="5,5" />
        {/* Bottom border */}
        <line x1="0" y1="calc(100% - 20px)" x2="100%" y2="calc(100% - 20px)" stroke="#ffd700" strokeWidth="2" strokeDasharray="5,5" />
      </svg>

      {/* Merry Christmas text */}
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-auto">
        <div className="text-6xl font-bold text-white animate-christmas-pulse" style={{
          textShadow: '0 0 20px #ff0000, 0 0 40px #00ff00, 0 0 60px #0000ff',
          animation: 'christmas-pulse 2s ease-in-out infinite'
        }}>
          🎄 Merry Christmas! 🎄
        </div>
      </div>
    </div>
  );
};
