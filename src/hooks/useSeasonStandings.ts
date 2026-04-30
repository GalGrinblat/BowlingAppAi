import { useMemo } from 'react';
import { calculateTeamStandings, calculatePlayerSeasonStats } from '../utils/standingsUtils';
import { calculateSeasonRecords } from '../utils/recordsUtils';
import type { Team, Game, GameMatch } from '../types/index';

export interface StandingsFilter {
  round: number;
  matchDay: number;
}

export function useSeasonStandings(
  teams: Team[],
  games: Game[],
  standingsFilter: StandingsFilter | null
) {
  const teamStandings = useMemo(() => calculateTeamStandings(teams, games), [teams, games]);
  const playerStats = useMemo(() => calculatePlayerSeasonStats(teams, games), [teams, games]);
  const seasonRecords = useMemo(() => calculateSeasonRecords(teams, games), [teams, games]);

  const lastCompletedMatchDayInfo = useMemo(() => {
    const completed = games.filter(g => g.status === 'completed');
    if (completed.length === 0) return null;
    const maxRound = Math.max(...completed.map(g => g.round));
    const maxMatchDay = Math.max(...completed.filter(g => g.round === maxRound).map(g => g.matchDay));
    return { round: maxRound, matchDay: maxMatchDay };
  }, [games]);

  const lastMatchdayGames = useMemo(() => {
    if (!lastCompletedMatchDayInfo) return [];
    return games.filter(g =>
      g.status === 'completed' &&
      g.round === lastCompletedMatchDayInfo.round &&
      g.matchDay === lastCompletedMatchDayInfo.matchDay
    );
  }, [games, lastCompletedMatchDayInfo]);

  const previousTeamRanks = useMemo((): Map<string, number> => {
    const lastIds = new Set(lastMatchdayGames.map(g => g.id));
    const prevCompleted = games.filter(g => !lastIds.has(g.id) && g.status === 'completed');
    if (prevCompleted.length === 0) return new Map();
    const prevStandings = calculateTeamStandings(teams, games.filter(g => !lastIds.has(g.id)));
    const map = new Map<string, number>();
    prevStandings.forEach((s, idx) => map.set(s.teamId, idx + 1));
    return map;
  }, [teams, games, lastMatchdayGames]);

  const lastMatchdayTeamResults = useMemo((): Map<string, { result: 'W' | 'L' | 'D'; ownPoints: number; opponentPoints: number; opponentName: string }> => {
    const map = new Map<string, { result: 'W' | 'L' | 'D'; ownPoints: number; opponentPoints: number; opponentName: string }>();
    lastMatchdayGames.forEach(game => {
      const t1Points = (game.matches?.reduce((sum, m: GameMatch) => sum + (m.team1?.points || 0), 0) || 0) + (game.grandTotalPoints?.team1 || 0);
      const t2Points = (game.matches?.reduce((sum, m: GameMatch) => sum + (m.team2?.points || 0), 0) || 0) + (game.grandTotalPoints?.team2 || 0);
      const team1Name = teams.find(t => t.id === game.team1Id)?.name || game.team1Id;
      const team2Name = teams.find(t => t.id === game.team2Id)?.name || game.team2Id;
      let r1: 'W' | 'L' | 'D', r2: 'W' | 'L' | 'D';
      if (t1Points > t2Points) { r1 = 'W'; r2 = 'L'; }
      else if (t2Points > t1Points) { r1 = 'L'; r2 = 'W'; }
      else { r1 = 'D'; r2 = 'D'; }
      map.set(game.team1Id, { result: r1, ownPoints: t1Points, opponentPoints: t2Points, opponentName: team2Name });
      map.set(game.team2Id, { result: r2, ownPoints: t2Points, opponentPoints: t1Points, opponentName: team1Name });
    });
    return map;
  }, [lastMatchdayGames, teams]);

  const previousPlayerRanks = useMemo((): Map<string, number> => {
    const lastIds = new Set(lastMatchdayGames.map(g => g.id));
    const prevCompleted = games.filter(g => !lastIds.has(g.id) && g.status === 'completed');
    if (prevCompleted.length === 0) return new Map();
    const prevStats = calculatePlayerSeasonStats(teams, games.filter(g => !lastIds.has(g.id)));
    const map = new Map<string, number>();
    prevStats.forEach((ps, idx) => map.set(`${ps.teamId}-${ps.playerName}`, idx + 1));
    return map;
  }, [teams, games, lastMatchdayGames]);

  const lastMatchdayPlayerPins = useMemo((): Map<string, number[]> => {
    const map = new Map<string, number[]>();
    lastMatchdayGames.forEach(game => {
      (['team1', 'team2'] as const).forEach(teamKey => {
        const gameTeam = game[teamKey];
        if (!gameTeam) return;
        const teamId = teamKey === 'team1' ? game.team1Id : game.team2Id;
        gameTeam.players.forEach((player, idx) => {
          if (player.absent) return;
          const matchScores: number[] = (game.matches ?? []).map((m: GameMatch) =>
            parseInt(m[teamKey]?.players[idx]?.pins || '') || 0
          );
          if (matchScores.some(p => p > 0)) map.set(`${teamId}-${player.name}`, matchScores);
        });
      });
    });
    return map;
  }, [lastMatchdayGames]);

  const teamCompletedGameCount = useMemo((): Map<string, number> => {
    const map = new Map<string, number>();
    games.filter(g => g.status === 'completed').forEach(game => {
      map.set(game.team1Id, (map.get(game.team1Id) || 0) + game.matchesPerGame);
      map.set(game.team2Id, (map.get(game.team2Id) || 0) + game.matchesPerGame);
    });
    return map;
  }, [games]);

  const completedMatchDayEvents = useMemo(() => {
    const seen = new Set<string>();
    const result: { round: number; matchDay: number }[] = [];
    games.filter(g => g.status === 'completed').forEach(g => {
      const key = `${g.round}-${g.matchDay}`;
      if (!seen.has(key)) {
        seen.add(key);
        result.push({ round: g.round, matchDay: g.matchDay });
      }
    });
    return result.sort((a, b) => a.round !== b.round ? b.round - a.round : b.matchDay - a.matchDay);
  }, [games]);

  const standingsGames = useMemo(() => {
    if (!standingsFilter) return games;
    const { round: r, matchDay: md } = standingsFilter;
    return games.filter(g =>
      g.status === 'completed' &&
      (g.round < r || (g.round === r && g.matchDay <= md))
    );
  }, [games, standingsFilter]);

  const filteredTeamStandings = useMemo(
    () => standingsFilter ? calculateTeamStandings(teams, standingsGames) : teamStandings,
    [standingsFilter, teamStandings, teams, standingsGames]
  );

  const filteredPlayerStats = useMemo(
    () => standingsFilter ? calculatePlayerSeasonStats(teams, standingsGames) : playerStats,
    [standingsFilter, playerStats, teams, standingsGames]
  );

  return {
    teamStandings,
    playerStats,
    seasonRecords,
    lastCompletedMatchDayInfo,
    lastMatchdayGames,
    previousTeamRanks,
    lastMatchdayTeamResults,
    previousPlayerRanks,
    lastMatchdayPlayerPins,
    teamCompletedGameCount,
    completedMatchDayEvents,
    standingsGames,
    filteredTeamStandings,
    filteredPlayerStats,
  };
}
