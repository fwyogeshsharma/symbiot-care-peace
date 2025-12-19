import { useEffect, useState } from 'react';

interface SantaAnimationProps {
  isActive: boolean;
  onComplete: () => void;
}

export const SantaAnimation = ({ isActive, onComplete }: SantaAnimationProps) => {
  const [gifts, setGifts] = useState<Array<{ id: number; x: number; y: number }>>([]);

  useEffect(() => {
    if (isActive) {
      // Animation completes after 8 seconds
      const timer = setTimeout(() => {
        onComplete();
        setGifts([]);
      }, 8000);

      // Drop gifts during the flight
      const giftInterval = setInterval(() => {
        const newGift = {
          id: Date.now(),
          x: Math.random() * window.innerWidth,
          y: -50
        };
        setGifts(prev => [...prev, newGift]);
      }, 800);

      return () => {
        clearTimeout(timer);
        clearInterval(giftInterval);
      };
    }
  }, [isActive, onComplete]);

  if (!isActive) return null;

  return (
    <div className="fixed inset-0 z-[102] pointer-events-none overflow-hidden">
      {/* Santa with Sleigh */}
      <div className="santa-sleigh-container">
        <div className="relative">
          {/* Sleigh Trail Stars */}
          <div className="absolute -left-20 top-1/2 transform -translate-y-1/2 animate-trail">
            ⭐✨⭐✨⭐
          </div>

          {/* Reindeer */}
          <div className="inline-block text-6xl animate-bounce-subtle mr-2">
            🦌
          </div>

          {/* Sleigh */}
          <div className="inline-block text-5xl">
            🛷
          </div>

          {/* Santa */}
          <div className="inline-block text-6xl animate-wave ml-2">
            🎅
          </div>

          {/* Gift Bag */}
          <div className="inline-block text-4xl ml-2 animate-swing">
            🎁
          </div>
        </div>
      </div>

      {/* Falling Gifts */}
      {gifts.map(gift => (
        <div
          key={gift.id}
          className="absolute text-4xl animate-gift-fall"
          style={{
            left: `${gift.x}px`,
            top: `${gift.y}px`,
          }}
        >
          🎁
        </div>
      ))}

      {/* Ho Ho Ho text */}
      <div className="absolute top-1/3 left-1/2 transform -translate-x-1/2 text-6xl font-bold text-red-600 animate-ho-ho-ho pointer-events-none"
           style={{
             textShadow: '2px 2px 4px white, -2px -2px 4px white',
             animationDelay: '1s'
           }}>
        Ho Ho Ho! 🎄
      </div>

      {/* Sparkles around Santa's path */}
      <div className="santa-sparkles">
        <div className="sparkle" style={{ animationDelay: '0s' }}>✨</div>
        <div className="sparkle" style={{ animationDelay: '0.5s' }}>⭐</div>
        <div className="sparkle" style={{ animationDelay: '1s' }}>✨</div>
        <div className="sparkle" style={{ animationDelay: '1.5s' }}>⭐</div>
        <div className="sparkle" style={{ animationDelay: '2s' }}>✨</div>
        <div className="sparkle" style={{ animationDelay: '2.5s' }}>⭐</div>
      </div>
    </div>
  );
};
