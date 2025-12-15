import React from 'react';
import { useTheme } from '../contexts/ThemeContext';

interface LoadingSkeletonProps {
  lines?: number;
  className?: string;
  showAvatar?: boolean;
}

export const LoadingSkeleton: React.FC<LoadingSkeletonProps> = ({ 
  lines = 3, 
  className = '',
  showAvatar = false 
}) => {
  const { isDark } = useTheme();

  const bgColor = isDark ? 'bg-zinc-800' : 'bg-zinc-200';
  const animateClass = 'animate-pulse';

  return (
    <div className={`${className}`}>
      <div className="flex items-start space-x-4">
        {showAvatar && (
          <div className={`rounded-full ${bgColor} ${animateClass} w-12 h-12`} />
        )}
        <div className="flex-1 space-y-2">
          {Array.from({ length: lines }).map((_, i) => (
            <div
              key={i}
              className={`h-4 ${bgColor} rounded ${animateClass}`}
              style={{ width: i === lines - 1 ? '75%' : '100%' }}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export const CardSkeleton: React.FC<{ className?: string }> = ({ className = '' }) => {
  const { isDark } = useTheme();
  const bgColor = isDark ? 'bg-zinc-800' : 'bg-zinc-200';

  return (
    <div className={`rounded-xl p-4 ${bgColor} animate-pulse ${className}`}>
      <div className={`h-6 ${bgColor} rounded w-3/4 mb-3`} />
      <div className={`h-4 ${bgColor} rounded w-full mb-2`} />
      <div className={`h-4 ${bgColor} rounded w-5/6`} />
    </div>
  );
};

export const ListSkeleton: React.FC<{ items?: number; className?: string }> = ({ 
  items = 5, 
  className = '' 
}) => {
  return (
    <div className={`space-y-3 ${className}`}>
      {Array.from({ length: items }).map((_, i) => (
        <LoadingSkeleton key={i} lines={2} />
      ))}
    </div>
  );
};





