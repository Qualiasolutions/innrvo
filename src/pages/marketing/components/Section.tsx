import React, { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface SectionProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  defaultExpanded?: boolean;
  collapsible?: boolean;
  className?: string;
}

export function Section({
  title,
  description,
  icon,
  children,
  defaultExpanded = true,
  collapsible = true,
  className = '',
}: SectionProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  return (
    <div className={`bg-slate-800/30 border border-slate-700/50 rounded-xl overflow-hidden ${className}`}>
      {/* Header */}
      <div
        className={`flex items-center gap-3 p-4 ${collapsible ? 'cursor-pointer hover:bg-slate-800/50' : ''} transition-colors`}
        onClick={collapsible ? () => setIsExpanded(!isExpanded) : undefined}
      >
        {icon && (
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-teal-500/20 to-cyan-500/20 flex items-center justify-center text-teal-400">
            {icon}
          </div>
        )}
        <div className="flex-1">
          <h3 className="font-semibold text-white">{title}</h3>
          {description && <p className="text-sm text-slate-400 mt-0.5">{description}</p>}
        </div>
        {collapsible && (
          <button className="p-1 text-slate-400">
            {isExpanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
          </button>
        )}
      </div>

      {/* Content */}
      {collapsible ? (
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <div className="p-4 pt-0 border-t border-slate-700/50 mt-0">
                <div className="pt-4">{children}</div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      ) : (
        <div className="p-4 pt-0 border-t border-slate-700/50">
          <div className="pt-4">{children}</div>
        </div>
      )}
    </div>
  );
}

interface SectionGridProps {
  children: React.ReactNode;
  columns?: 1 | 2 | 3;
}

export function SectionGrid({ children, columns = 1 }: SectionGridProps) {
  const gridCols = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
  };

  return <div className={`grid ${gridCols[columns]} gap-6`}>{children}</div>;
}
