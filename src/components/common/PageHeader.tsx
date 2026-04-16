import React from 'react';
import { BackButton } from './BackButton';

type BackProp = { label: string; onClick: () => void } | { label: string; to: string };

interface PageHeaderProps {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  back?: BackProp;
  actions?: React.ReactNode;
  children?: React.ReactNode;
}

export const PageHeader: React.FC<PageHeaderProps> = ({ title, subtitle, back, actions, children }) => (
  <div className="bg-white rounded-xl shadow-lg p-6">
    <div className="flex flex-wrap justify-between items-center gap-3">
      <div className="min-w-0">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">{title}</h1>
        {subtitle && <p className="text-gray-600">{subtitle}</p>}
      </div>
      {(back || actions) && (
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {back && <BackButton {...back} />}
          {actions}
        </div>
      )}
    </div>
    {children}
  </div>
);
