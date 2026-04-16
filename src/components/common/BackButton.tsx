import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from '../../contexts/LanguageContext';
import { ArrowLeft, ArrowRight } from './Icons';

type BackButtonProps = {
  label: string;
  className?: string;
  type?: 'button' | 'submit';
} & (
  | { onClick: () => void; to?: never }
  | { to: string; onClick?: never }
);

export const BackButton: React.FC<BackButtonProps> = ({ label, className = '', type = 'button', onClick, to }) => {
  const { isRTL } = useTranslation();
  const Icon = isRTL ? ArrowRight : ArrowLeft;
  const content = <><Icon size={16} /><span>{label}</span></>;
  const cls = `flex items-center gap-1.5 text-gray-600 hover:text-gray-800 ${className}`.trim();

  if (to !== undefined) return <Link to={to} className={cls}>{content}</Link>;
  return <button type={type} onClick={onClick} className={cls}>{content}</button>;
};
