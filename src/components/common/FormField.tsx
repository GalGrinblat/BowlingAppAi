import React from 'react';

interface FormFieldProps {
  label: string;
  htmlFor?: string;
  required?: boolean;
  helperText?: React.ReactNode;
  error?: string;
  children: React.ReactNode;
  className?: string;
}

export const FormField: React.FC<FormFieldProps> = ({
  label,
  htmlFor,
  required = false,
  helperText,
  error,
  children,
  className,
}) => (
  <div className={className}>
    <label htmlFor={htmlFor} className="block text-sm font-semibold text-gray-700 mb-2">
      {label}{required && ' *'}
    </label>
    {children}
    {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    {!error && helperText && <p className="text-xs text-gray-500 mt-1">{helperText}</p>}
  </div>
);
