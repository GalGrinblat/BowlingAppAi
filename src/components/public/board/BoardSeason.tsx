import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { boardApi } from '../../../services/api/boardApi';
import { LoadingSpinner } from '../../common/LoadingSpinner';
import { useSeasonStandings } from '../../../hooks/useSeasonStandings';
import { useTranslation } from '../../../contexts/LanguageContext';
import { useDateFormat } from '../../../hooks/useDateFormat';
import { TeamStandingsTable } from '../../admin/config/TeamStandingsTable';
import { PlayerStandingsTable } from '../../admin/config/PlayerStandingsTable';
import { ChampionBanner } from '../../admin/season/ChampionBanner';
import { SeasonProgressBar } from '../../admin/season/SeasonProgressBar';
import { ViewTabs } from '../../admin/season/ViewTabs';
import { ScheduleView } from '../../admin/season/ScheduleView';
import { HeadToHeadView } from '../../admin/season/HeadToHeadView';
import { SeasonRecordsView } from '../../admin/season/SeasonRecordsView';
import type { Season, League, Team, Game } from '../../../types/index';
import type { StandingsFilter } from '../../../hooks/useSeasonStandings';

export const BoardSeason: React.FC = () => {
  const navigate = useNavigate();
  const { seasonId } = useParams<{ seasonId: string }>();
  const { t, direction } = useTranslation();
  const { formatDate } = useDateFormat();

  const [season, setSeason] = useState<Season | null>(null);
  const [league, setLeague] = useState<League | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [games, setGames] = useState<Game[]>([]);
  const [view, setView] = useState('schedule');
  const [selectedRound, setSelectedRound] = useState(1);
  const [selectedMatchDay, setSelectedMatchDay] = useState<number | null>(null);
  const [standingsFilter, setStandingsFilter] = useState<StandingsFilter | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!seasonId) return;
    let cancelled = false;

    const load = async () => {
      const seasonData = await boardApi.getSeasonById(seasonId);
      if (!seasonData || cancelled) return;
      setSeason(seasonData);

      const [leagueData, teamsData, gamesData] = await Promise.all([
        boardApi.getLeagueById(seasonData.leagueId),
        boardApi.getTeamsBySeason(seasonId),
        boardApi.getGamesBySeason(seasonId),
      ]);

      if (cancelled) return;
      setLeague(leagueData);
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

      setIsLoading(false);
    };

    load();
    return () => { cancelled = true; };
  }, [seasonId]);

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

  // ── Derived display values ────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <LoadingSpinner />
      </div>
    );
  }

  if (!season || !league) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-8 text-center text-gray-500">
        {t('common.loading')}
      </div>
    );
  }

  const totalGames = games.length;
  const completedGames = games.filter(g => g.status === 'completed').length;
  const progressPercent = totalGames > 0 ? (completedGames / totalGames) * 100 : 0;
  const isCompleted = season.status === 'completed';
  const champion = isCompleted && teamStandings.length > 0 ? teamStandings[0] : null;

  const hasMultipleRounds = season.seasonConfigurations.numberOfRounds > 1;
  const getMatchDayLabel = (round: number, matchDay: number) =>
    hasMultipleRounds
      ? t('seasons.afterRoundMatchDay').replace('{{round}}', String(round)).replace('{{matchDay}}', String(matchDay))
      : t('seasons.afterMatchDay').replace('{{matchDay}}', String(matchDay));
  const getStandingsTitle = (base: string) =>
    standingsFilter ? `${base} – ${getMatchDayLabel(standingsFilter.round, standingsFilter.matchDay)}` : base;

  return (
    <div className="space-y-6">
      {/* Navigation */}
      <div className="flex items-center gap-2 text-sm">
        <Link to="/board" className="text-blue-600 hover:text-blue-700 font-semibold">
          {t('board.allLeagues')}
        </Link>
        <span className="text-gray-400">›</span>
        <Link to={`/board/leagues/${league.id}`} className="text-blue-600 hover:text-blue-700 font-semibold">
          {league.name}
        </Link>
        <span className="text-gray-400">›</span>
        <span className="text-gray-600">{season.name}</span>
      </div>

      {/* Season header */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-2xl font-bold text-gray-800">{season.name}</h2>
              {season.status === 'active' && (
                <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs font-semibold">
                  {t('board.activeSeason')}
                </span>
              )}
            </div>
            <p className="text-gray-500 text-sm mt-1">
              {league.name} · {formatDate(season.startDate)} – {formatDate(season.endDate)}
            </p>
            {season.updatedAt && (
              <p className="text-gray-400 text-xs mt-1">
                {t('board.lastUpdated').replace('{{date}}', formatDate(season.updatedAt))}
              </p>
            )}
          </div>
          <div className="text-sm text-gray-500">
            {t('seasons.gamesComplete').replace('{{completed}}', String(completedGames)).replace('{{total}}', String(totalGames))}
          </div>
        </div>
      </div>

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
          onViewGame={(gameId) => navigate(`/board/games/${gameId}`)}
          readOnly
        />
      )}

      {view === 'teamStandings' && (
        <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6">
          <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
            <h2 className="text-xl font-bold text-gray-800">{getStandingsTitle(t('seasons.teamStandings'))}</h2>
            {completedMatchDayEvents.length > 0 && (
              <select
                value={standingsFilter ? `${standingsFilter.round}-${standingsFilter.matchDay}` : ''}
                onChange={(e) => {
                  if (!e.target.value) {
                    setStandingsFilter(null);
                  } else {
                    const [roundStr, matchDayStr] = e.target.value.split('-');
                    setStandingsFilter({ round: Number(roundStr), matchDay: Number(matchDayStr) });
                  }
                }}
                className="px-3 py-1 border border-gray-300 rounded-lg text-sm"
              >
                <option value="">{t('seasons.currentStandings')}</option>
                {completedMatchDayEvents.map(({ round, matchDay }) => (
                  <option key={`${round}-${matchDay}`} value={`${round}-${matchDay}`}>
                    {getMatchDayLabel(round, matchDay)}
                  </option>
                ))}
              </select>
            )}
          </div>
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
            <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
              <h2 className="text-xl font-bold text-gray-800">{getStandingsTitle(t('seasons.playerStandings'))}</h2>
              {completedMatchDayEvents.length > 0 && (
                <select
                  value={standingsFilter ? `${standingsFilter.round}-${standingsFilter.matchDay}` : ''}
                  onChange={(e) => {
                    if (!e.target.value) {
                      setStandingsFilter(null);
                    } else {
                      const [roundStr, matchDayStr] = e.target.value.split('-');
                      setStandingsFilter({ round: Number(roundStr), matchDay: Number(matchDayStr) });
                    }
                  }}
                  className="px-3 py-1 border border-gray-300 rounded-lg text-sm"
                >
                  <option value="">{t('seasons.currentStandings')}</option>
                  {completedMatchDayEvents.map(({ round, matchDay }) => (
                    <option key={`${round}-${matchDay}`} value={`${round}-${matchDay}`}>
                      {getMatchDayLabel(round, matchDay)}
                    </option>
                  ))}
                </select>
              )}
            </div>
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
    </div>
  );
};
