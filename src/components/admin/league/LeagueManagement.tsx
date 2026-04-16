import React, { useState, useEffect, useCallback } from 'react';
import { leaguesApi, seasonsApi } from '../../../services/api';
import { createLeague, validateLeague } from '../../../models';
import { useTranslation } from '../../../contexts/LanguageContext';
import { BackButton } from '../../common/BackButton';
import { DEFAULT_HANDICAP_BASIS, DEFAULT_HANDICAP_PERCENTAGE, DEFAULT_NUMBER_OF_TEAMS, DEFAULT_NUMBER_OF_ROUNDS, DEFAULT_PLAYERS_PER_TEAM, DEFAULT_MATCHES_PER_GAME, DEFAULT_PLAYER_MATCH_POINTS, DEFAULT_TEAM_MATCH_POINTS, DEFAULT_TEAM_GAME_POINTS, DEFAULT_USE_HANDICAP, DEFAULT_LINEUP_STRATEGY, DEFAULT_LINEUP_RULE } from '../../../constants/bowling';
import { HandicapConfigurationForm } from '../config/HandicapConfigurationForm';
import { PlayerMatchupConfiguration } from '../config/PlayerMatchupConfiguration';
import { PointsConfiguration } from '../config/PointsConfiguration';
import { GeneralConfiguration } from '../config/GeneralConfiguration';
import { BonusRulesConfiguration } from '../config/BonusRulesConfiguration';

import { useNavigate } from 'react-router-dom';
import { useAdminData } from '../../../contexts/AdminDataContext';
import type { League, Season, SeasonConfigurations, LineupStrategy, LineupRule } from '../../../types/index';

function getDefaultSeasonConfigurations(): SeasonConfigurations {
  return {
    numberOfTeams: DEFAULT_NUMBER_OF_TEAMS,
    playersPerTeam: DEFAULT_PLAYERS_PER_TEAM,
    numberOfRounds: DEFAULT_NUMBER_OF_ROUNDS,
    matchesPerGame: DEFAULT_MATCHES_PER_GAME,
    lineupStrategy: DEFAULT_LINEUP_STRATEGY,
    lineupRule: DEFAULT_LINEUP_RULE,
    playerMatchPointsPerWin: DEFAULT_PLAYER_MATCH_POINTS,
    teamMatchPointsPerWin: DEFAULT_TEAM_MATCH_POINTS,
    teamGamePointsPerWin: DEFAULT_TEAM_GAME_POINTS,
    useHandicap: DEFAULT_USE_HANDICAP,
    handicapBasis: DEFAULT_HANDICAP_BASIS,
    handicapPercentage: DEFAULT_HANDICAP_PERCENTAGE,
    teamAllPresentBonusEnabled: false,
    teamAllPresentBonusPoints: 1,
    bonusRules: [],
  };
}

function getDefaultFormData() {
  return {
    name: '',
    description: '',
    dayOfWeek: '',
    defaultSeasonConfigurations: getDefaultSeasonConfigurations(),
    active: true
  };
}

export const LeagueManagement: React.FC = () => {
  const navigate = useNavigate();
  const { loadDashboardData } = useAdminData();
  const { t } = useTranslation();
  const [leagues, setLeagues] = useState<League[]>([]);
  const [seasonsMap, setSeasonsMap] = useState<Record<string, Season[]>>({});
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<{
    name: string;
    description: string;
    dayOfWeek: string;
    defaultSeasonConfigurations: SeasonConfigurations;
    active: boolean;
  }>({
    ...getDefaultFormData()
  });

  const updateConfig = (field: keyof SeasonConfigurations, value: SeasonConfigurations[keyof SeasonConfigurations]) =>
    setFormData(prev => ({
      ...prev,
      defaultSeasonConfigurations: {
        ...prev.defaultSeasonConfigurations,
        [field]: value
      }
    }));

  const loadLeagues = useCallback(async () => {
    const data = await leaguesApi.getAll();
    setLeagues(data);

    // Load seasons for all leagues in parallel
    const seasonsResults = await Promise.all(
      data.map(league => seasonsApi.getByLeague(league.id))
    );
    const seasonsData: Record<string, Season[]> = {};
    data.forEach((league, i) => { seasonsData[league.id] = seasonsResults[i] ?? []; });
    setSeasonsMap(seasonsData);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadLeagues();
  }, [loadLeagues]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const leagueData = createLeague({
      ...formData,
      ...formData.defaultSeasonConfigurations,
    });
    const validation = validateLeague(leagueData);

    if (!validation.valid) {
      alert(validation.error);
      return;
    }

    // Check for duplicate league names (excluding current league when editing)
    const duplicateName = leagues.find(l =>
      l.name.trim().toLowerCase() === formData.name.trim().toLowerCase() &&
      l.id !== editingId
    );

    if (duplicateName) {
      alert(t('leagues.duplicateName'));
      return;
    }

    if (editingId) {
      await leaguesApi.update(editingId, leagueData);
      alert(t('leagues.leagueUpdated'));
      setEditingId(null);
    } else {
      await leaguesApi.create(leagueData);
      alert(t('leagues.leagueCreated'));
    }

    setFormData(getDefaultFormData());
    setIsAdding(false);
    await loadLeagues();
    await loadDashboardData();
  };

  const handleEdit = (league: League) => {
    const cfg = league.defaultSeasonConfigurations;
    setFormData({
      ...getDefaultFormData(),
      name: league.name,
      description: league.description || '',
      dayOfWeek: league.dayOfWeek || '',
      defaultSeasonConfigurations: {
        numberOfTeams: cfg.numberOfTeams || DEFAULT_NUMBER_OF_TEAMS,
        playersPerTeam: cfg.playersPerTeam || DEFAULT_PLAYERS_PER_TEAM,
        numberOfRounds: cfg.numberOfRounds || DEFAULT_NUMBER_OF_ROUNDS,
        matchesPerGame: cfg.matchesPerGame || DEFAULT_MATCHES_PER_GAME,
        lineupStrategy: cfg.lineupStrategy,
        lineupRule: cfg.lineupRule,
        playerMatchPointsPerWin: cfg.playerMatchPointsPerWin || DEFAULT_PLAYER_MATCH_POINTS,
        teamMatchPointsPerWin: cfg.teamMatchPointsPerWin || DEFAULT_TEAM_MATCH_POINTS,
        teamGamePointsPerWin: cfg.teamGamePointsPerWin || DEFAULT_TEAM_GAME_POINTS,
        useHandicap: cfg.useHandicap !== undefined ? cfg.useHandicap : DEFAULT_USE_HANDICAP,
        handicapBasis: cfg.handicapBasis,
        handicapPercentage: cfg.handicapPercentage || DEFAULT_HANDICAP_PERCENTAGE,
        teamAllPresentBonusEnabled: cfg.teamAllPresentBonusEnabled,
        teamAllPresentBonusPoints: cfg.teamAllPresentBonusPoints,
        bonusRules: cfg.bonusRules || [],
      },
      active: league.active
    });
    setEditingId(league.id);
    setIsAdding(true);
  };

  const handleDelete = async (id: string) => {
    const league = leagues.find(l => l.id === id);
    const seasons = await seasonsApi.getByLeague(id);

    if (seasons.length > 0) {
      const activeSeasons = seasons.filter(s => s.status === 'active');

      let message = `${t('leagues.cannotDelete')} "${league?.name}" (${seasons.length}):\n\n`;
      if (activeSeasons.length > 0) {
        message += `• ${activeSeasons.length} ${t('seasons.activeSeasons')}\n`;
      }
      message += `\n${t('leagues.completeOrDelete')}`;

      alert(message);
      return;
    }

    if (confirm(`${t('leagues.deleteConfirm')} "${league?.name}"?\n\n${t('common.deleteWarning')}`)) {
      await leaguesApi.delete(id);
      await loadLeagues();
      await loadDashboardData();
      alert(t('leagues.leagueDeleted'));
    }
  };

  const toggleActive = async (league: League) => {
    if (league.active) {
      // Archiving an active league
      if (confirm(`📦 ${t('leagues.archiveConfirm')} "${league.name}"?\n\n${t('leagues.archiveDesc')}`)) {
        await leaguesApi.update(league.id, { active: false });
        alert(`✅ "${league.name}" ${t('leagues.archived')}`);
        await loadLeagues();
        await loadDashboardData();
      }
    } else {
      // Restoring an archived league
      if (confirm(`📤 ${t('leagues.restoreConfirm')} "${league.name}"?\n\n${t('leagues.restoreDesc')}`)) {
        await leaguesApi.update(league.id, { active: true });
        alert(`✅ "${league.name}" ${t('leagues.restored')}`);
        await loadLeagues();
        await loadDashboardData();
      }
    }
  };

  const handleCancel = () => {
    setFormData(getDefaultFormData());
    setIsAdding(false);
    setEditingId(null);
  };

  const activeLeagues = leagues.filter(l => l.active);
  const archivedLeagues = leagues.filter(l => !l.active);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-800 mb-2">{t('leagues.title')}</h1>
            <p className="text-gray-600">{t('leagues.totalLeagues').replace('{{count}}', String(leagues.length))}</p>
          </div>
          <BackButton label={t('common.backToDashboard')} onClick={() => navigate('/admin')} />
        </div>
      </div>

      {/* Add/Edit Form */}
      {isAdding ? (
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">
            {editingId ? t('leagues.editLeague') : t('leagues.createLeague')}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">

            {/* Title & Description */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  {t('leagues.leagueName')} *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder={t('leagues.exampleName')}
                  required
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  {t('leagues.description')}
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder={t('leagues.briefDescription')}
                  rows={3}
                />
              </div>
            </div>

            {/* General Configurations */}
            <GeneralConfiguration
              numberOfTeams={formData.defaultSeasonConfigurations.numberOfTeams}
              playersPerTeam={formData.defaultSeasonConfigurations.playersPerTeam}
              numberOfRounds={formData.defaultSeasonConfigurations.numberOfRounds}
              matchesPerGame={formData.defaultSeasonConfigurations.matchesPerGame}
              dayOfWeek={formData.dayOfWeek}
              onNumberOfTeamsChange={value => updateConfig('numberOfTeams', value)}
              onPlayersPerTeamChange={value => updateConfig('playersPerTeam', value)}
              onNumberOfRoundsChange={value => updateConfig('numberOfRounds', value)}
              onMatchesPerGameChange={value => updateConfig('matchesPerGame', value)}
              onDayOfWeekChange={value => setFormData({ ...formData, dayOfWeek: value })}
            />

            {/* Player Matchup Configuration Section */}
            <PlayerMatchupConfiguration
              lineupStrategy={formData.defaultSeasonConfigurations.lineupStrategy}
              lineupRule={formData.defaultSeasonConfigurations.lineupRule}
              onLineupStrategyChange={value => updateConfig('lineupStrategy', value as LineupStrategy)}
              onLineupRuleChange={value => updateConfig('lineupRule', value as LineupRule)}
            />

            {/* Point Configuration Section */}
            <PointsConfiguration
              playerMatchPointsPerWin={formData.defaultSeasonConfigurations.playerMatchPointsPerWin}
              teamMatchPointsPerWin={formData.defaultSeasonConfigurations.teamMatchPointsPerWin}
              teamGamePointsPerWin={formData.defaultSeasonConfigurations.teamGamePointsPerWin}
              onPlayerMatchPointsPerWinChange={value => updateConfig('playerMatchPointsPerWin', value)}
              onTeamMatchPointsPerWinChange={value => updateConfig('teamMatchPointsPerWin', value)}
              onTeamGamePointsPerWinChange={value => updateConfig('teamGamePointsPerWin', value)}
            />

            {/* Handicap Configuration Section */}
            <HandicapConfigurationForm
              useHandicap={formData.defaultSeasonConfigurations.useHandicap}
              handicapBasis={formData.defaultSeasonConfigurations.handicapBasis}
              handicapPercentage={formData.defaultSeasonConfigurations.handicapPercentage}
              onUseHandicapChange={(value: boolean) => updateConfig('useHandicap', value)}
              onHandicapBasisChange={(value: number) => updateConfig('handicapBasis', value)}
              onHandicapPercentageChange={(value: number) => updateConfig('handicapPercentage', value)}
              showDescription={true}
            />

            {/* Bonus Rules Configuration Section */}
            <div className="border-t pt-4 mt-4">
              <BonusRulesConfiguration
                bonusRules={formData.defaultSeasonConfigurations.bonusRules}
                teamAllPresentBonusEnabled={formData.defaultSeasonConfigurations.teamAllPresentBonusEnabled}
                teamAllPresentBonusPoints={formData.defaultSeasonConfigurations.teamAllPresentBonusPoints}
                onBonusRulesChange={rules => updateConfig('bonusRules', rules)}
                onTeamAllPresentBonusEnabledChange={enabled => updateConfig('teamAllPresentBonusEnabled', enabled)}
                onTeamAllPresentBonusPointsChange={points => updateConfig('teamAllPresentBonusPoints', points)}
                disabled={false}
              />
            </div>

            <div className="flex gap-3">
              <button
                type="submit"
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold"
              >
                {editingId ? t('leagues.editLeague') : t('leagues.createLeague')}
              </button>
              <button
                type="button"
                onClick={handleCancel}
                className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-semibold"
              >
                {t('common.cancel')}
              </button>
            </div>
          </form>
        </div>
      ) : (
        <div className="flex justify-end">
          <button
            onClick={() => setIsAdding(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold"
          >
            + {t('leagues.createLeague')}
          </button>
        </div>
      )}

      {/* Active Leagues */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="mb-4">
          <h2 className="text-xl font-bold text-gray-800">
            {t('common.activeLeagues')} (<span className="ltr-content">{activeLeagues.length}</span>)
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            {t('leagues.currentLeagues')}
          </p>
        </div>
        {activeLeagues.length === 0 ? (
          <p className="text-gray-500 text-center py-4">{t('leagues.noActiveLeagues')}</p>
        ) : (
          <div className="space-y-3">
            {activeLeagues.map(league => {
              const seasons = seasonsMap[league.id] || [];
              const activeSeason = seasons.find(s => s.status === 'active');
              
              return (
                <div
                  key={league.id}
                  className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-800">{league.name}</h3>
                      {league.description && (
                        <p className="text-sm text-gray-600 mt-1">{league.description}</p>
                      )}
                      <div className="flex gap-4 mt-2 text-sm text-gray-500">
                        {league.dayOfWeek && <span>📅 {t(`days.${league.dayOfWeek.toLowerCase()}Plural`)}</span>}
                        <span>📊 {t('leagues.handicap.use')}: <span className="ltr-content">{league.defaultSeasonConfigurations.useHandicap !== false ? `${league.defaultSeasonConfigurations.handicapBasis} (${league.defaultSeasonConfigurations.handicapPercentage || 100}%)` : t('leagues.handicap.disabled')}</span></span>
                        <span>👥 <span className="ltr-content">{league.defaultSeasonConfigurations.playersPerTeam}</span> {t('common.playersPerTeam')}</span>
                        <span>🎳 <span className="ltr-content">{seasons.length}</span> {seasons.length === 1 ? t('common.season') : t('common.seasons')}</span>
                      </div>
                      {activeSeason && (
                        <div className="mt-2 inline-block px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm">
                          {t('common.active')}: {activeSeason.name}
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2 ml-4">
                      <button
                        onClick={() => navigate(`/admin/leagues/${league.id}`)}
                        className="px-3 py-1 text-sm bg-purple-100 text-purple-700 rounded hover:bg-purple-200"
                      >
                        {t('common.view')}
                      </button>
                      <button
                        onClick={() => handleEdit(league)}
                        className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                      >
                        {t('common.edit')}
                      </button>
                      <button
                        onClick={() => toggleActive(league)}
                        className="px-3 py-1 text-sm bg-orange-100 text-orange-700 rounded hover:bg-orange-200"
                        title={t('leagues.archiveLeague')}
                      >
                        📦 {t('leagues.archiveLeague')}
                      </button>
                      {seasons.length === 0 && (
                        <button
                          onClick={() => handleDelete(league.id)}
                          className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200"
                        >
                          {t('common.delete')}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Archived Leagues */}
      {archivedLeagues.length > 0 && (
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="mb-4">
            <h2 className="text-xl font-bold text-gray-800">
              📦 {t('leagues.archivedLeagues')} (<span className="ltr-content">{archivedLeagues.length}</span>)
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              {t('leagues.completedInactive')}
            </p>
          </div>
          <div className="space-y-3">
            {archivedLeagues.map(league => {
              const seasons = seasonsMap[league.id] || [];
              
              return (
                <div
                  key={league.id}
                  className="border border-gray-200 rounded-lg p-4 bg-gray-50"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-semibold text-gray-600">{league.name}</h3>
                      <div className="text-sm text-gray-500 mt-1">
                        {league.dayOfWeek && <span>{t(`days.${league.dayOfWeek.toLowerCase()}Plural`)} • </span>}
                        <span className="ltr-content">{seasons.length}</span> {seasons.length === 1 ? t('common.season') : t('common.seasons')}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => navigate(`/admin/leagues/${league.id}`)}
                        className="px-3 py-1 text-sm bg-purple-100 text-purple-700 rounded hover:bg-purple-200"
                      >
                        {t('common.view')}
                      </button>
                      <button
                        onClick={() => toggleActive(league)}
                        className="px-3 py-1 text-sm bg-green-100 text-green-700 rounded hover:bg-green-200"
                        title={t('leagues.restoreLeague')}
                      >
                        📤 {t('leagues.restoreLeague')}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
