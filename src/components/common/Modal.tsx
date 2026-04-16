import React from 'react';

interface ModalProps {
  isOpen: boolean;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
  scrollable?: boolean;
}

const sizeClasses = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-4xl',
};

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  title,
  subtitle,
  children,
  footer,
  size = 'md',
  scrollable = false,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className={`bg-white rounded-xl shadow-2xl w-full ${sizeClasses[size]} ${scrollable ? 'max-h-[90vh] flex flex-col overflow-hidden' : ''}`}>
        <div className={`p-6 ${footer || scrollable ? 'border-b border-gray-200' : ''}`}>
          <h2 className="text-xl font-bold text-gray-800">{title}</h2>
          {subtitle && <p className="text-gray-600 mt-1">{subtitle}</p>}
        </div>
        <div className={scrollable ? 'flex-1 overflow-y-auto p-6' : 'p-6'}>
          {children}
        </div>
        {footer && (
          <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};
