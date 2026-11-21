import React from 'react';

export interface SkeletonProps {
  className?: string;
  count?: number;
}

export const Skeleton: React.FC<SkeletonProps> = ({ className = '', count = 1 }) => {
  return (
    <div role="status" aria-label="Loading content" aria-busy="true" className="w-full space-y-2">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={`animate-pulse bg-slate-200 rounded-md ${className || 'h-4 w-full'}`}
        />
      ))}
      <span className="sr-only">Loading...</span>
    </div>
  );
};
