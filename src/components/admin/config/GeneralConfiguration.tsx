import React from 'react';
import { useTranslation } from '../../../contexts/LanguageContext';
import { FormField } from '../../common/FormField';

interface GeneralConfigurationProps {
  numberOfTeams: number;
  playersPerTeam: number;
  numberOfRounds: number;
  matchesPerGame: number;
  dayOfWeek: string;
  onNumberOfTeamsChange: (value: number) => void;
  onPlayersPerTeamChange: (value: number) => void;
  onNumberOfRoundsChange: (value: number) => void;
  onMatchesPerGameChange: (value: number) => void;
  onDayOfWeekChange: (value: string) => void;
  disabled?: boolean;
}

export const GeneralConfiguration: React.FC<GeneralConfigurationProps> = ({
  numberOfTeams,
  playersPerTeam,
  numberOfRounds,
  matchesPerGame,
  dayOfWeek,
  onNumberOfTeamsChange,
  onPlayersPerTeamChange,
  onNumberOfRoundsChange,
  onMatchesPerGameChange,
  onDayOfWeekChange,
  disabled = false,
}) => {
  const { t } = useTranslation();

  return (
    <div className="border-t pt-4 mt-4">
      <h3 className="text-lg font-bold text-gray-800 mb-3">{t('leagues.generalConfiguration')}</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField label={t('config.numberOfTeams')} helperText={t('config.numberOfTeamsDesc')}>
          <input type="number" min="2" max="24" value={numberOfTeams} onChange={e => onNumberOfTeamsChange(Number(e.target.value))} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" disabled={disabled} />
        </FormField>
        <FormField label={t('config.playersPerTeam')} helperText={t('config.playersPerTeamDesc')}>
          <input type="number" min="1" max="10" value={playersPerTeam} onChange={e => onPlayersPerTeamChange(Number(e.target.value))} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" disabled={disabled} />
        </FormField>
        <FormField label={t('config.numberOfRounds')} helperText={t('config.numberOfRoundsDesc')}>
          <input type="number" min="1" max="10" value={numberOfRounds} onChange={e => onNumberOfRoundsChange(Number(e.target.value))} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" disabled={disabled} />
        </FormField>
        <FormField label={t('config.matchesPerGame')} helperText={t('config.matchesPerGameDesc')}>
          <input type="number" min="1" max="5" value={matchesPerGame} onChange={e => onMatchesPerGameChange(Number(e.target.value))} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" disabled={disabled} />
        </FormField>
        <FormField label={t('leagues.leagueDay')} helperText={t('leagues.dayPlayed')}>
          <select value={dayOfWeek} onChange={e => onDayOfWeekChange(e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" disabled={disabled}>
            <option value="">{t('leagues.selectDay')}</option>
            <option value="Sunday">{t('days.sunday')}</option>
            <option value="Monday">{t('days.monday')}</option>
            <option value="Tuesday">{t('days.tuesday')}</option>
            <option value="Wednesday">{t('days.wednesday')}</option>
            <option value="Thursday">{t('days.thursday')}</option>
            <option value="Friday">{t('days.friday')}</option>
            <option value="Saturday">{t('days.saturday')}</option>
          </select>
        </FormField>
      </div>
    </div>
  );
};
