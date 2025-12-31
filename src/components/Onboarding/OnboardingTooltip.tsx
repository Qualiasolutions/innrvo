import React, { useMemo, useRef, useEffect, useState } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import type { OnboardingStep } from './steps';

/**
 * Positioned tooltip with arrow and navigation
 * Automatically positions based on available viewport space
 */

interface SpotlightRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface OnboardingTooltipProps {
  step: OnboardingStep;
  spotlightRect: SpotlightRect | null;
  currentIndex: number;
  totalSteps: number;
  onNext: () => void;
  onPrev: () => void;
  onSkip: () => void;
  isCenteredModal?: boolean;
}

type ArrowDirection = 'top' | 'bottom' | 'left' | 'right';

// Check for reduced motion preference
const prefersReducedMotion = typeof window !== 'undefined'
  ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
  : false;

const tooltipVariants = prefersReducedMotion
  ? { hidden: { opacity: 0 }, visible: { opacity: 1 }, exit: { opacity: 0 } }
  : {
      hidden: { opacity: 0, y: 10, scale: 0.95 },
      visible: {
        opacity: 1,
        y: 0,
        scale: 1,
        transition: { delay: 0.15, duration: 0.3, ease: 'easeOut' }
      },
      exit: {
        opacity: 0,
        scale: 0.95,
        transition: { duration: 0.15 }
      }
    };

const arrowPulseVariants = prefersReducedMotion
  ? {}
  : {
      animate: {
        y: [0, -4, 0],
        transition: { repeat: Infinity, repeatDelay: 2, duration: 0.6, ease: 'easeInOut' }
      }
    };

// Arrow component
const Arrow: React.FC<{ direction: ArrowDirection }> = ({ direction }) => {
  const rotations: Record<ArrowDirection, string> = {
    top: 'rotate-0',
    bottom: 'rotate-180',
    left: '-rotate-90',
    right: 'rotate-90',
  };

  return (
    <m.div
      className={`absolute ${rotations[direction]}`}
      variants={arrowPulseVariants}
      animate="animate"
      style={{
        ...getArrowPosition(direction),
      }}
    >
      <svg width="16" height="8" viewBox="0 0 16 8" fill="none">
        <path
          d="M8 0L16 8H0L8 0Z"
          fill="rgba(30, 41, 59, 0.95)"
          stroke="rgba(6, 182, 212, 0.3)"
          strokeWidth="1"
        />
      </svg>
    </m.div>
  );
};

function getArrowPosition(direction: ArrowDirection): React.CSSProperties {
  switch (direction) {
    case 'top':
      return { bottom: '100%', left: '50%', transform: 'translateX(-50%) rotate(180deg)', marginBottom: -1 };
    case 'bottom':
      return { top: '100%', left: '50%', transform: 'translateX(-50%)', marginTop: -1 };
    case 'left':
      return { right: '100%', top: '50%', transform: 'translateY(-50%) rotate(90deg)', marginRight: -1 };
    case 'right':
      return { left: '100%', top: '50%', transform: 'translateY(-50%) rotate(-90deg)', marginLeft: -1 };
  }
}

export const OnboardingTooltip: React.FC<OnboardingTooltipProps> = ({
  step,
  spotlightRect,
  currentIndex,
  totalSteps,
  onNext,
  onPrev,
  onSkip,
  isCenteredModal = false,
}) => {
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [tooltipSize, setTooltipSize] = useState({ width: 320, height: 200 });
  const [isMobile, setIsMobile] = useState(false);

  // Detect mobile
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Measure tooltip size after render
  useEffect(() => {
    if (tooltipRef.current) {
      const rect = tooltipRef.current.getBoundingClientRect();
      setTooltipSize({ width: rect.width, height: rect.height });
    }
  }, [step.id]);

  // Calculate position and arrow direction
  const { position, arrowDirection } = useMemo(() => {
    if (isCenteredModal || !spotlightRect) {
      return { position: { x: 0, y: 0 }, arrowDirection: 'bottom' as ArrowDirection };
    }

    const viewport = {
      width: typeof window !== 'undefined' ? window.innerWidth : 1920,
      height: typeof window !== 'undefined' ? window.innerHeight : 1080,
    };

    const padding = 16;
    const arrowSize = 12;
    const tooltipWidth = isMobile ? Math.min(viewport.width - 32, 340) : 340;
    const tooltipHeight = tooltipSize.height;

    // Calculate space in each direction
    const spaceAbove = spotlightRect.y - padding;
    const spaceBelow = viewport.height - spotlightRect.y - spotlightRect.height - padding;
    const spaceLeft = spotlightRect.x - padding;
    const spaceRight = viewport.width - spotlightRect.x - spotlightRect.width - padding;

    // Determine best position (prefer bottom on mobile)
    let direction: ArrowDirection = 'top';
    let x = 0;
    let y = 0;

    if (isMobile) {
      // Mobile: prefer bottom, then top
      if (spaceBelow >= tooltipHeight + arrowSize) {
        direction = 'top';
        x = Math.max(padding, Math.min(
          spotlightRect.x + spotlightRect.width / 2 - tooltipWidth / 2,
          viewport.width - tooltipWidth - padding
        ));
        y = spotlightRect.y + spotlightRect.height + arrowSize + 8;
      } else {
        direction = 'bottom';
        x = Math.max(padding, Math.min(
          spotlightRect.x + spotlightRect.width / 2 - tooltipWidth / 2,
          viewport.width - tooltipWidth - padding
        ));
        y = spotlightRect.y - tooltipHeight - arrowSize - 8;
      }
      // Clamp y to viewport for mobile
      y = Math.max(padding, Math.min(y, viewport.height - tooltipHeight - padding));
    } else {
      // Desktop: respect step preference or calculate optimal
      const preferred = step.position;

      if (preferred === 'bottom' && spaceBelow >= tooltipHeight + arrowSize) {
        direction = 'top';
        x = spotlightRect.x + spotlightRect.width / 2 - tooltipWidth / 2;
        y = spotlightRect.y + spotlightRect.height + arrowSize + 8;
      } else if (preferred === 'top' && spaceAbove >= tooltipHeight + arrowSize) {
        direction = 'bottom';
        x = spotlightRect.x + spotlightRect.width / 2 - tooltipWidth / 2;
        y = spotlightRect.y - tooltipHeight - arrowSize - 8;
      } else if (preferred === 'right' && spaceRight >= tooltipWidth + arrowSize) {
        direction = 'left';
        x = spotlightRect.x + spotlightRect.width + arrowSize + 8;
        y = spotlightRect.y + spotlightRect.height / 2 - tooltipHeight / 2;
      } else if (preferred === 'left' && spaceLeft >= tooltipWidth + arrowSize) {
        direction = 'right';
        x = spotlightRect.x - tooltipWidth - arrowSize - 8;
        y = spotlightRect.y + spotlightRect.height / 2 - tooltipHeight / 2;
      } else {
        // Auto: choose direction with most space
        if (spaceBelow >= tooltipHeight + arrowSize) {
          direction = 'top';
          x = spotlightRect.x + spotlightRect.width / 2 - tooltipWidth / 2;
          y = spotlightRect.y + spotlightRect.height + arrowSize + 8;
        } else if (spaceAbove >= tooltipHeight + arrowSize) {
          direction = 'bottom';
          x = spotlightRect.x + spotlightRect.width / 2 - tooltipWidth / 2;
          y = spotlightRect.y - tooltipHeight - arrowSize - 8;
        } else if (spaceRight >= tooltipWidth) {
          direction = 'left';
          x = spotlightRect.x + spotlightRect.width + arrowSize + 8;
          y = spotlightRect.y + spotlightRect.height / 2 - tooltipHeight / 2;
        } else {
          direction = 'right';
          x = spotlightRect.x - tooltipWidth - arrowSize - 8;
          y = spotlightRect.y + spotlightRect.height / 2 - tooltipHeight / 2;
        }
      }

      // Clamp to viewport
      x = Math.max(padding, Math.min(x, viewport.width - tooltipWidth - padding));
      y = Math.max(padding, Math.min(y, viewport.height - tooltipHeight - padding));
    }

    return { position: { x, y }, arrowDirection: direction };
  }, [spotlightRect, step.position, tooltipSize, isMobile, isCenteredModal]);

  const isFirstStep = currentIndex === 0;
  const isLastStep = currentIndex === totalSteps - 1;

  // Centered modal for welcome/complete steps
  if (isCenteredModal) {
    return (
      <AnimatePresence>
        <m.div
          className="fixed inset-0 z-[88] flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <m.div
            ref={tooltipRef}
            className="onboarding-tooltip relative bg-slate-800/95 backdrop-blur-xl rounded-2xl p-6 md:p-8 max-w-sm w-full border border-cyan-500/20 shadow-2xl shadow-cyan-500/10"
            variants={tooltipVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            role="dialog"
            aria-modal="true"
            aria-label={step.title}
            style={{ contain: 'layout paint' }}
          >
            {/* Close button */}
            <button
              onClick={onSkip}
              className="absolute top-4 right-4 p-2 rounded-lg text-white/40 hover:text-white/70 hover:bg-white/10 transition-colors"
              aria-label="Skip tour"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Content */}
            <div className="text-center">
              <h2 className="text-xl md:text-2xl font-bold text-white mb-3">{step.title}</h2>
              <p className="text-white/70 text-sm md:text-base leading-relaxed mb-6">
                {step.description}
              </p>
            </div>

            {/* Navigation */}
            <div className="flex items-center justify-between gap-3">
              {isFirstStep ? (
                <button
                  onClick={onSkip}
                  className="px-4 py-2.5 text-sm text-white/50 hover:text-white transition-colors"
                >
                  Skip
                </button>
              ) : (
                <button
                  onClick={onPrev}
                  className="flex items-center gap-1 px-4 py-2.5 text-sm text-white/70 hover:text-white transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Back
                </button>
              )}

              <span className="text-xs text-white/40">
                {currentIndex + 1} / {totalSteps}
              </span>

              <button
                onClick={onNext}
                className="flex items-center gap-1 px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-cyan-600 text-white font-medium text-sm hover:from-cyan-400 hover:to-cyan-500 active:scale-[0.98] transition-all shadow-lg shadow-cyan-500/20"
              >
                {isLastStep ? 'Get Started' : 'Next'}
                {!isLastStep && <ChevronRight className="w-4 h-4" />}
              </button>
            </div>
          </m.div>
        </m.div>
      </AnimatePresence>
    );
  }

  // Positioned tooltip
  return (
    <AnimatePresence>
      <m.div
        ref={tooltipRef}
        className="onboarding-tooltip fixed z-[88] bg-slate-800/95 backdrop-blur-xl rounded-2xl p-5 border border-cyan-500/20 shadow-2xl shadow-cyan-500/10"
        variants={tooltipVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        role="dialog"
        aria-modal="true"
        aria-label={step.title}
        style={{
          left: position.x,
          top: position.y,
          width: isMobile ? 'calc(100vw - 32px)' : 340,
          maxWidth: isMobile ? 'calc(100vw - 32px)' : 360,
          contain: 'layout paint',
        }}
      >
        {/* Arrow */}
        <Arrow direction={arrowDirection} />

        {/* Close button */}
        <button
          onClick={onSkip}
          className="absolute top-3 right-3 p-1.5 rounded-lg text-white/40 hover:text-white/70 hover:bg-white/10 transition-colors"
          aria-label="Skip tour"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Content */}
        <div className="pr-6">
          <h3 className="text-lg font-semibold text-white mb-2">{step.title}</h3>
          <p className="text-white/70 text-sm leading-relaxed mb-4">{step.description}</p>
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            {!isFirstStep && (
              <button
                onClick={onPrev}
                className="flex items-center gap-1 px-3 py-2 text-sm text-white/70 hover:text-white transition-colors touch-target"
              >
                <ChevronLeft className="w-4 h-4" />
                Back
              </button>
            )}
          </div>

          <span className="text-xs text-white/40">
            {currentIndex + 1} / {totalSteps}
          </span>

          <button
            onClick={onNext}
            className="flex items-center gap-1 px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-cyan-600 text-white font-medium text-sm hover:from-cyan-400 hover:to-cyan-500 active:scale-[0.98] transition-all shadow-lg shadow-cyan-500/20 touch-target"
          >
            {isLastStep ? 'Done' : 'Next'}
            {!isLastStep && <ChevronRight className="w-4 h-4" />}
          </button>
        </div>
      </m.div>
    </AnimatePresence>
  );
};

export default OnboardingTooltip;
