import { motion } from 'framer-motion';

interface ProgressIndicatorProps {
  value: number;
  label?: string;
  size?: 'sm' | 'md' | 'lg';
  showPercentage?: boolean;
  showLabel?: boolean; // Alias for showPercentage
  color?: 'teal' | 'cyan' | 'purple' | 'amber';
}

export function ProgressIndicator({
  value,
  label,
  size = 'md',
  showPercentage = true,
  showLabel,
  color = 'teal',
}: ProgressIndicatorProps) {
  // showLabel is an alias for showPercentage
  const displayPercentage = showLabel ?? showPercentage;
  const heights = {
    sm: 'h-1.5',
    md: 'h-2.5',
    lg: 'h-4',
  };

  const colors = {
    teal: 'bg-teal-500',
    cyan: 'bg-cyan-500',
    purple: 'bg-purple-500',
    amber: 'bg-amber-500',
  };

  const bgColors = {
    teal: 'bg-teal-500/20',
    cyan: 'bg-cyan-500/20',
    purple: 'bg-purple-500/20',
    amber: 'bg-amber-500/20',
  };

  return (
    <div className="w-full">
      {(label || displayPercentage) && (
        <div className="flex justify-between items-center mb-1.5">
          {label && <span className="text-sm text-slate-400">{label}</span>}
          {displayPercentage && (
            <span className="text-sm font-medium text-white">{value}%</span>
          )}
        </div>
      )}
      <div className={`w-full ${bgColors[color]} rounded-full overflow-hidden ${heights[size]}`}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className={`h-full ${colors[color]} rounded-full`}
        />
      </div>
    </div>
  );
}

interface CircularProgressProps {
  value: number;
  size?: number;
  strokeWidth?: number;
  color?: 'teal' | 'cyan' | 'purple' | 'amber';
}

export function CircularProgress({
  value,
  size = 60,
  strokeWidth = 4,
  color = 'teal',
}: CircularProgressProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (value / 100) * circumference;

  const colors = {
    teal: 'stroke-teal-500',
    cyan: 'stroke-cyan-500',
    purple: 'stroke-purple-500',
    amber: 'stroke-amber-500',
  };

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="transform -rotate-90">
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-slate-700"
        />
        {/* Progress circle */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className={colors[color]}
        />
      </svg>
      <span className="absolute text-sm font-bold text-white">{value}%</span>
    </div>
  );
}
