import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from '../../../contexts/LanguageContext';
import { ArrowLeft, ArrowRight } from '../Icons';

interface NavLinkProps {
  direction: 'back' | 'forward';
  label: string;
  to: string;
  className?: string;
}

export const NavLink: React.FC<NavLinkProps> = ({ direction, label, to, className }) => {
  const { isRTL } = useTranslation();
  const isForward = direction === 'forward';
  const Icon = isForward
    ? (isRTL ? ArrowLeft : ArrowRight)
    : (isRTL ? ArrowRight : ArrowLeft);
  return (
    <Link to={to} className={`flex items-center gap-1.5 ${className ?? ''}`}>
      {isForward ? <><span>{label}</span><Icon size={16} /></> : <><Icon size={16} /><span>{label}</span></>}
    </Link>
  );
};
