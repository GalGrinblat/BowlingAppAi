import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { playersApi } from '../../services/api/players';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { EmptyState } from '../common/EmptyState';
import { leaguesApi } from '../../services/api/leagues';
import { seasonsApi } from '../../services/api/seasons';
import { teamsApi } from '../../services/api/teams';
import { gamesApi } from '../../services/api/games';
import { logger } from '../../utils/logger';
import { useTranslation } from '../../contexts/LanguageContext';
import { useDateFormat } from '../../hooks/useDateFormat';
import { useNavLabel } from '../../hooks/useNavLabel';
import { NavLink } from '../common/nav/NavLink';
import { getPlayerDisplayName } from '../../utils/playerUtils';
import { useAuth } from '../../contexts/AuthContext';

import type { Game, GameMatch, League, Player, PlayerStats, Season, Team } from '../../types/index';

export const PlayerDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { playerData, isLoading: authIsLoading, session } = useAuth();
  const playerId = playerData?.id ?? '';
  const { t } = useTranslation();
  const { formatDate } = useDateFormat();
  const { forward } = useNavLabel();
  const [player, setPlayer] = useState<Player | null>(null);
  const [playerLeagues, setPlayerLeagues] = useState<League[]>([]);
  const [recentCompletedGames, setRecentCompletedGames] = useState<Game[]>([]);
  const [searchParams, setSearchParams] = useSearchParams();
  const view = searchParams.get('view') ?? 'dashboard';
  const [playerStats, setPlayerStats] = useState<PlayerStats | null>(null);
  const [gameDetailsMap, setGameDetailsMap] = useState<Record<string, { season: Season | null, league: League | null, team1: Team | undefined, team2: Team | undefined }>>({});
  const [nextGame, setNextGame] = useState<Game | null>(null);
  const [nextGameDetails, setNextGameDetails] = useState<{ season: Season | null, league: League | null, team1: Team | undefined, team2: Team | undefined } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      if (!playerId) { setIsLoading(false); return; }
      setIsLoading(true);
      setLoadError(null);
      try {
        const playerResult = await playersApi.getById(playerId);
        if (cancelled) return;
        setPlayer(playerResult ?? null);

        // Find all teams this player is on — build a lookup Map for O(1) access later
        const allTeams = await teamsApi.getAll();
        if (cancelled) return;
        const teamsById = new Map(allTeams.map(t => [t.id, t]));
        const playerTeams = allTeams.filter(team => team.playerIds.includes(playerId));

        // Get unique seasons the player is in
        const seasonIds = [...new Set(playerTeams.map(t => t.seasonId))];
        const seasons = await Promise.all(seasonIds.map(id => seasonsApi.getById(id)));
        if (cancelled) return;
        const validSeasons = seasons.filter(Boolean);

        // Get leagues for those seasons
        const leagueIds = [...new Set(validSeasons.filter((s): s is Season => s !== undefined).map(s => s.leagueId))];
        const leaguesData = await Promise.all(leagueIds.map(id => leaguesApi.getById(id)));
        if (cancelled) return;
        const leagues = leaguesData
          .filter((league): league is League => !!league && typeof league.id === 'string')
          .map(league => {
            const leagueSeasons = validSeasons.filter((s): s is Season => s !== undefined && s.leagueId === league.id);
            const activeSeasons = leagueSeasons.filter((s: Season) => s.status === 'active');
            return {
              ...league,
              seasons: leagueSeasons,
              activeSeasons,
              playerTeams: playerTeams.filter(t =>
                leagueSeasons.some((s: Season) => s.id === t.seasonId)
              )
            };
          });
        setPlayerLeagues(leagues);

        // Build lookup maps for record context (no extra API calls — reuse already-fetched data)
        const seasonsById = new Map(
          validSeasons.filter((s): s is Season => s !== undefined).map(s => [s.id, s])
        );
        const leaguesById = new Map(
          leaguesData.filter((l): l is League => !!l).map(l => [l.id, l])
        );

        // Get recent completed games
        const allGames = await gamesApi.getAll();
        if (cancelled) return;
        const completedPlayerGames = allGames.filter(game => {
          const team1 = teamsById.get(game.team1Id);
          const team2 = teamsById.get(game.team2Id);
          return (team1?.playerIds.includes(playerId) || team2?.playerIds.includes(playerId))
            && game.status === 'completed';
        });

        // Sort by completion date (most recent first)
        const sortedCompletedGames = completedPlayerGames.sort((a, b) => {
          const dateA = new Date(a.completedAt || a.updatedAt || 0);
          const dateB = new Date(b.completedAt || b.updatedAt || 0);
          return dateB.getTime() - dateA.getTime();
        });
        const topGames = sortedCompletedGames.slice(0, 5);
        setRecentCompletedGames(topGames);

        // Find the next upcoming/pending game for this player (earliest scheduled date)
        const upcomingPlayerGames = allGames.filter(game => {
          if (game.status === 'completed' || game.postponed) return false;
          const team1 = teamsById.get(game.team1Id);
          const team2 = teamsById.get(game.team2Id);
          return team1?.playerIds.includes(playerId) || team2?.playerIds.includes(playerId);
        }).sort((a, b) => {
          const dateA = new Date(a.scheduledDate || 0).getTime();
          const dateB = new Date(b.scheduledDate || 0).getTime();
          return dateA - dateB;
        });
        const foundNextGame = upcomingPlayerGames[0] ?? null;
        setNextGame(foundNextGame);

        if (foundNextGame) {
          const nextSeason = await seasonsApi.getById(foundNextGame.seasonId);
          const nextLeague = nextSeason ? await leaguesApi.getById(nextSeason.leagueId) : null;
          if (!cancelled) {
            setNextGameDetails({
              season: nextSeason ?? null,
              league: nextLeague ?? null,
              team1: teamsById.get(foundNextGame.team1Id),
              team2: teamsById.get(foundNextGame.team2Id),
            });
          }
        }

        // Preload game details for rendering — parallel fetches
        const detailEntries = await Promise.all(
          topGames.map(async game => {
            const season = await seasonsApi.getById(game.seasonId);
            const league = season ? await leaguesApi.getById(season.leagueId) : null;
            return [game.id, {
              season: season ?? null,
              league: league ?? null,
              team1: teamsById.get(game.team1Id),
              team2: teamsById.get(game.team2Id),
            }] as const;
          })
        );
        if (cancelled) return;
        setGameDetailsMap(Object.fromEntries(detailEntries));

        // Calculate player statistics across all games — synchronous, no API calls
        const stats = computePlayerStats(allGames, teamsById, seasonsById, leaguesById, playerResult);
        if (cancelled) return;
        setPlayerStats(stats);
      } catch (error) {
        if (!cancelled) {
          logger.error('Failed to load player data:', error);
          setLoadError('Failed to load player data');
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    load();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playerId]);

  const computePlayerStats = (
    allGames: Game[],
    teamsById: Map<string, Team>,
    seasonsById: Map<string, Season>,
    leaguesById: Map<string, League>,
    playerResult: Player | undefined
  ): PlayerStats => {
    const stats: PlayerStats = {
      playerId: playerId,
      playerName: playerResult ? getPlayerDisplayName(playerResult) : '',
      gamesPlayed: 0,
      totalPins: 0,
      average: 0,
      highGame: 0,
      highSeries: 0,
      highSeriesByCount: {},
      seriesCount: 0,
      pointsScored: 0,
    };

    const completedGames = allGames.filter((g: Game) => g.status === 'completed');

    for (const game of completedGames) {
      const team1 = teamsById.get(game.team1Id);
      const team2 = teamsById.get(game.team2Id);
      const isOnTeam1 = team1?.playerIds.includes(playerId);
      const isOnTeam2 = team2?.playerIds.includes(playerId);
      if (!isOnTeam1 && !isOnTeam2) continue;
      const playerIndex = (isOnTeam1 ? team1 : team2)?.playerIds.indexOf(playerId);
      if (playerIndex === undefined || playerIndex === -1) continue;

      let seriesPins = 0;
      let playedMatch = false;

      if (game.matches) {
        game.matches.forEach((match: GameMatch) => {
          const teamMatch = isOnTeam1 ? match.team1 : match.team2;
          if (teamMatch && teamMatch.players && teamMatch.players[playerIndex]) {
            const playerMatch = teamMatch.players[playerIndex];
            const pins = parseInt(playerMatch.pins) || 0;
            if (playerMatch.pins !== '') {
              stats.gamesPlayed++;
              stats.totalPins += pins;
              seriesPins += pins;
              playedMatch = true;
              if (pins > stats.highGame) {
                stats.highGame = pins;
                const season = seasonsById.get(game.seasonId);
                const league = season ? leaguesById.get(season.leagueId) : undefined;
                stats.highGameContext = {
                  date: game.scheduledDate || game.completedAt || '',
                  leagueName: league?.name ?? '',
                  seasonName: season?.name ?? '',
                  round: game.round,
                  matchDay: game.matchDay,
                };
              }
            }
            if (match.playerMatches && match.playerMatches[playerIndex]) {
              const points = isOnTeam1
                ? match.playerMatches[playerIndex].team1Points
                : match.playerMatches[playerIndex].team2Points;
              stats.pointsScored += points;
            }
          }
        });
      }
      if (playedMatch) {
        if (seriesPins > stats.highSeries) {
          stats.highSeries = seriesPins;
          const season = seasonsById.get(game.seasonId);
          const league = season ? leaguesById.get(season.leagueId) : undefined;
          stats.highSeriesContext = {
            date: game.scheduledDate || game.completedAt || '',
            leagueName: league?.name ?? '',
            seasonName: season?.name ?? '',
            round: game.round,
            matchDay: game.matchDay,
          };
        }

        const seriesLength = game.matchesPerGame;
        const existing = stats.highSeriesByCount[seriesLength];
        if (!existing || seriesPins > existing.pins) {
          const season = seasonsById.get(game.seasonId);
          const league = season ? leaguesById.get(season.leagueId) : undefined;
          stats.highSeriesByCount[seriesLength] = {
            pins: seriesPins,
            context: {
              date: game.scheduledDate || game.completedAt || '',
              leagueName: league?.name ?? '',
              seasonName: season?.name ?? '',
              round: game.round,
              matchDay: game.matchDay,
            },
          };
        }

        stats.seriesCount++;
      }
    }

    if (stats.gamesPlayed > 0) stats.average = stats.totalPins / stats.gamesPlayed;
    return stats;
  };

  const enrichedGames = useMemo(() => {
    // First pass: build pre-game averages by iterating chronologically (oldest first)
    const chronologicalGames = [...recentCompletedGames].reverse();
    const preGameAverages = new Map<string, number>();
    let runningTotalPins = 0;
    let runningMatchCount = 0;

    for (const game of chronologicalGames) {
      const details = gameDetailsMap[game.id];
      if (!details) continue;
      const { team1, team2 } = details;
      const isOnTeam1 = team1?.playerIds.includes(playerId);
      const playerIndex = (isOnTeam1 ? team1 : team2)?.playerIds.indexOf(playerId) ?? -1;

      // Store pre-game average before processing this game
      preGameAverages.set(game.id, runningMatchCount > 0 ? runningTotalPins / runningMatchCount : 0);

      // Accumulate pins for running average
      if (playerIndex !== -1 && game.matches) {
        for (const match of game.matches) {
          const teamMatch = isOnTeam1 ? match.team1 : match.team2;
          const playerMatch = teamMatch?.players?.[playerIndex];
          if (playerMatch && playerMatch.pins !== '') {
            runningTotalPins += parseInt(playerMatch.pins) || 0;
            runningMatchCount++;
          }
        }
      }
    }

    // Second pass: build enriched game data (display order: most recent first)
    return recentCompletedGames.map(game => {
      const details = gameDetailsMap[game.id];
      if (!details) return null;
      const { league, team1, team2 } = details;
      const isTeam1 = team1?.playerIds.includes(playerId);
      const team1TotalPoints = (game.matches?.reduce((sum: number, m: GameMatch) => sum + (m.team1?.points || 0), 0) ?? 0) + (game.grandTotalPoints?.team1 || 0);
      const team2TotalPoints = (game.matches?.reduce((sum: number, m: GameMatch) => sum + (m.team2?.points || 0), 0) ?? 0) + (game.grandTotalPoints?.team2 || 0);
      const playerWon = (isTeam1 && team1TotalPoints > team2TotalPoints) || (!isTeam1 && team2TotalPoints > team1TotalPoints);

      // Extract player-specific stats for this game
      const playerIndex = (isTeam1 ? team1 : team2)?.playerIds.indexOf(playerId) ?? -1;
      const teamSnapshot = isTeam1 ? game.team1 : game.team2;
      const playerGameData = teamSnapshot?.players?.[playerIndex];
      const wasAbsent = playerGameData?.absent ?? false;

      // Get individual match pins and calculate stats
      const matchPins: number[] = [];
      let playerTotalPins = 0;
      let playerMatchPoints = 0;
      let matchWins = 0;
      let matchLosses = 0;
      let matchDraws = 0;

      if (game.matches && playerIndex !== -1) {
        game.matches.forEach((match: GameMatch) => {
          const teamMatch = isTeam1 ? match.team1 : match.team2;
          const playerMatch = teamMatch?.players?.[playerIndex];
          const pins = parseInt(playerMatch?.pins || '0') || 0;
          matchPins.push(pins);
          playerTotalPins += pins;

          // Get match points and determine result
          if (match.playerMatches?.[playerIndex]) {
            const t1Pts = match.playerMatches[playerIndex].team1Points;
            const t2Pts = match.playerMatches[playerIndex].team2Points;
            playerMatchPoints += isTeam1 ? t1Pts : t2Pts;

            if (t1Pts === t2Pts) {
              matchDraws++;
            } else if ((isTeam1 && t1Pts > t2Pts) || (!isTeam1 && t2Pts > t1Pts)) {
              matchWins++;
            } else {
              matchLosses++;
            }
          }
        });
      }

      const matchCount = matchPins.length;
      const gameAverage = matchCount > 0 ? playerTotalPins / matchCount : 0;
      const preGameAverage = preGameAverages.get(game.id) ?? 0;
      const highestPin = Math.max(...matchPins, 0);

      return {
        game,
        league,
        team1,
        team2,
        isTeam1,
        team1TotalPoints,
        team2TotalPoints,
        playerWon,
        // Player stats for this game
        wasAbsent,
        matchPins,
        playerTotalPins,
        gameAverage,
        preGameAverage,
        playerMatchPoints,
        matchWins,
        matchLosses,
        matchDraws,
        highestPin,
      };
    });
  }, [recentCompletedGames, gameDetailsMap, playerId]);

  if (authIsLoading) return (
    <div className="flex items-center justify-center min-h-64">
      <LoadingSpinner color="purple" />
    </div>
  );

  if (!playerData) return (
    <div className="max-w-lg mx-auto mt-16 px-4">
      <div className="bg-gradient-to-r from-amber-400 to-orange-500 rounded-xl shadow-lg p-8 text-white text-center">
        <p className="text-5xl mb-4">🔗</p>
        <h2 className="text-2xl font-bold mb-2">{t('playerDashboard.notLinkedTitle')}</h2>
        <p className="text-amber-100 mb-1">{t('playerDashboard.notLinkedDesc')}</p>
        {session?.user?.email && (
          <p className="text-amber-200 text-sm mb-6">
            {t('playerDashboard.notLinkedSignedInAs')}: <strong>{session.user.email}</strong>
          </p>
        )}
        <a
          href="/board"
          className="inline-block bg-white text-orange-600 font-bold px-6 py-3 rounded-lg hover:bg-orange-50 transition-colors"
        >
          {t('playerDashboard.notLinkedBrowseBoard')}
        </a>
      </div>
    </div>
  );

  if (isLoading) return (
    <div className="flex items-center justify-center min-h-64">
      <LoadingSpinner color="purple" />
    </div>
  );
  if (loadError) return <div className="text-red-600 p-6">{loadError}</div>;
  if (!player) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-500 to-blue-600 rounded-xl shadow-lg p-6 text-white">
        <h1 className="text-3xl font-bold mb-2">{t('playerDashboard.welcome')}, {getPlayerDisplayName(player)}!</h1>
        <p className="text-purple-100">{t('playerDashboard.playerDashboard')}</p>
        <div className="flex gap-4 mt-4 text-sm">
          <span>🎳 {playerLeagues.length} {playerLeagues.length === 1 ? t('playerDashboard.activeLeagues') : t('playerDashboard.activeLeaguesPlural')}</span>
          <span>📊 {recentCompletedGames.length} {recentCompletedGames.length === 1 ? t('playerDashboard.recentGame') : t('playerDashboard.recentGamesPlural')}</span>
        </div>
      </div>

      {/* My Leagues */}
      {playerLeagues.length > 0 && (
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">{t('playerDashboard.myLeagues')}</h2>
          <div className="space-y-3">
            {playerLeagues.map(league => (
              <div key={league.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <p className="font-semibold text-gray-800">{league.name}</p>
                <NavLink
                  direction="forward"
                  label={t('playerDashboard.viewStandings')}
                  to={`/board/leagues/${league.id}`}
                  className="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline whitespace-nowrap"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* View Tabs */}
      <div className="bg-white rounded-xl shadow-lg p-2 flex gap-1 sm:gap-2 overflow-x-auto">
        <button
          onClick={() => setSearchParams({ view: 'dashboard' })}
          className={`flex-1 min-w-[90px] py-2 sm:py-3 px-2 sm:px-4 rounded-lg font-semibold text-xs sm:text-base transition-colors whitespace-nowrap ${
            view === 'dashboard'
              ? 'bg-purple-600 text-white'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          🏠 {t('playerDashboard.dashboard')}
        </button>
        <button
          onClick={() => setSearchParams({ view: 'stats' })}
          className={`flex-1 min-w-[90px] py-2 sm:py-3 px-2 sm:px-4 rounded-lg font-semibold text-xs sm:text-base transition-colors whitespace-nowrap ${
            view === 'stats'
              ? 'bg-purple-600 text-white'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          📊 {t('playerDashboard.myStats')}
        </button>
      </div>

      {/* Dashboard View */}
      {view === 'dashboard' && (
        <>
          {/* Next Game */}
          {nextGame && nextGameDetails && (() => {
            const { league, team1, team2 } = nextGameDetails;
            const isTeam1 = team1?.playerIds.includes(playerId);
            const myTeam = isTeam1 ? team1 : team2;
            const opponentTeam = isTeam1 ? team2 : team1;
            const hasPending = !!nextGame.pendingSubmission;
            return (
              <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-purple-500">
                <h2 className="text-xl font-bold text-gray-800 mb-3">{t('playerDashboard.nextGame')}</h2>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    {league && (
                      <span className="text-xs font-semibold text-purple-600 bg-purple-100 px-2 py-1 rounded">
                        {league.name}
                      </span>
                    )}
                    <div className="flex items-center gap-2 mt-2 text-sm text-gray-500">
                      <span>{t('common.round')} {nextGame.round}</span>
                      <span>·</span>
                      <span>{t('common.matchDay')} {nextGame.matchDay}</span>
                      {nextGame.scheduledDate && (
                        <>
                          <span>·</span>
                          <span>{formatDate(nextGame.scheduledDate)}</span>
                        </>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="font-semibold text-blue-600">{myTeam?.name}</span>
                      <span className="text-gray-400 text-sm">{t('common.vs')}</span>
                      <span className="font-semibold text-gray-700">{opponentTeam?.name}</span>
                    </div>
                    {hasPending && (
                      <p className="text-xs text-amber-600 mt-1 font-medium">
                        {t('playerDashboard.scoresPendingReview')}
                      </p>
                    )}
                  </div>
                  <a
                    href={`/score/${nextGame.id}`}
                    className="inline-flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 text-white font-bold px-5 py-2.5 rounded-lg transition-colors whitespace-nowrap text-sm"
                  >
                    🎳 {t('playerDashboard.enterScores')}
                  </a>
                </div>
              </div>
            );
          })()}

          {/* Recent Completed Games */}
          {recentCompletedGames.length > 0 && (
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">{t('playerDashboard.recentCompletedGames')}</h2>
              <div className="space-y-3">
                {enrichedGames.map(data => {
                  if (!data) return null;
                  const { 
                    game, league, team1, team2, isTeam1, team1TotalPoints, team2TotalPoints, playerWon,
                    wasAbsent, matchPins, playerTotalPins, gameAverage, playerMatchPoints,
                    matchWins, matchLosses, matchDraws, highestPin
                  } = data;
                  
                  return (
                    <button
                      key={game.id}
                      type="button"
                      className="w-full text-left p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                      onClick={() => navigate(`/player/games/${game.id}`, { state: { game } })}
                    >
                      {/* Header row */}
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs font-semibold text-purple-600 bg-purple-100 px-2 py-1 rounded">
                          {league?.name}
                        </span>
                        <span className="text-xs text-gray-500">
                          {t('common.round')} {game.round} • {t('common.matchDay')} {game.matchDay}
                        </span>
                        <span className="text-xs text-gray-400">
                          {formatDate(game.completedAt || '')}
                        </span>
                      </div>

                      {/* Team matchup + result */}
                      <div className="flex items-center justify-between gap-3 mb-3">
                        <div className="flex items-center gap-2 min-w-0 shrink">
                          <span className={`font-semibold truncate ${isTeam1 ? 'text-blue-600' : 'text-gray-700'}`}>
                            {game.team1?.name || team1?.name}
                          </span>
                          <div className="text-center shrink-0">
                            <div className="text-xs text-gray-400 leading-none mb-0.5">{t('playerDashboard.totalPoints')}</div>
                            <span className="text-sm text-gray-500">
                              <span className="font-bold text-gray-700">{team1TotalPoints}</span>
                              <span className="mx-0.5">-</span>
                              <span className="font-bold text-gray-700">{team2TotalPoints}</span>
                            </span>
                          </div>
                          <span className={`font-semibold truncate ${!isTeam1 ? 'text-blue-600' : 'text-gray-700'}`}>
                            {game.team2?.name || team2?.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {playerWon ? (
                            <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded font-semibold">
                              {t('playerDashboard.won')}
                            </span>
                          ) : team1TotalPoints === team2TotalPoints ? (
                            <span className="text-xs bg-gray-200 text-gray-700 px-2 py-1 rounded font-semibold">
                              {t('playerDashboard.tie')}
                            </span>
                          ) : (
                            <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded font-semibold">
                              {t('playerDashboard.lost')}
                            </span>
                          )}
                          <span className="text-purple-600 font-semibold hidden sm:inline">{forward(t('common.view'))}</span>
                        </div>
                      </div>

                      {/* Player Statistics (desktop) */}
                      <div className="hidden md:block">
                        <div className="flex items-center gap-1 mb-1.5">
                          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{t('playerDashboard.playerStatistics')}</span>
                          <div className="flex-1 h-px bg-gray-200" />
                        </div>
                        {wasAbsent ? (
                          <span className="bg-amber-100 text-amber-700 px-2 py-1 rounded font-medium text-xs">
                            {t('games.absent')}
                          </span>
                        ) : (
                          <div className="flex items-start gap-0 text-xs">
                            {/* Match pins with M1/M2/M3 headers */}
                            <div className="flex flex-col items-start">
                              <div className="flex gap-0.5 mb-1">
                                {matchPins.map((_, idx) => (
                                  <span key={idx} className="px-1.5 text-gray-400 font-medium w-10 text-center">M{idx + 1}</span>
                                ))}
                              </div>
                              <div className="flex gap-0.5">
                                {matchPins.map((pins, idx) => (
                                  <span
                                    key={idx}
                                    className={`px-1.5 py-0.5 rounded font-mono w-10 text-center ${
                                      pins === highestPin && matchPins.length > 1
                                        ? 'bg-purple-100 text-purple-700 font-bold'
                                        : pins >= 200
                                          ? 'bg-green-100 text-green-700 font-bold'
                                          : 'bg-gray-100 text-gray-600'
                                    }`}
                                  >
                                    {pins}
                                  </span>
                                ))}
                              </div>
                            </div>

                            <div className="self-stretch w-px bg-gray-200 mx-3" />

                            {/* Total Pins */}
                            <div className="flex flex-col items-center min-w-[60px]">
                              <span className="text-gray-400 font-medium mb-1">{t('common.totalPins')}</span>
                              <span className="font-bold text-gray-700 text-sm">{playerTotalPins}</span>
                            </div>

                            <div className="self-stretch w-px bg-gray-200 mx-3" />

                            {/* Game Average */}
                            <div className="flex flex-col items-center min-w-[55px]">
                              <span className="text-gray-400 font-medium mb-1">{t('playerDashboard.gameAverage')}</span>
                              <span className="font-bold text-gray-700 text-sm">{gameAverage.toFixed(0)}</span>
                            </div>

                            <div className="self-stretch w-px bg-gray-200 mx-3" />

                            {/* 1v1 Score */}
                            <div className="flex flex-col items-center min-w-[60px]">
                              <span className="text-gray-400 font-medium mb-1">{t('playerDashboard.oneVone')}</span>
                              <span className="font-bold text-blue-600 text-sm">+{playerMatchPoints}</span>
                              <span className="text-gray-500 mt-0.5">{matchWins}W · {matchLosses}L{matchDraws > 0 ? ` · ${matchDraws}D` : ''}</span>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Player Statistics (mobile) */}
                      <div className="md:hidden">
                        <div className="flex items-center gap-1 mb-1.5">
                          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{t('playerDashboard.playerStatistics')}</span>
                          <div className="flex-1 h-px bg-gray-200" />
                        </div>
                        {wasAbsent ? (
                          <span className="bg-amber-100 text-amber-700 px-2 py-1 rounded font-medium text-xs">
                            {t('games.absent')}
                          </span>
                        ) : (
                          <>
                            <div className="flex items-start gap-0 text-xs mb-1">
                              {/* Match pins with M1/M2/M3 headers */}
                              <div className="flex flex-col items-start">
                                <div className="flex gap-0.5 mb-1">
                                  {matchPins.map((_, idx) => (
                                    <span key={idx} className="px-1 text-gray-400 font-medium w-9 text-center">M{idx + 1}</span>
                                  ))}
                                </div>
                                <div className="flex gap-0.5">
                                  {matchPins.map((pins, idx) => (
                                    <span
                                      key={idx}
                                      className={`px-1 py-0.5 rounded font-mono w-9 text-center ${
                                        pins === highestPin && matchPins.length > 1
                                          ? 'bg-purple-100 text-purple-700 font-bold'
                                          : pins >= 200
                                            ? 'bg-green-100 text-green-700 font-bold'
                                            : 'bg-gray-100 text-gray-600'
                                      }`}
                                    >
                                      {pins}
                                    </span>
                                  ))}
                                </div>
                              </div>

                              <div className="self-stretch w-px bg-gray-200 mx-2" />

                              {/* Total Pins */}
                              <div className="flex flex-col items-center min-w-[48px]">
                                <span className="text-gray-400 font-medium mb-1">{t('common.totalPins')}</span>
                                <span className="font-bold text-gray-700">{playerTotalPins}</span>
                              </div>

                              <div className="self-stretch w-px bg-gray-200 mx-2" />

                              {/* Game Average */}
                              <div className="flex flex-col items-center min-w-[40px]">
                                <span className="text-gray-400 font-medium mb-1">{t('playerDashboard.gameAverage')}</span>
                                <span className="font-bold text-gray-700">{gameAverage.toFixed(0)}</span>
                              </div>
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              <span className="font-semibold text-blue-600">+{playerMatchPoints}</span>
                              <span className="mx-1">·</span>
                              <span>{matchWins}W · {matchLosses}L{matchDraws > 0 ? ` · ${matchDraws}D` : ''}</span>
                            </div>
                          </>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* No Completed Games Message */}
          {recentCompletedGames.length === 0 && playerLeagues.length > 0 && (
            <EmptyState
              icon="🎳"
              title={t('playerDashboard.noGamesCompletedYet')}
              message={t('playerDashboard.noGamesCompletedDesc')}
              className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl shadow-lg p-8 text-center"
            />
          )}
        </>
      )}

      {/* Stats View */}
      {view === 'stats' && playerStats && (
        <div className="space-y-6">
          {/* Overall Stats */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">{t('playerDashboard.overallStatistics')}</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">{t('common.gamesPlayed')}</p>
                <p className="text-3xl font-bold text-blue-600">{playerStats.gamesPlayed}</p>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">{t('common.average')}</p>
                <p className="text-3xl font-bold text-green-600">{playerStats.average.toFixed(1)}</p>
              </div>
              <div className="p-4 bg-purple-50 rounded-lg">
                <p className="text-sm text-gray-600 mb-1 text-center">{t('common.highGame')}</p>
                <p className="text-3xl font-bold text-purple-600 text-center">{playerStats.highGame}</p>
                {playerStats.highGameContext && (
                  <div className="mt-2 text-xs text-gray-500 space-y-0.5">
                    <p className="font-medium truncate">{playerStats.highGameContext.leagueName}</p>
                    <p className="truncate">{playerStats.highGameContext.seasonName}</p>
                    <p>{t('common.round')} {playerStats.highGameContext.round} · {t('common.matchDay')} {playerStats.highGameContext.matchDay}</p>
                    {playerStats.highGameContext.date && <p>{formatDate(playerStats.highGameContext.date)}</p>}
                  </div>
                )}
              </div>
            </div>

            {/* Per-Length High Series Records */}
            {Object.keys(playerStats.highSeriesByCount ?? {}).length > 0 && (
              <div className="mt-6">
                <h3 className="text-lg font-semibold text-gray-700 mb-3">{t('playerDashboard.highSeriesRecords')}</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {Object.entries(playerStats.highSeriesByCount)
                    .sort(([a], [b]) => Number(a) - Number(b))
                    .map(([count, record]) => (
                      <div key={count} className="p-4 bg-orange-50 rounded-lg">
                        <p className="text-sm text-gray-600 mb-1 text-center">
                          {t('playerDashboard.highNGameSeries').replace('{{n}}', count)}
                        </p>
                        <p className="text-3xl font-bold text-orange-600 text-center">{record.pins}</p>
                        <div className="mt-2 text-xs text-gray-500 space-y-0.5">
                          <p className="font-medium truncate">{record.context.leagueName}</p>
                          <p className="truncate">{record.context.seasonName}</p>
                          <p>{t('common.round')} {record.context.round} · {t('common.matchDay')} {record.context.matchDay}</p>
                          {record.context.date && <p>{formatDate(record.context.date)}</p>}
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>

          {playerStats.gamesPlayed === 0 && (
            <div className="bg-white rounded-xl shadow-lg p-12 text-center">
              <span className="text-6xl mb-4 block">📊</span>
              <h3 className="text-xl font-bold text-gray-800 mb-2">{t('playerDashboard.noStatisticsYet')}</h3>
              <p className="text-gray-600">{t('playerDashboard.noStatisticsDesc')}</p>
            </div>
          )}
        </div>
      )}

    </div>
  );
};
