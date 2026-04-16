import React from 'react';

type ActionButtonVariant = 'view' | 'edit' | 'delete' | 'archive' | 'restore';

interface ActionButtonProps {
  variant: ActionButtonVariant;
  label: string;
  onClick: () => void;
  icon?: string;
  disabled?: boolean;
  title?: string;
}

const variantClasses: Record<ActionButtonVariant, string> = {
  view:    'bg-purple-100 text-purple-700 hover:bg-purple-200',
  edit:    'bg-blue-100 text-blue-700 hover:bg-blue-200',
  delete:  'bg-red-100 text-red-700 hover:bg-red-200',
  archive: 'bg-orange-100 text-orange-700 hover:bg-orange-200',
  restore: 'bg-green-100 text-green-700 hover:bg-green-200',
};

export const ActionButton: React.FC<ActionButtonProps> = ({
  variant, label, onClick, icon, disabled = false, title,
}) => (
  <button
    onClick={onClick}
    disabled={disabled}
    title={title}
    className={`px-3 py-1 text-sm rounded ${variantClasses[variant]} disabled:opacity-50 disabled:cursor-not-allowed`}
  >
    {icon && `${icon} `}{label}
  </button>
);
