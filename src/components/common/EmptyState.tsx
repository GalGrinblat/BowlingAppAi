import React from 'react';

interface EmptyStateProps {
  icon?: string;
  title?: string;
  message: string;
  action?: { label: string; onClick: () => void };
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  message,
  action,
  className = 'text-center text-gray-500 py-8',
}) => (
  <div className={className}>
    {icon && <p className="text-4xl mb-3">{icon}</p>}
    {title && <h3 className="text-lg font-semibold text-gray-800 mb-2">{title}</h3>}
    <p>{message}</p>
    {action && (
      <button
        onClick={action.onClick}
        className="mt-4 text-blue-600 hover:text-blue-700 font-semibold"
      >
        {action.label}
      </button>
    )}
  </div>
);
