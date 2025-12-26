import React, { useMemo } from 'react';

interface ChronosEngineProps {
  /** Size variant - 'avatar' for profile icon, 'loading' for full loading state, 'mini' for inline */
  variant?: 'avatar' | 'loading' | 'mini';
  /** Custom size in pixels (overrides variant size) */
  size?: number;
  /** Additional CSS classes */
  className?: string;
  /** Whether to show spark particles */
  showSparks?: boolean;
}

// Generate a random number within a range
const random = (min: number, max: number) => Math.random() * (max - min) + min;

// Memoized spark generator to prevent recalculation on every render
const generateSparks = (count: number, radius: number) => {
  return [...Array(count)].map((_, i) => {
    const angle = random(0, Math.PI * 2);
    const spawnX = Math.cos(angle) * radius;
    const spawnY = Math.sin(angle) * radius;
    // Tangential travel direction
    const travelX = spawnX + (-spawnY * random(0.5, 1.5));
    const travelY = spawnY + (spawnX * random(0.5, 1.5));
    const duration = random(2, 5);
    const delay = random(0, 5);

    return { spawnX, spawnY, travelX, travelY, duration, delay, key: i };
  });
};

/**
 * ChronosEngine - Animated gear/engine component
 * Used as agent profile avatar and loading indicator
 */
export const ChronosEngine: React.FC<ChronosEngineProps> = ({
  variant = 'avatar',
  size,
  className = '',
  showSparks = true,
}) => {
  // Size configurations based on variant
  const sizeConfig = useMemo(() => {
    switch (variant) {
      case 'avatar':
        return { container: size || 32, gear1: 20, gear2: 12, gear3: 14, core: 6 };
      case 'mini':
        return { container: size || 24, gear1: 14, gear2: 8, gear3: 10, core: 4 };
      case 'loading':
      default:
        return { container: size || 120, gear1: 80, gear2: 50, gear3: 60, core: 20 };
    }
  }, [variant, size]);

  // Generate sparks only for loading variant
  const gear1Sparks = useMemo(() =>
    variant === 'loading' && showSparks ? generateSparks(15, sizeConfig.gear1 / 2) : [],
    [variant, showSparks, sizeConfig.gear1]
  );

  const gear3Sparks = useMemo(() =>
    variant === 'loading' && showSparks ? generateSparks(10, sizeConfig.gear3 / 2) : [],
    [variant, showSparks, sizeConfig.gear3]
  );

  const containerStyle: React.CSSProperties = {
    width: sizeConfig.container,
    height: sizeConfig.container,
  };

  return (
    <div
      className={`chronos-engine relative ${className}`}
      style={containerStyle}
    >
      {/* Power Core - Central glowing element */}
      <div
        className="power-core absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full z-10"
        style={{
          width: sizeConfig.core,
          height: sizeConfig.core,
        }}
      />

      {/* Gear 1 - Largest, rotates clockwise */}
      <div
        className="gear gear-1 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
        style={{
          width: sizeConfig.gear1,
          height: sizeConfig.gear1,
        }}
      >
        {variant === 'loading' && showSparks && (
          <div className="spark-emitter absolute inset-0">
            {gear1Sparks.map((spark) => (
              <div
                key={spark.key}
                className="spark"
                style={{
                  '--spawn-x': spark.spawnX,
                  '--spawn-y': spark.spawnY,
                  '--travel-x': spark.travelX,
                  '--travel-y': spark.travelY,
                  animationDuration: `${spark.duration}s`,
                  animationDelay: `${spark.delay}s`,
                } as React.CSSProperties}
              />
            ))}
          </div>
        )}
      </div>

      {/* Gear 2 - Medium, rotates counter-clockwise */}
      <div
        className="gear gear-2 absolute"
        style={{
          width: sizeConfig.gear2,
          height: sizeConfig.gear2,
          top: '15%',
          right: '10%',
        }}
      />

      {/* Gear 3 - Small, rotates clockwise (faster) */}
      <div
        className="gear gear-3 absolute"
        style={{
          width: sizeConfig.gear3,
          height: sizeConfig.gear3,
          bottom: '15%',
          left: '5%',
        }}
      >
        {variant === 'loading' && showSparks && (
          <div className="spark-emitter absolute inset-0">
            {gear3Sparks.map((spark) => (
              <div
                key={spark.key}
                className="spark"
                style={{
                  '--spawn-x': spark.spawnX,
                  '--spawn-y': spark.spawnY,
                  '--travel-x': spark.travelX,
                  '--travel-y': spark.travelY,
                  animationDuration: `${spark.duration}s`,
                  animationDelay: `${spark.delay}s`,
                } as React.CSSProperties}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * ChronosAvatar - Simplified avatar version with gradient background
 * Drop-in replacement for SparkleIcon in agent profile
 */
export const ChronosAvatar: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`relative overflow-hidden rounded-full bg-gradient-to-br from-cyan-500 to-purple-600
                   flex items-center justify-center shadow-lg shadow-cyan-500/30 ${className}`}
       style={{ width: 32, height: 32 }}>
    <ChronosEngine variant="avatar" showSparks={false} />
  </div>
);

/**
 * ChronosLoader - Full loading state with message
 */
export const ChronosLoader: React.FC<{
  message?: string;
  className?: string;
}> = ({
  message = 'Processing...',
  className = ''
}) => (
  <div className={`flex flex-col items-center gap-4 ${className}`}>
    <ChronosEngine variant="loading" />
    {message && (
      <span className="text-white/60 text-sm animate-pulse">{message}</span>
    )}
  </div>
);

/**
 * ChronosMiniLoader - Inline loading indicator
 */
export const ChronosMiniLoader: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`flex items-center gap-2 ${className}`}>
    <ChronosEngine variant="mini" showSparks={false} />
    <span className="text-white/40 text-sm">Thinking...</span>
  </div>
);

export default ChronosEngine;
