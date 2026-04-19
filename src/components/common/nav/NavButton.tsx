import React from 'react';
import { useTranslation } from '../../../contexts/LanguageContext';
import { ArrowLeft, ArrowRight } from '../Icons';

interface NavButtonProps {
  direction: 'back' | 'forward';
  label: string;
  onClick: () => void;
  className?: string;
  type?: 'button' | 'submit';
}

export const NavButton: React.FC<NavButtonProps> = ({
  direction,
  label,
  onClick,
  className = 'text-gray-600 hover:text-gray-800',
  type = 'button',
}) => {
  const { isRTL } = useTranslation();
  const isForward = direction === 'forward';
  const Icon = isForward
    ? (isRTL ? ArrowLeft : ArrowRight)
    : (isRTL ? ArrowRight : ArrowLeft);
  return (
    <button type={type} onClick={onClick} className={`flex items-center gap-1.5 ${className}`}>
      {isForward ? <><span>{label}</span><Icon size={16} /></> : <><Icon size={16} /><span>{label}</span></>}
    </button>
  );
};
