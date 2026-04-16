import React from 'react';
import { useTranslation } from '../../../contexts/LanguageContext';
import { FormField } from '../../common/FormField';

interface PointsConfigurationProps {
  playerMatchPointsPerWin: number;
  teamMatchPointsPerWin: number;
  teamGamePointsPerWin: number;
  onPlayerMatchPointsPerWinChange: (value: number) => void;
  onTeamMatchPointsPerWinChange: (value: number) => void;
  onTeamGamePointsPerWinChange: (value: number) => void;
  disabled?: boolean;
}

export const PointsConfiguration: React.FC<PointsConfigurationProps> = ({
  playerMatchPointsPerWin,
  teamMatchPointsPerWin,
  teamGamePointsPerWin,
  onPlayerMatchPointsPerWinChange,
  onTeamMatchPointsPerWinChange,
  onTeamGamePointsPerWinChange,
  disabled = false,
}) => {
  const { t } = useTranslation();

  return (
    <div>
      <h3 className="text-lg font-bold text-gray-800 mb-3">{t('leagues.points.config')}</h3>
      <p className="text-sm text-gray-600 mb-3">{t('leagues.points.configDesc')}</p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <FormField label={t('leagues.points.playerMatchPerWin')} helperText={t('leagues.points.playerMatchPerWinDesc')}>
          <input type="number" min="0" step="0.5" value={playerMatchPointsPerWin} onChange={e => onPlayerMatchPointsPerWinChange(Number(e.target.value))} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" disabled={disabled} />
        </FormField>
        <FormField label={t('leagues.points.teamMatchPerWin')} helperText={t('leagues.points.teamMatchPerWinDesc')}>
          <input type="number" min="0.5" step="0.5" value={teamMatchPointsPerWin} onChange={e => onTeamMatchPointsPerWinChange(Number(e.target.value))} className="w-full px-3 py-2 border border-gray-300 rounded-lg" disabled={disabled} />
        </FormField>
        <FormField label={t('leagues.points.teamGamePerWin')} helperText={t('leagues.points.teamGamePerWinDesc')}>
          <input type="number" min="0" step="0.5" value={teamGamePointsPerWin} onChange={e => onTeamGamePointsPerWinChange(Number(e.target.value))} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" disabled={disabled} />
        </FormField>
      </div>
    </div>
  );
};
