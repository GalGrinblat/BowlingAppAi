import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { leaguesApi, seasonsApi, teamsApi } from '../../../services/api';
import { calculateTeamStandings } from '../../../utils/standingsUtils';
import { useTranslation } from '../../../contexts/LanguageContext';
import { useDateFormat } from '../../../hooks/useDateFormat';
import { exportLeague, downloadExportFile, readImportFile, importLeagueOrSeason } from '../../../utils/leagueImportExportUtils';
import { useAdminData } from '../../../contexts/AdminDataContext';
import { NavButton } from '../../common/nav/NavButton';
import { BackButton } from '../../common/BackButton';
import { PageHeader } from '../../common/PageHeader';

import type { League, Season, Team, TeamStanding } from '../../../types/index';

const LeagueDetailSkeleton: React.FC = () => (
  <div className="space-y-6 animate-pulse">
    <div className="bg-white rounded-xl shadow-md p-6">
      <div className="flex items-center gap-4 mb-4">
        <div className="h-9 w-9 bg-gray-200 rounded-lg" />
        <div className="h-8 bg-gray-200 rounded w-48" />
      </div>
      <div className="flex flex-wrap gap-3 mt-3">
        <div className="h-4 bg-gray-100 rounded w-24" />
        <div className="h-4 bg-gray-100 rounded w-20" />
        <div className="h-4 bg-gray-100 rounded w-28" />
      </div>
    </div>
    <div className="bg-gray-200 rounded-xl h-28" />
    <div className="bg-white rounded-xl shadow-md p-6">
      <div className="h-6 bg-gray-200 rounded w-40 mb-4" />
      <div className="space-y-3">
        <div className="h-20 bg-gray-100 rounded-lg" />
        <div className="h-20 bg-gray-100 rounded-lg" />
      </div>
    </div>
  </div>
);

export const LeagueDetail: React.FC = () => {
  const navigate = useNavigate();
  const { leagueId } = useParams<{ leagueId: string }>();
  const { loadDashboardData, leagues, gamesMap, isLoadingData } = useAdminData();
  const { t } = useTranslation();
  const { formatDate } = useDateFormat();
  const [league, setLeague] = useState<League | null>(null);
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [seasonStandings, setSeasonStandings] = useState<Record<string, TeamStanding[]>>({});
  const [seasonTeams, setSeasonTeams] = useState<Record<string, Team[]>>({});
  const [standingsLoading, setStandingsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // League data is always fresh in context — LeagueManagement refreshes context after every mutation.
  // Use it for instant header render before the API fetch returns.
  const contextLeague = leagues.find(l => l.id === leagueId) ?? null;
  const displayLeague = league ?? contextLeague;

  const loadLeagueData = async () => {
    const [leagueData, seasonsData] = await Promise.all([
      leaguesApi.getById(leagueId!),
      seasonsApi.getByLeague(leagueId!),
    ]);
    if (!leagueData) return;
    setLeague(leagueData);
    const sorted = seasonsData.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    setSeasons(sorted);

    const completedSeasons = sorted.filter(s => s.status === 'completed');
    if (completedSeasons.length === 0) return;

    setStandingsLoading(true);
    const seasonResults = await Promise.all(
      completedSeasons.map(async season => {
        const teams = await teamsApi.getBySeason(season.id);
        // gamesMap from context is reliable for completed seasons — their game data is final
        const games = gamesMap[season.id] ?? [];
        return { seasonId: season.id, teams, standings: calculateTeamStandings(teams, games) };
      })
    );

    const standingsData: Record<string, TeamStanding[]> = {};
    const teamsData: Record<string, Team[]> = {};
    for (const r of seasonResults) {
      standingsData[r.seasonId] = r.standings;
      teamsData[r.seasonId] = r.teams;
    }
    setSeasonStandings(standingsData);
    setSeasonTeams(teamsData);
    setStandingsLoading(false);
  };

  useEffect(() => {
    setLeague(null);
    setSeasons([]);
    setSeasonStandings({});
    setSeasonTeams({});
    setStandingsLoading(false);
    // Wait for context to finish loading so gamesMap is populated before computing standings
    if (leagueId && !isLoadingData) {
      loadLeagueData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leagueId, isLoadingData]);

  const activeSeason = seasons.find(s => s.status === 'active');
  const completedSeasons = seasons.filter(s => s.status === 'completed');

  const handleExportLeague = async () => {
    const exportData = await exportLeague(leagueId!);
    if (exportData) {
      const filename = `${displayLeague?.name.replace(/[^a-z0-9]/gi, '_')}_${new Date().toISOString().split('T')[0]}.json`;
      downloadExportFile(exportData, filename);
      alert(t('leagues.exportSuccess'));
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleImportFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const importData = await readImportFile(file);
      const result = await importLeagueOrSeason(importData);

      if (result.success) {
        alert(t('leagues.importSuccess'));
        await loadDashboardData();
        // useEffect re-runs loadLeagueData automatically when isLoadingData transitions false
      } else {
        alert(`${t('leagues.importError')}: ${result.error}`);
      }
    } catch (error) {
      alert(`${t('leagues.importError')}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Show skeleton while context hasn't loaded yet (direct URL navigation or app startup)
  const isInitializing = isLoadingData || (leagues.length === 0 && !displayLeague);
  if (isInitializing) {
    return <LeagueDetailSkeleton />;
  }

  if (!displayLeague) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center gap-4 mb-6">
          <BackButton label={t('leagues.backToLeagues')} onClick={() => navigate('/admin/leagues')} />
        </div>
        <div className="text-center py-12">
          <p className="text-gray-500">{t('leagues.leagueNotFound')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title={displayLeague.name}
        subtitle={displayLeague.description}
        back={{ label: t('leagues.backToLeagues'), onClick: () => navigate('/admin/leagues') }}
        actions={<>
          <button onClick={() => navigate(`/admin/leagues/${leagueId}/seasons/new`)} className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold text-sm whitespace-nowrap">
            + <span className="hidden sm:inline">{t('seasons.createSeason')}</span><span className="sm:hidden">{t('common.season')}</span>
          </button>
          <button onClick={handleExportLeague} className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold text-sm whitespace-nowrap" title={t('leagues.exportLeagueDesc')}>
            📥 <span className="hidden sm:inline">{t('leagues.exportLeague')}</span>
          </button>
          <button onClick={handleImportClick} className="px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-semibold text-sm whitespace-nowrap" title={t('leagues.importLeagueDesc')}>
            📤 <span className="hidden sm:inline">{t('leagues.importLeague')}</span>
          </button>
          <input ref={fileInputRef} type="file" accept=".json" onChange={handleImportFile} className="hidden" />
        </>}
      >
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-600 mt-3">
          {displayLeague.dayOfWeek && <span>📅 {t(`days.${displayLeague.dayOfWeek.toLowerCase()}Plural`)}</span>}
          <span>👥 <span className="ltr-content">{displayLeague.defaultSeasonConfigurations.playersPerTeam}</span> {t('common.playersPerTeam')}</span>
          <span>🎳 <span className="ltr-content">{displayLeague.defaultSeasonConfigurations.matchesPerGame || 3}</span> {t('leagues.matchesPerGame')}</span>
          {displayLeague.defaultSeasonConfigurations.useHandicap && <span>⚖️ {t('leagues.handicapDisplay').replace('{{percentage}}', String(displayLeague.defaultSeasonConfigurations.handicapPercentage || 100)).replace('{{basis}}', String(displayLeague.defaultSeasonConfigurations.handicapBasis))}</span>}
        </div>
      </PageHeader>

      {/* Active Season */}
      {activeSeason && (
        <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-xl shadow-lg p-6 text-white">
          <div className="flex justify-between items-start">
            <div>
              <div className="text-sm font-semibold mb-1">{t('common.active').toUpperCase()}</div>
              <h2 className="text-2xl font-bold mb-2">{activeSeason.name}</h2>
              <div className="flex gap-4 text-sm">
                <span>🏆 <span className="ltr-content">{activeSeason.seasonConfigurations.numberOfTeams}</span> {t('leagues.teams')}</span>
                <span>🔄 <span className="ltr-content">{activeSeason.seasonConfigurations.numberOfRounds}</span> {activeSeason.seasonConfigurations.numberOfRounds !== 1 ? t('leagues.rounds') : t('common.round')}</span>
                <span>👥 <span className="ltr-content">{activeSeason.seasonConfigurations.playersPerTeam}</span> {t('common.playersPerTeam')}</span>
              </div>
            </div>
            <NavButton direction="forward" label={t('seasons.viewSeason')} onClick={() => navigate(`/admin/seasons/${activeSeason.id}`)} className="px-4 py-2 bg-white text-green-600 rounded-lg hover:bg-green-50 font-semibold" />
          </div>
        </div>
      )}

      {/* Completed Seasons */}
      {completedSeasons.length > 0 && (
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">{t('seasons.seasonArchives')}</h2>
          <div className="space-y-3">
            {completedSeasons.map(season => {
              const standings = seasonStandings[season.id] || [];
              const champion = standings[0];
              const teams = seasonTeams[season.id] || [];
              const gamesCount = gamesMap[season.id]?.length ?? 0;
              const isLoadingStandings = standingsLoading && !seasonStandings[season.id];

              return (
                <div
                  key={season.id}
                  className="border border-gray-200 rounded-lg p-4 hover:border-purple-300 transition-colors cursor-pointer"
                  onClick={() => navigate(`/admin/seasons/${season.id}`)}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-800">{season.name}</h3>
                        <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-semibold">
                          {t('common.completed').toUpperCase()}
                        </span>
                      </div>
                      {isLoadingStandings ? (
                        <div className="h-5 bg-gray-100 rounded w-48 mb-2 animate-pulse" />
                      ) : champion ? (
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-yellow-500 text-xl">🏆</span>
                          <span className="font-semibold text-purple-600">{champion.teamName}</span>
                          <span className="text-sm text-gray-500">• {champion.points} points</span>
                        </div>
                      ) : null}
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-600">
                        {isLoadingStandings ? (
                          <div className="h-4 bg-gray-100 rounded w-40 animate-pulse" />
                        ) : (
                          <>
                            <span>👥 <span className="ltr-content">{teams.length}</span> {t('leagues.teams')}</span>
                            <span>🎳 <span className="ltr-content">{gamesCount}</span> {t('leagues.games')}</span>
                          </>
                        )}
                        <span>📅 <span className="ltr-content">{formatDate(season.startDate)}</span></span>
                        {season.updatedAt && (
                          <span>✓ {formatDate(season.updatedAt)}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {seasons.length === 0 && league !== null && (
        <div className="bg-white rounded-xl shadow-lg p-12 text-center">
          <div className="text-6xl mb-4">🏆</div>
          <h3 className="text-xl font-semibold text-gray-800 mb-2">{t('seasons.noSeasonsYet')}</h3>
          <p className="text-gray-600 mb-6">{t('seasons.createFirstSeason')}</p>
        </div>
      )}
    </div>
  );
};
