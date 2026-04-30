import { useState, useEffect, useMemo } from 'react';
import { playersApi } from '../services/api/players';
import { leaguesApi } from '../services/api/leagues';
import { seasonsApi } from '../services/api/seasons';
import { teamsApi } from '../services/api/teams';
import { gamesApi } from '../services/api/games';
import { logger } from '../utils/logger';
import { getPlayerDisplayName } from '../utils/playerUtils';
import type { Game, GameMatch, League, Player, PlayerStats, Season, Team } from '../types/index';

export interface EnrichedGame {
  game: Game;
  league: League | null;
  team1: Team | undefined;
  team2: Team | undefined;
  isTeam1: boolean;
  team1TotalPoints: number;
  team2TotalPoints: number;
  playerWon: boolean;
  wasAbsent: boolean;
  matchPins: number[];
  playerTotalPins: number;
  gameAverage: number;
  preGameAverage: number;
  playerMatchPoints: number;
  matchWins: number;
  matchLosses: number;
  matchDraws: number;
  highestPin: number;
}

interface PlayerDashboardData {
  player: Player | null;
  playerLeagues: League[];
  recentCompletedGames: Game[];
  gameDetailsMap: Record<string, { season: Season | null; league: League | null; team1: Team | undefined; team2: Team | undefined }>;
  nextGame: Game | null;
  nextGameDetails: { season: Season | null; league: League | null; team1: Team | undefined; team2: Team | undefined } | null;
  playerStats: PlayerStats | null;
  enrichedGames: (EnrichedGame | null)[];
  isLoading: boolean;
  loadError: string | null;
}

const RECENT_GAMES_LIMIT = 5;

function computePlayerStats(
  allGames: Game[],
  teamsById: Map<string, Team>,
  seasonsById: Map<string, Season>,
  leaguesById: Map<string, League>,
  playerId: string,
  playerResult: Player | undefined
): PlayerStats {
  const stats: PlayerStats = {
    playerId,
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

  for (const game of allGames.filter((g: Game) => g.status === 'completed')) {
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
        if (teamMatch?.players?.[playerIndex]) {
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
          if (match.playerMatches?.[playerIndex]) {
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
}

export function usePlayerDashboardData(playerId: string): PlayerDashboardData {
  const [player, setPlayer] = useState<Player | null>(null);
  const [playerLeagues, setPlayerLeagues] = useState<League[]>([]);
  const [recentCompletedGames, setRecentCompletedGames] = useState<Game[]>([]);
  const [gameDetailsMap, setGameDetailsMap] = useState<Record<string, { season: Season | null; league: League | null; team1: Team | undefined; team2: Team | undefined }>>({});
  const [nextGame, setNextGame] = useState<Game | null>(null);
  const [nextGameDetails, setNextGameDetails] = useState<{ season: Season | null; league: League | null; team1: Team | undefined; team2: Team | undefined } | null>(null);
  const [playerStats, setPlayerStats] = useState<PlayerStats | null>(null);
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

        const allTeams = await teamsApi.getAll();
        if (cancelled) return;
        const teamsById = new Map(allTeams.map(t => [t.id, t]));
        const playerTeams = allTeams.filter(team => team.playerIds.includes(playerId));

        const seasonIds = [...new Set(playerTeams.map(t => t.seasonId))];
        const seasons = await Promise.all(seasonIds.map(id => seasonsApi.getById(id)));
        if (cancelled) return;
        const validSeasons = seasons.filter(Boolean);

        const leagueIds = [...new Set(validSeasons.filter((s): s is Season => s !== undefined).map(s => s.leagueId))];
        const leaguesData = await Promise.all(leagueIds.map(id => leaguesApi.getById(id)));
        if (cancelled) return;
        const leagues = leaguesData
          .filter((league): league is League => !!league && typeof league.id === 'string')
          .map(league => {
            const leagueSeasons = validSeasons.filter((s): s is Season => s !== undefined && s.leagueId === league.id);
            return {
              ...league,
              seasons: leagueSeasons,
              activeSeasons: leagueSeasons.filter((s: Season) => s.status === 'active'),
              playerTeams: playerTeams.filter(t => leagueSeasons.some((s: Season) => s.id === t.seasonId)),
            };
          });
        setPlayerLeagues(leagues);

        const seasonsById = new Map(
          validSeasons.filter((s): s is Season => s !== undefined).map(s => [s.id, s])
        );
        const leaguesById = new Map(
          leaguesData.filter((l): l is League => !!l).map(l => [l.id, l])
        );

        const allGames = await gamesApi.getAll();
        if (cancelled) return;

        const completedPlayerGames = allGames
          .filter(game => {
            const t1 = teamsById.get(game.team1Id);
            const t2 = teamsById.get(game.team2Id);
            return (t1?.playerIds.includes(playerId) || t2?.playerIds.includes(playerId))
              && game.status === 'completed';
          })
          .sort((a, b) => {
            const dateA = new Date(a.completedAt || a.updatedAt || 0);
            const dateB = new Date(b.completedAt || b.updatedAt || 0);
            return dateB.getTime() - dateA.getTime();
          });

        const topGames = completedPlayerGames.slice(0, RECENT_GAMES_LIMIT);
        setRecentCompletedGames(topGames);

        const upcomingPlayerGames = allGames
          .filter(game => {
            if (game.status === 'completed' || game.postponed) return false;
            const t1 = teamsById.get(game.team1Id);
            const t2 = teamsById.get(game.team2Id);
            return t1?.playerIds.includes(playerId) || t2?.playerIds.includes(playerId);
          })
          .sort((a, b) => new Date(a.scheduledDate || 0).getTime() - new Date(b.scheduledDate || 0).getTime());

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

        const stats = computePlayerStats(allGames, teamsById, seasonsById, leaguesById, playerId, playerResult ?? undefined);
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
  }, [playerId]);

  const enrichedGames = useMemo((): (EnrichedGame | null)[] => {
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

      preGameAverages.set(game.id, runningMatchCount > 0 ? runningTotalPins / runningMatchCount : 0);

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

    return recentCompletedGames.map(game => {
      const details = gameDetailsMap[game.id];
      if (!details) return null;
      const { league, team1, team2 } = details;
      const isTeam1 = team1?.playerIds.includes(playerId) ?? false;
      const team1TotalPoints = (game.matches?.reduce((sum: number, m: GameMatch) => sum + (m.team1?.points || 0), 0) ?? 0) + (game.grandTotalPoints?.team1 || 0);
      const team2TotalPoints = (game.matches?.reduce((sum: number, m: GameMatch) => sum + (m.team2?.points || 0), 0) ?? 0) + (game.grandTotalPoints?.team2 || 0);
      const playerWon = (isTeam1 && team1TotalPoints > team2TotalPoints) || (!isTeam1 && team2TotalPoints > team1TotalPoints);

      const playerIndex = (isTeam1 ? team1 : team2)?.playerIds.indexOf(playerId) ?? -1;
      const teamSnapshot = isTeam1 ? game.team1 : game.team2;
      const wasAbsent = teamSnapshot?.players?.[playerIndex]?.absent ?? false;

      const matchPins: number[] = [];
      let playerTotalPins = 0;
      let playerMatchPoints = 0;
      let matchWins = 0;
      let matchLosses = 0;
      let matchDraws = 0;

      if (game.matches && playerIndex !== -1) {
        game.matches.forEach((match: GameMatch) => {
          const teamMatch = isTeam1 ? match.team1 : match.team2;
          const pins = parseInt(teamMatch?.players?.[playerIndex]?.pins || '0') || 0;
          matchPins.push(pins);
          playerTotalPins += pins;

          if (match.playerMatches?.[playerIndex]) {
            const t1Pts = match.playerMatches[playerIndex].team1Points;
            const t2Pts = match.playerMatches[playerIndex].team2Points;
            playerMatchPoints += isTeam1 ? t1Pts : t2Pts;
            if (t1Pts === t2Pts) matchDraws++;
            else if ((isTeam1 && t1Pts > t2Pts) || (!isTeam1 && t2Pts > t1Pts)) matchWins++;
            else matchLosses++;
          }
        });
      }

      const matchCount = matchPins.length;
      return {
        game,
        league,
        team1,
        team2,
        isTeam1,
        team1TotalPoints,
        team2TotalPoints,
        playerWon,
        wasAbsent,
        matchPins,
        playerTotalPins,
        gameAverage: matchCount > 0 ? playerTotalPins / matchCount : 0,
        preGameAverage: preGameAverages.get(game.id) ?? 0,
        playerMatchPoints,
        matchWins,
        matchLosses,
        matchDraws,
        highestPin: Math.max(...matchPins, 0),
      };
    });
  }, [recentCompletedGames, gameDetailsMap, playerId]);

  return {
    player,
    playerLeagues,
    recentCompletedGames,
    gameDetailsMap,
    nextGame,
    nextGameDetails,
    playerStats,
    enrichedGames,
    isLoading,
    loadError,
  };
}
