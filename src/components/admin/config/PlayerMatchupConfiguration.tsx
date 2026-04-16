import React from 'react';
import { useTranslation } from '../../../contexts/LanguageContext';
import { FormField } from '../../common/FormField';

interface PlayerMatchupConfigurationProps {
  lineupStrategy: string;
  lineupRule: string;
  onLineupStrategyChange: (value: string) => void;
  onLineupRuleChange: (value: string) => void;
  disabled?: boolean;
}

export const PlayerMatchupConfiguration: React.FC<PlayerMatchupConfigurationProps> = ({
  lineupStrategy,
  lineupRule,
  onLineupStrategyChange,
  onLineupRuleChange,
  disabled = false,
}) => {
  const { t } = useTranslation();

  return (
    <div className="border-t pt-4 mt-4">
      <h3 className="text-lg font-bold text-gray-800 mb-3">{t('leagues.playerMatchupConfiguration')}</h3>
      <p className="text-sm text-gray-600 mb-3">
        {t('leagues.lineup.strategyDesc')}
      </p>
      <div className="space-y-4">
        <FormField label={t('leagues.lineup.strategyLabel')} helperText={
          (lineupStrategy === 'flexible' && t('leagues.lineup.flexibleDesc')) ||
          (lineupStrategy === 'rule-based' && t('leagues.lineup.ruleBasedDesc')) ||
          undefined
        }>
          <select value={lineupStrategy} onChange={e => onLineupStrategyChange(e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" disabled={disabled}>
            <option value="flexible">{t('leagues.lineup.flexible')}</option>
            <option value="fixed">{t('leagues.lineup.fixed')}</option>
            <option value="rule-based">{t('leagues.lineup.ruleBased')}</option>
          </select>
        </FormField>
        {lineupStrategy === 'rule-based' && (
          <FormField label={t('leagues.lineup.rankingRuleLabel')} helperText={lineupRule === 'standard' ? t('leagues.lineup.standardDesc') : undefined}>
            <select value={lineupRule} onChange={e => onLineupRuleChange(e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" disabled={disabled}>
              <option value="standard">{t('leagues.lineup.standard')}</option>
              <option value="balanced">{t('leagues.lineup.balanced')}</option>
            </select>
          </FormField>
        )}
      </div>
    </div>
  );
};

export default PlayerMatchupConfiguration;
