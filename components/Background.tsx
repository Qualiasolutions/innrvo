import React from 'react';

/**
 * Optimized background component with:
 * - WebP format with JPEG fallback for ~20% smaller file sizes
 * - Lazy loading to defer image fetching until visible
 * - Explicit dimensions to prevent CLS (Cumulative Layout Shift)
 * - fetchpriority="low" to prioritize critical content first
 */
const Background: React.FC = () => {
  return (
    <>
      <div className="bg-image-container">
        {/* Desktop background - WebP with JPEG fallback */}
        <picture className="bg-image bg-image-desktop">
          <source srcSet="/desktop--background.webp" type="image/webp" />
          <img
            src="/desktop--background.jpeg"
            alt=""
            loading="lazy"
            decoding="async"
            fetchPriority="low"
            width={1920}
            height={1080}
          />
        </picture>
        {/* Mobile background - WebP with JPEG fallback */}
        <picture className="bg-image bg-image-mobile">
          <source srcSet="/mobile-background.webp" type="image/webp" />
          <img
            src="/mobile-background.jpeg"
            alt=""
            loading="lazy"
            decoding="async"
            fetchPriority="low"
            width={750}
            height={1334}
          />
        </picture>
      </div>
    </>
  );
};

export default React.memo(Background);
