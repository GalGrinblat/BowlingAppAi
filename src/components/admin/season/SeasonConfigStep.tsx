import React from 'react';
import { useTranslation } from '../../../contexts/LanguageContext';
import { FormField } from '../../common/FormField';
import { PageHeader } from '../../common/PageHeader';
import { HandicapConfigurationForm } from '../config/HandicapConfigurationForm';
import { PointsConfiguration } from '../config/PointsConfiguration';
import { GeneralConfiguration } from '../config/GeneralConfiguration';
import { BonusRulesConfiguration } from '../config/BonusRulesConfiguration';
import { PlayerMatchupConfiguration } from '../config/PlayerMatchupConfiguration';
import type { BonusRule, LineupStrategy, LineupRule, League } from '../../../types/index';
import {
  DEFAULT_NUMBER_OF_TEAMS, DEFAULT_PLAYERS_PER_TEAM, DEFAULT_NUMBER_OF_ROUNDS,
  DEFAULT_MATCHES_PER_GAME, DEFAULT_PLAYER_MATCH_POINTS, DEFAULT_TEAM_MATCH_POINTS,
  DEFAULT_TEAM_GAME_POINTS, DEFAULT_USE_HANDICAP, DEFAULT_HANDICAP_BASIS,
  DEFAULT_HANDICAP_PERCENTAGE, DEFAULT_LINEUP_STRATEGY, DEFAULT_LINEUP_RULE,
  DEFAULT_TEAM_ALL_PRESENT_BONUS_ENABLED, DEFAULT_TEAM_ALL_PRESENT_BONUS_POINTS
} from '../../../constants/bowling';

export type SeasonFormData = {
  name: string;
  description?: string;
  numberOfTeams: number;
  playersPerTeam: number;
  numberOfRounds: number;
  matchesPerGame: number;
  lineupStrategy?: LineupStrategy;
  lineupRule?: LineupRule;
  playerMatchPointsPerWin: number;
  teamMatchPointsPerWin: number;
  teamGamePointsPerWin: number;
  useHandicap: boolean;
  handicapBasis: number;
  handicapPercentage: number;
  teamAllPresentBonusEnabled: boolean;
  teamAllPresentBonusPoints: number;
  bonusRules: BonusRule[];
  dayOfWeek?: string;
};

interface SeasonConfigStepProps {
  league: League;
  formData: SeasonFormData;
  inheritLeagueConfig: boolean;
  onFormDataChange: (data: SeasonFormData) => void;
  onInheritChange: (inherit: boolean) => void;
  onNext: (numberOfTeams: number) => void;
  onBack: () => void;
}

export const SeasonConfigStep: React.FC<SeasonConfigStepProps> = ({
  league, formData, inheritLeagueConfig, onFormDataChange, onInheritChange, onNext, onBack
}) => {
  const { t } = useTranslation();

  const getValue = (key: keyof SeasonFormData) => {
    if (inheritLeagueConfig) {
      const cfg = league?.defaultSeasonConfigurations;
      switch (key) {
        case 'numberOfTeams': return cfg?.numberOfTeams || DEFAULT_NUMBER_OF_TEAMS;
        case 'playersPerTeam': return cfg?.playersPerTeam || DEFAULT_PLAYERS_PER_TEAM;
        case 'numberOfRounds': return cfg?.numberOfRounds || DEFAULT_NUMBER_OF_ROUNDS;
        case 'matchesPerGame': return cfg?.matchesPerGame || DEFAULT_MATCHES_PER_GAME;
        case 'lineupStrategy': return cfg?.lineupStrategy || DEFAULT_LINEUP_STRATEGY;
        case 'lineupRule': return cfg?.lineupRule || DEFAULT_LINEUP_RULE;
        case 'playerMatchPointsPerWin': return cfg?.playerMatchPointsPerWin || DEFAULT_PLAYER_MATCH_POINTS;
        case 'teamMatchPointsPerWin': return cfg?.teamMatchPointsPerWin || DEFAULT_TEAM_MATCH_POINTS;
        case 'teamGamePointsPerWin': return cfg?.teamGamePointsPerWin || DEFAULT_TEAM_GAME_POINTS;
        case 'useHandicap': return cfg?.useHandicap ?? DEFAULT_USE_HANDICAP;
        case 'handicapBasis': return cfg?.handicapBasis ?? DEFAULT_HANDICAP_BASIS;
        case 'handicapPercentage': return cfg?.handicapPercentage ?? DEFAULT_HANDICAP_PERCENTAGE;
        case 'teamAllPresentBonusEnabled': return cfg?.teamAllPresentBonusEnabled ?? DEFAULT_TEAM_ALL_PRESENT_BONUS_ENABLED;
        case 'teamAllPresentBonusPoints': return cfg?.teamAllPresentBonusPoints ?? DEFAULT_TEAM_ALL_PRESENT_BONUS_POINTS;
        case 'bonusRules': return cfg?.bonusRules ? JSON.parse(JSON.stringify(cfg.bonusRules)) : [];
        default: return formData[key];
      }
    }
    return formData[key];
  };

  const update = (partial: Partial<SeasonFormData>) => onFormDataChange({ ...formData, ...partial });

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('seasons.createSeason')}
        subtitle={league.name}
        back={{ label: t('common.backToLeague'), onClick: onBack }}
      />
      <div className="bg-white rounded-xl shadow-lg p-6">
        <form onSubmit={e => {
          e.preventDefault();
          if (!formData.name.trim()) {
            alert(t('validation.seasonNameRequired'));
            return;
          }
          onNext(getValue('numberOfTeams') as number);
        }} className="space-y-4">

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label={t('seasons.seasonName')} required className="md:col-span-2">
              <input type="text" value={formData.name} onChange={e => update({ name: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="e.g., Spring 2026, Fall Season" required />
            </FormField>
            <FormField label={t('leagues.description')} className="md:col-span-2">
              <textarea value={formData.description || ''} onChange={e => update({ description: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder={t('leagues.briefDescription')} rows={2} />
            </FormField>
            <div className="md:col-span-2 flex items-center mb-4">
              <input
                type="checkbox"
                id="inheritLeagueConfig"
                checked={inheritLeagueConfig}
                onChange={e => {
                  onInheritChange(e.target.checked);
                  if (e.target.checked) {
                    const cfg = league?.defaultSeasonConfigurations;
                    update({
                      lineupStrategy: cfg?.lineupStrategy || 'flexible' as LineupStrategy,
                      lineupRule: cfg?.lineupRule || 'standard' as LineupRule,
                      playerMatchPointsPerWin: cfg?.playerMatchPointsPerWin || 1,
                      teamMatchPointsPerWin: cfg?.teamMatchPointsPerWin || 1,
                      teamGamePointsPerWin: cfg?.teamGamePointsPerWin || 2,
                      useHandicap: cfg?.useHandicap ?? true,
                      handicapBasis: cfg?.handicapBasis ?? 160,
                      handicapPercentage: cfg?.handicapPercentage ?? 100,
                      bonusRules: cfg?.bonusRules ? JSON.parse(JSON.stringify(cfg.bonusRules)) : [],
                      teamAllPresentBonusEnabled: cfg?.teamAllPresentBonusEnabled || DEFAULT_TEAM_ALL_PRESENT_BONUS_ENABLED,
                      teamAllPresentBonusPoints: cfg?.teamAllPresentBonusPoints || DEFAULT_TEAM_ALL_PRESENT_BONUS_POINTS,
                    });
                  }
                }}
                className="mr-2"
              />
              <label htmlFor="inheritLeagueConfig" className="text-sm font-semibold text-gray-700">
                {t('seasons.inheritFromLeagueConfig')}
              </label>
            </div>
          </div>

          <GeneralConfiguration
            numberOfTeams={getValue('numberOfTeams')} playersPerTeam={getValue('playersPerTeam')}
            numberOfRounds={getValue('numberOfRounds')} matchesPerGame={getValue('matchesPerGame')}
            dayOfWeek={league?.dayOfWeek || ''}
            onNumberOfTeamsChange={value => update({ numberOfTeams: value })}
            onPlayersPerTeamChange={value => update({ playersPerTeam: value })}
            onNumberOfRoundsChange={value => update({ numberOfRounds: value })}
            onMatchesPerGameChange={value => update({ matchesPerGame: value })}
            onDayOfWeekChange={value => update({ dayOfWeek: value })}
            disabled={inheritLeagueConfig}
          />

          <PlayerMatchupConfiguration
            lineupStrategy={getValue('lineupStrategy')} lineupRule={getValue('lineupRule')}
            onLineupStrategyChange={value => update({ lineupStrategy: value as LineupStrategy })}
            onLineupRuleChange={value => update({ lineupRule: value as LineupRule })}
            disabled={inheritLeagueConfig}
          />

          <PointsConfiguration
            playerMatchPointsPerWin={getValue('playerMatchPointsPerWin') || 1}
            teamMatchPointsPerWin={getValue('teamMatchPointsPerWin') || 1}
            teamGamePointsPerWin={getValue('teamGamePointsPerWin') || 2}
            onPlayerMatchPointsPerWinChange={value => update({ playerMatchPointsPerWin: value })}
            onTeamMatchPointsPerWinChange={value => update({ teamMatchPointsPerWin: value })}
            onTeamGamePointsPerWinChange={value => update({ teamGamePointsPerWin: value })}
            disabled={inheritLeagueConfig}
          />

          <div className="border-t pt-4 mt-4">
            <HandicapConfigurationForm
              useHandicap={getValue('useHandicap')} handicapBasis={getValue('handicapBasis')}
              handicapPercentage={getValue('handicapPercentage')}
              onUseHandicapChange={(value: boolean) => update({ useHandicap: value })}
              onHandicapBasisChange={(value: number) => update({ handicapBasis: value })}
              onHandicapPercentageChange={(value: number) => update({ handicapPercentage: value })}
              showDescription={true} disabled={inheritLeagueConfig}
            />
          </div>

          <div className="border-t pt-4 mt-4">
            <BonusRulesConfiguration
              bonusRules={inheritLeagueConfig ? (league?.defaultSeasonConfigurations.bonusRules || []) : formData.bonusRules}
              teamAllPresentBonusEnabled={inheritLeagueConfig ? (league?.defaultSeasonConfigurations.teamAllPresentBonusEnabled ?? DEFAULT_TEAM_ALL_PRESENT_BONUS_ENABLED) : formData.teamAllPresentBonusEnabled}
              teamAllPresentBonusPoints={inheritLeagueConfig ? (league?.defaultSeasonConfigurations.teamAllPresentBonusPoints ?? DEFAULT_TEAM_ALL_PRESENT_BONUS_POINTS) : formData.teamAllPresentBonusPoints}
              onBonusRulesChange={rules => update({ bonusRules: rules })}
              onTeamAllPresentBonusEnabledChange={enabled => update({ teamAllPresentBonusEnabled: enabled })}
              onTeamAllPresentBonusPointsChange={points => update({ teamAllPresentBonusPoints: points })}
              disabled={inheritLeagueConfig}
            />
          </div>

          <div className="flex gap-3 mt-6">
            <button type="button" onClick={onBack} className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-semibold">{t('common.cancel')}</button>
            <button type="submit" className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold">{t('common.next')}</button>
          </div>
        </form>
      </div>
    </div>
  );
};
