import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { seasonsApi, teamsApi, gamesApi, leaguesApi } from '../../../services/api';
import { useSeasonStandings } from '../../../hooks/useSeasonStandings';
import { postponeMatchDay } from '../../../utils/scheduleUtils';
import { useTranslation } from '../../../contexts/LanguageContext';
import { exportSeason, downloadExportFile, readImportFile, importLeagueOrSeason } from '../../../utils/leagueImportExportUtils';
import { PrintMatchDayOptions } from '../print/PrintMatchDayOptions';
import { PrintTeamStandings } from '../print/PrintTeamStandings';
import { PrintPlayerStandings } from '../print/PrintPlayerStandings';
import { TeamStandingsTable } from '../config/TeamStandingsTable';
import { PlayerStandingsTable } from '../config/PlayerStandingsTable';
import { SeasonHeader } from './SeasonHeader';
import { ChampionBanner } from './ChampionBanner';
import { SeasonProgressBar } from './SeasonProgressBar';
import { ViewTabs } from './ViewTabs';
import { ScheduleView } from './ScheduleView';
import { HeadToHeadView } from './HeadToHeadView';
import { SeasonRecordsView } from './SeasonRecordsView';
import { PostponeModal } from './PostponeModal';
import { StandingsFilterControls } from './StandingsFilterControls';

import { useToast } from '../../../contexts/ToastContext';
import type { Season, League, Team, Game } from '../../../types/index';
import type { StandingsFilter } from '../../../hooks/useSeasonStandings';

export const SeasonDetail: React.FC = () => {
  const navigate = useNavigate();
  const { seasonId } = useParams<{ seasonId: string }>();
  const { t, direction } = useTranslation();
  const { showToast } = useToast();
  const [season, setSeason] = useState<Season | null>(null);
  const [league, setLeague] = useState<League | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [games, setGames] = useState<Game[]>([]);
  const [view, setView] = useState('schedule');
  const [selectedRound, setSelectedRound] = useState(1);
  const [selectedMatchDay, setSelectedMatchDay] = useState<number | null>(null);
  const [standingsFilter, setStandingsFilter] = useState<StandingsFilter | null>(null);
  const [showPostponeModal, setShowPostponeModal] = useState(false);
  const [showPrintOptionsModal, setShowPrintOptionsModal] = useState(false);
  const [showPrintTeamStandings, setShowPrintTeamStandings] = useState(false);
  const [showPrintPlayerStandings, setShowPrintPlayerStandings] = useState(false);
  const [postponeWeeks, setPostponeWeeks] = useState(1);

  const loadSeasonData = async () => {
    const seasonData = await seasonsApi.getById(seasonId!);
    setSeason(seasonData ?? null);
    if (!seasonData) return;

    const [leagueData, teamsData, gamesData] = await Promise.all([
      leaguesApi.getById(seasonData.leagueId),
      teamsApi.getBySeason(seasonId!),
      gamesApi.getBySeason(seasonId!),
    ]);
    setLeague(leagueData ?? null);
    setTeams(teamsData);
    setGames(gamesData);

    if (gamesData.length > 0) {
      const incompleteGame = gamesData.find(g => g.status !== 'completed');
      if (incompleteGame) {
        setSelectedRound(incompleteGame.round);
        setSelectedMatchDay(incompleteGame.matchDay);
      } else {
        const maxRound = Math.max(...gamesData.map(g => g.round));
        const maxMatchDay = Math.max(...gamesData.filter(g => g.round === maxRound).map(g => g.matchDay));
        setSelectedRound(maxRound);
        setSelectedMatchDay(maxMatchDay);
      }
    }
  };

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      await loadSeasonData();
      if (cancelled) return;
    };
    load();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seasonId]);

  const handleCompleteSeason = async () => {
    const incompleteGames = games.filter(g => g.status !== 'completed');
    if (incompleteGames.length > 0) {
      showToast(t('seasons.cannotCompleteIncomplete').replace('{{count}}', String(incompleteGames.length)), 'error');
      return;
    }
    if (confirm(t('seasons.confirmComplete'))) {
      await seasonsApi.update(seasonId!, { status: 'completed' });
      await loadSeasonData();
    }
  };

  const handlePostponeMatchDay = async () => {
    if (!league?.dayOfWeek) {
      showToast(t('seasons.cannotPostponeNoDay'), 'error');
      return;
    }
    const matchDayGamesToCheck = games.filter(g => g.matchDay === selectedMatchDay);
    if (matchDayGamesToCheck.some(g => g.status === 'completed')) {
      showToast(t('seasons.cannotPostponeCompleted'), 'error');
      return;
    }
    if (confirm(t('seasons.confirmPostpone').replace('{{matchDay}}', String(selectedMatchDay)).replace('{{weeks}}', String(postponeWeeks)))) {
      const updatedSchedule = postponeMatchDay(season?.schedule ?? [], selectedMatchDay ?? 1, postponeWeeks, league?.dayOfWeek ?? '');
      await seasonsApi.update(seasonId!, { schedule: updatedSchedule });
      for (const daySchedule of updatedSchedule) {
        const gamesToUpdate = games.filter(g => g.matchDay === daySchedule.matchDay);
        for (const game of gamesToUpdate) {
          await gamesApi.update(game.id, {
            scheduledDate: daySchedule.date,
            postponed: daySchedule.postponed,
            originalDate: daySchedule.originalDate
          });
        }
      }
      setShowPostponeModal(false);
      setPostponeWeeks(1);
      await loadSeasonData();
    }
  };

  const handleExportSeason = async () => {
    const exportData = await exportSeason(seasonId!);
    if (exportData && season) {
      const filename = `${season.name.replace(/[^a-z0-9]/gi, '_')}_${new Date().toISOString().split('T')[0]}.json`;
      downloadExportFile(exportData, filename);
      showToast(t('seasons.exportSuccess'), 'success');
    }
  };

  const handleImportFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const importData = await readImportFile(file);
      const result = await importLeagueOrSeason(importData);
      if (result.success) {
        showToast(t('seasons.importSuccess'), 'success');
        navigate(0);
      } else {
        showToast(`${t('seasons.importError')}: ${result.error}`, 'error');
      }
    } catch (error) {
      showToast(`${t('seasons.importError')}: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
    }
    if (event.target) event.target.value = '';
  };

  const {
    teamStandings,
    seasonRecords,
    previousTeamRanks,
    lastMatchdayTeamResults,
    previousPlayerRanks,
    lastMatchdayPlayerPins,
    teamCompletedGameCount,
    completedMatchDayEvents,
    filteredTeamStandings,
    filteredPlayerStats,
  } = useSeasonStandings(teams, games, standingsFilter);

  const totalGames = games.length;
  const completedGames = games.filter(g => g.status === 'completed').length;
  const progressPercent = totalGames > 0 ? (completedGames / totalGames) * 100 : 0;
  const isCompleted = season?.status === 'completed';
  const champion = isCompleted && teamStandings.length > 0 ? teamStandings[0] : null;

  if (!season || !league) return <div>{t('common.loading')}</div>;

  const hasMultipleRounds = season.seasonConfigurations.numberOfRounds > 1;
  const getMatchDayLabel = (round: number, matchDay: number) =>
    hasMultipleRounds
      ? t('seasons.afterRoundMatchDay').replace('{{round}}', String(round)).replace('{{matchDay}}', String(matchDay))
      : t('seasons.afterMatchDay').replace('{{matchDay}}', String(matchDay));
  const getStandingsTitle = (base: string) =>
    standingsFilter ? `${base} – ${getMatchDayLabel(standingsFilter.round, standingsFilter.matchDay)}` : base;

  return (
    <div className="space-y-6">
      <SeasonHeader
        season={season}
        league={league}
        teams={teams}
        completedGames={completedGames}
        totalGames={totalGames}
        selectedRound={selectedRound}
        onBack={() => navigate(`/admin/leagues/${season.leagueId}`)}
        onManageTeams={() => navigate(`/admin/seasons/${seasonId}/teams`)}
        onExportSeason={handleExportSeason}
        onImportFile={handleImportFile}
        onCompleteSeason={handleCompleteSeason}
      />

      {champion && <ChampionBanner champion={champion} />}

      <SeasonProgressBar progressPercent={progressPercent} />

      {isCompleted && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl">📚</span>
            <div>
              <p className="font-semibold text-blue-800">{t('seasons.seasonArchive')}</p>
              <p className="text-sm text-blue-600">{t('seasons.seasonArchiveDesc')}</p>
            </div>
          </div>
        </div>
      )}

      <ViewTabs view={view} isCompleted={isCompleted} onViewChange={setView} />

      {view === 'schedule' && (
        <ScheduleView
          season={season}
          teams={teams}
          games={games}
          selectedRound={selectedRound}
          selectedMatchDay={selectedMatchDay}
          onRoundChange={setSelectedRound}
          onMatchDayChange={setSelectedMatchDay}
          onShowPrintOptions={() => setShowPrintOptionsModal(true)}
          onShowPostpone={() => setShowPostponeModal(true)}
          onPlayGame={(gameId) => navigate(`/admin/games/${gameId}/play`)}
          onViewGame={(gameId, game) => navigate(`/admin/games/${gameId}`, { state: { game } })}
        />
      )}

      {view === 'teamStandings' && (
        <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6">
          <StandingsFilterControls
            title={getStandingsTitle(t('seasons.teamStandings'))}
            standingsFilter={standingsFilter}
            setStandingsFilter={setStandingsFilter}
            completedMatchDayEvents={completedMatchDayEvents}
            getMatchDayLabel={getMatchDayLabel}
            onPrint={() => setShowPrintTeamStandings(true)}
          />
          <div className="overflow-x-auto -mx-4 sm:mx-0">
            <TeamStandingsTable
              standings={filteredTeamStandings}
              direction={direction}
              t={t}
              previousRanks={standingsFilter ? new Map() : previousTeamRanks}
              lastResults={standingsFilter ? new Map() : lastMatchdayTeamResults}
            />
          </div>
        </div>
      )}

      {view === 'h2h' && <HeadToHeadView teams={teams} games={games} />}

      {view === 'records' && (
        <SeasonRecordsView
          seasonRecords={seasonRecords}
          hasCompletedGames={completedGames > 0}
        />
      )}

      {view === 'playerStandings' && (
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="p-4 sm:p-6">
            <StandingsFilterControls
              title={getStandingsTitle(t('seasons.playerStandings'))}
              standingsFilter={standingsFilter}
              setStandingsFilter={setStandingsFilter}
              completedMatchDayEvents={completedMatchDayEvents}
              getMatchDayLabel={getMatchDayLabel}
              onPrint={() => setShowPrintPlayerStandings(true)}
            />
            <div className="overflow-x-auto -mx-4 sm:mx-0">
              <PlayerStandingsTable
                playerStats={filteredPlayerStats}
                direction={direction}
                t={t}
                previousRanks={standingsFilter ? new Map() : previousPlayerRanks}
                lastMatchdayPins={standingsFilter ? new Map() : lastMatchdayPlayerPins}
                teamCompletedGameCount={teamCompletedGameCount}
              />
            </div>
          </div>
        </div>
      )}

      {showPrintOptionsModal && selectedMatchDay && (
        <PrintMatchDayOptions seasonId={seasonId!} matchDay={selectedMatchDay} onClose={() => setShowPrintOptionsModal(false)} />
      )}
      {showPrintTeamStandings && (
        <PrintTeamStandings seasonId={seasonId!} onClose={() => setShowPrintTeamStandings(false)} />
      )}
      {showPrintPlayerStandings && (
        <PrintPlayerStandings seasonId={seasonId!} onClose={() => setShowPrintPlayerStandings(false)} />
      )}

      {showPostponeModal && (
        <PostponeModal
          selectedMatchDay={selectedMatchDay}
          schedule={season.schedule}
          postponeWeeks={postponeWeeks}
          onPostponeWeeksChange={setPostponeWeeks}
          onConfirm={handlePostponeMatchDay}
          onCancel={() => { setShowPostponeModal(false); setPostponeWeeks(1); }}
        />
      )}
    </div>
  );
};
