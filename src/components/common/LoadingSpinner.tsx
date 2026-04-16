import React from 'react';

interface LoadingSpinnerProps {
  size?: 'md' | 'lg';
  color?: 'blue' | 'purple';
  className?: string;
}

const sizeClasses = { md: 'h-12 w-12', lg: 'h-16 w-16' };
const colorClasses = { blue: 'border-blue-600', purple: 'border-purple-600' };

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'md',
  color = 'blue',
  className = '',
}) => (
  <div
    className={`animate-spin rounded-full border-b-4 ${sizeClasses[size]} ${colorClasses[color]} ${className}`.trim()}
  />
);
