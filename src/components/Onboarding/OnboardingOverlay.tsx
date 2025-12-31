import React, { useMemo } from 'react';
import { m, AnimatePresence } from 'framer-motion';

/**
 * Dark overlay with animated spotlight cutout
 * Uses SVG mask for the spotlight effect
 */

interface SpotlightRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface OnboardingOverlayProps {
  isVisible: boolean;
  spotlightRect: SpotlightRect | null;
  padding?: number;
  onClick?: () => void;
}

// Check for reduced motion preference
const prefersReducedMotion = typeof window !== 'undefined'
  ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
  : false;

const overlayVariants = prefersReducedMotion
  ? { hidden: { opacity: 0 }, visible: { opacity: 1 }, exit: { opacity: 0 } }
  : {
      hidden: { opacity: 0 },
      visible: {
        opacity: 1,
        transition: { duration: 0.3, ease: 'easeOut' }
      },
      exit: {
        opacity: 0,
        transition: { duration: 0.2 }
      }
    };

export const OnboardingOverlay: React.FC<OnboardingOverlayProps> = ({
  isVisible,
  spotlightRect,
  padding = 8,
  onClick,
}) => {
  // Calculate padded spotlight dimensions
  const paddedRect = useMemo(() => {
    if (!spotlightRect) return null;
    return {
      x: spotlightRect.x - padding,
      y: spotlightRect.y - padding,
      width: spotlightRect.width + padding * 2,
      height: spotlightRect.height + padding * 2,
    };
  }, [spotlightRect, padding]);

  return (
    <AnimatePresence>
      {isVisible && (
        <m.div
          className="onboarding-overlay fixed inset-0 z-[85] pointer-events-auto"
          variants={overlayVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          onClick={onClick}
          style={{ contain: 'strict' }}
        >
          <svg
            className="absolute inset-0 w-full h-full"
            style={{ pointerEvents: 'none' }}
          >
            <defs>
              <mask id="onboarding-spotlight-mask">
                {/* White = visible overlay, Black = cutout */}
                <rect fill="white" width="100%" height="100%" />
                {paddedRect && (
                  <m.rect
                    fill="black"
                    rx="12"
                    initial={prefersReducedMotion ? paddedRect : {
                      x: paddedRect.x,
                      y: paddedRect.y,
                      width: paddedRect.width,
                      height: paddedRect.height,
                      opacity: 0,
                    }}
                    animate={{
                      x: paddedRect.x,
                      y: paddedRect.y,
                      width: paddedRect.width,
                      height: paddedRect.height,
                      opacity: 1,
                    }}
                    transition={prefersReducedMotion ? { duration: 0 } : {
                      duration: 0.4,
                      ease: [0.32, 0.72, 0, 1],
                    }}
                  />
                )}
              </mask>
            </defs>

            {/* Dark overlay with mask applied */}
            <rect
              fill="black"
              fillOpacity="0.75"
              width="100%"
              height="100%"
              mask="url(#onboarding-spotlight-mask)"
              style={{ pointerEvents: 'auto' }}
            />
          </svg>

          {/* Spotlight glow effect */}
          {paddedRect && (
            <m.div
              className="absolute pointer-events-none"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.3 }}
              style={{
                left: paddedRect.x - 4,
                top: paddedRect.y - 4,
                width: paddedRect.width + 8,
                height: paddedRect.height + 8,
                borderRadius: 16,
                boxShadow: '0 0 0 2px rgba(6, 182, 212, 0.3), 0 0 20px rgba(6, 182, 212, 0.15)',
              }}
            />
          )}
        </m.div>
      )}
    </AnimatePresence>
  );
};

export default OnboardingOverlay;
