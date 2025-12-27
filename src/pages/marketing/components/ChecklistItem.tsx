import React, { useState } from 'react';
import { Check, ChevronDown, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ChecklistItemProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  title: string;
  description?: string;
  children?: React.ReactNode;
  expandable?: boolean;
  defaultExpanded?: boolean;
}

export function ChecklistItem({
  checked,
  onCheckedChange,
  title,
  description,
  children,
  expandable = false,
  defaultExpanded = false,
}: ChecklistItemProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  return (
    <div className="border border-slate-200 rounded-lg overflow-hidden bg-white hover:bg-slate-50 transition-colors">
      <div className="flex items-start p-4 gap-3">
        {/* Checkbox */}
        <button
          onClick={() => onCheckedChange(!checked)}
          className={`flex-shrink-0 w-6 h-6 rounded border-2 flex items-center justify-center transition-all ${
            checked
              ? 'bg-teal-500 border-teal-500'
              : 'border-slate-300 hover:border-teal-400'
          }`}
        >
          {checked && <Check size={14} className="text-white" />}
        </button>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className={`font-medium ${checked ? 'text-slate-400 line-through' : 'text-slate-900'}`}>
              {title}
            </h4>
            {checked && (
              <span className="text-xs bg-teal-500/10 text-teal-600 px-2 py-0.5 rounded-full">
                Complete
              </span>
            )}
          </div>
          {description && (
            <p className="text-sm text-slate-500 mt-1">{description}</p>
          )}
        </div>

        {/* Expand button */}
        {expandable && children && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex-shrink-0 p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded transition-colors"
          >
            {isExpanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
          </button>
        )}
      </div>

      {/* Expandable content */}
      <AnimatePresence>
        {expandable && isExpanded && children && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="border-t border-slate-100"
          >
            <div className="p-4 bg-slate-50">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Non-expandable children */}
      {!expandable && children && (
        <div className="border-t border-slate-100 p-4 bg-slate-50">
          {children}
        </div>
      )}
    </div>
  );
}

interface SimpleCheckboxProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  label: string;
  className?: string;
}

export function SimpleCheckbox({ checked, onCheckedChange, label, className = '' }: SimpleCheckboxProps) {
  return (
    <label className={`flex items-center gap-3 cursor-pointer group ${className}`}>
      <button
        onClick={() => onCheckedChange(!checked)}
        className={`flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
          checked
            ? 'bg-teal-500 border-teal-500'
            : 'border-slate-300 group-hover:border-teal-400'
        }`}
      >
        {checked && <Check size={12} className="text-white" />}
      </button>
      <span className={`text-sm ${checked ? 'text-slate-400 line-through' : 'text-slate-700'}`}>
        {label}
      </span>
    </label>
  );
}
