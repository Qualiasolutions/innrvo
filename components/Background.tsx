import React from 'react';

/**
 * Optimized background component with:
 * - Lazy loading to defer image fetching until visible
 * - Explicit dimensions to prevent CLS (Cumulative Layout Shift)
 * - fetchpriority="low" to prioritize critical content first
 */
const Background: React.FC = () => {
  return (
    <>
      <div className="bg-image-container">
        <img
          src="/desktop--background.jpeg"
          alt=""
          className="bg-image bg-image-desktop"
          loading="lazy"
          decoding="async"
          fetchPriority="low"
          width={1920}
          height={1080}
        />
        <img
          src="/mobile-background.jpeg"
          alt=""
          className="bg-image bg-image-mobile"
          loading="lazy"
          decoding="async"
          fetchPriority="low"
          width={750}
          height={1334}
        />
      </div>
    </>
  );
};

export default React.memo(Background);
