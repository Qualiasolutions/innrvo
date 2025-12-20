import React, { useRef, useEffect, useMemo } from 'react';

interface ScriptReaderProps {
  script: string;
  currentWordIndex: number;
  isPlaying: boolean;
}

const ScriptReader: React.FC<ScriptReaderProps> = ({
  script,
  currentWordIndex,
  isPlaying,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const currentWordRef = useRef<HTMLSpanElement>(null);

  // Parse script into paragraphs
  const paragraphs = useMemo(() => {
    return script.split(/\n\n+/).filter(p => p.trim());
  }, [script]);

  // Auto-scroll to keep current word in view
  useEffect(() => {
    if (currentWordRef.current && isPlaying) {
      currentWordRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  }, [currentWordIndex, isPlaying]);

  // Track global word index across paragraphs
  let globalWordIndex = 0;

  // Check if a token is an audio tag
  const isAudioTag = (token: string): boolean => {
    return /^\[.+\]$/.test(token.trim());
  };

  return (
    <div
      ref={containerRef}
      className="flex-1 overflow-y-auto px-4 md:px-8 py-6 md:py-10 relative script-reader"
    >
      {/* Top gradient mask */}
      <div className="fixed top-[60px] md:top-[80px] left-0 right-0 h-16 bg-gradient-to-b from-[#020617] via-[#020617]/80 to-transparent pointer-events-none z-10" />

      {/* Script content */}
      <div className="max-w-3xl mx-auto space-y-6 md:space-y-8 pb-[calc(180px+env(safe-area-inset-bottom,0px))] md:pb-[calc(200px+env(safe-area-inset-bottom,0px))] pt-8">
        {paragraphs.map((paragraph, pIndex) => {
          // Split into tokens (words and audio tags)
          const tokens = paragraph.split(/(\s+|\[.+?\])/).filter(t => t.trim());

          return (
            <p
              key={pIndex}
              className="text-lg md:text-xl lg:text-2xl leading-relaxed md:leading-relaxed font-serif font-light text-center md:text-left"
            >
              {tokens.map((token, tIndex) => {
                // Handle audio tags specially
                if (isAudioTag(token)) {
                  return (
                    <span
                      key={`${pIndex}-${tIndex}`}
                      className="inline-block px-2 py-0.5 mx-1 text-xs md:text-sm rounded-full bg-indigo-500/10 text-indigo-400/70 font-sans font-medium"
                    >
                      {token}
                    </span>
                  );
                }

                // Regular word
                const thisWordIndex = globalWordIndex++;
                const isPast = thisWordIndex < currentWordIndex;
                const isCurrent = thisWordIndex === currentWordIndex;
                const isFuture = thisWordIndex > currentWordIndex;

                return (
                  <span
                    key={`${pIndex}-${tIndex}`}
                    ref={isCurrent ? currentWordRef : null}
                    className={`
                      transition-all duration-150 inline
                      ${isPast ? 'text-white/90' : ''}
                      ${isCurrent ? 'text-indigo-400 font-medium' : ''}
                      ${isFuture ? 'text-white/40' : ''}
                    `}
                    style={isCurrent ? {
                      textShadow: '0 0 20px rgba(129, 140, 248, 0.4)'
                    } : undefined}
                  >
                    {token}{' '}
                  </span>
                );
              })}
            </p>
          );
        })}
      </div>

      {/* Bottom gradient mask (above player) - accounts for safe-area-inset */}
      <div className="fixed bottom-[calc(140px+env(safe-area-inset-bottom,0px))] md:bottom-[calc(160px+env(safe-area-inset-bottom,0px))] left-0 right-0 h-20 bg-gradient-to-t from-[#020617] via-[#020617]/80 to-transparent pointer-events-none z-10" />
    </div>
  );
};

export default ScriptReader;
