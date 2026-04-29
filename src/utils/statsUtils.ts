import type { Game, GameMatch, GamePlayer } from '../types/index';
import { ABSENT_PLAYER_PENALTY } from '../constants/bowling';

interface PlayerGameStats extends GamePlayer {
  totalPins: number;
  gameAverage: number;
  pointsScored: number;
  isAbsent: boolean;
}

interface GameStats {
  team1Stats: PlayerGameStats[];
  team2Stats: PlayerGameStats[];
  team1TotalPins: number;
  team2TotalPins: number;
  team1Average: number;
  team2Average: number;
}

export const calculatePlayerStats = (game: Game): GameStats => {
  if (!game.team1 || !game.team2) {
    return {
      team1Stats: [],
      team2Stats: [],
      team1TotalPins: 0,
      team2TotalPins: 0,
      team1Average: 0,
      team2Average: 0
    };
  }
  const team1Stats = game.team1.players.map((player: GamePlayer, idx: number): PlayerGameStats => {
    if (!player) {
      return { totalPins: 0, gameAverage: 0, pointsScored: 0, isAbsent: false } as PlayerGameStats;
    }
    if (player.absent) {
      const matchesPerGame = game.matchesPerGame || game.matches?.length || 1;
      const absenceScore = player.average - ABSENT_PLAYER_PENALTY;
      const totalPins = absenceScore * matchesPerGame;
      const gameAverage = absenceScore;
      const pointsScored = game.matches?.reduce((sum: number, m: GameMatch) => {
        const playerMatch = m.playerMatches?.[idx];
        return sum + (playerMatch?.team1Points ?? 0);
      }, 0) || 0;
      return { ...player, totalPins, gameAverage, pointsScored, isAbsent: true };
    }
    const totalPins = game.matches?.reduce((sum: number, m: GameMatch) => {
      const player = m.team1.players[idx];
      const pins = player && player.pins !== undefined && player.pins !== '' ? Number(player.pins) : 0;
      return sum + pins;
    }, 0) || 0;
    const matchesPerGame = game.matchesPerGame || game.matches?.length || 1;
    const gameAverage = totalPins / matchesPerGame;
    const pointsScored = game.matches?.reduce((sum: number, m: GameMatch) => {
      const playerMatch = m.playerMatches && m.playerMatches[idx];
      return sum + (playerMatch?.team1Points ?? 0);
    }, 0) || 0;
    return { ...player, totalPins, gameAverage, pointsScored, isAbsent: false };
  });

  const team2Stats = game.team2.players.map((player: GamePlayer, idx: number): PlayerGameStats => {
    if (!player) {
      return { totalPins: 0, gameAverage: 0, pointsScored: 0, isAbsent: false } as PlayerGameStats;
    }
    if (player.absent) {
      const matchesPerGame = game.matchesPerGame || game.matches?.length || 1;
      const absenceScore = player.average - ABSENT_PLAYER_PENALTY;
      const totalPins = absenceScore * matchesPerGame;
      const gameAverage = absenceScore;
      const pointsScored = game.matches?.reduce((sum: number, m: GameMatch) => {
        const playerMatch = m.playerMatches && m.playerMatches[idx];
        return sum + (playerMatch?.team2Points ?? 0);
      }, 0) || 0;
      return { ...player, totalPins, gameAverage, pointsScored, isAbsent: true };
    }
    const totalPins = game.matches?.reduce((sum: number, m: GameMatch) => {
      const player = m.team2.players[idx];
      const pins = player && player.pins !== undefined && player.pins !== '' ? Number(player.pins) : 0;
      return sum + pins;
    }, 0) || 0;
    const matchesPerGame = game.matchesPerGame || game.matches?.length || 1;
    const gameAverage = totalPins / matchesPerGame;
    const pointsScored = game.matches?.reduce((sum: number, m: GameMatch) => {
      const playerMatch = m.playerMatches && m.playerMatches[idx];
      return sum + (playerMatch?.team2Points ?? 0);
    }, 0) || 0;
    return { ...player, totalPins, gameAverage, pointsScored, isAbsent: false };
  });

  // Calculate totals excluding absent players
  const team1NonAbsentStats = team1Stats.filter((p: PlayerGameStats) => !p.isAbsent);
  const team2NonAbsentStats = team2Stats.filter((p: PlayerGameStats) => !p.isAbsent);

  const team1TotalPins = team1NonAbsentStats.reduce((sum: number, p: PlayerGameStats) => sum + p.totalPins, 0);
  const team2TotalPins = team2NonAbsentStats.reduce((sum: number, p: PlayerGameStats) => sum + p.totalPins, 0);

  // Calculate average only from non-absent players
  const matchesPerGame = game.matchesPerGame || game.matches?.length || 1;
  const team1NonAbsentCount = team1NonAbsentStats.length;
  const team2NonAbsentCount = team2NonAbsentStats.length;
  const team1Average = team1NonAbsentCount > 0 ? team1TotalPins / (team1NonAbsentCount * matchesPerGame) : 0;
  const team2Average = team2NonAbsentCount > 0 ? team2TotalPins / (team2NonAbsentCount * matchesPerGame) : 0;

  return {
    team1Stats,
    team2Stats,
    team1TotalPins,
    team2TotalPins,
    team1Average,
    team2Average
  };
};

export const calculateGameTotals = (game: Game): {
  team1Points: number;
  team2Points: number;
  team1TotalPinsWithHandicap: number;
  team1TotalPinsNoHandicap: number;
  team2TotalPinsWithHandicap: number;
  team2TotalPinsNoHandicap: number;
} => {
  const team1Points = (game.matches?.reduce((sum: number, m: GameMatch) => sum + m.team1.points, 0) || 0) + (game.grandTotalPoints?.team1 || 0);
  const team2Points = (game.matches?.reduce((sum: number, m: GameMatch) => sum + m.team2.points, 0) || 0) + (game.grandTotalPoints?.team2 || 0);

  const team1TotalPinsWithHandicap = game.matches?.reduce((sum: number, m: GameMatch) => sum + m.team1.totalWithHandicap, 0) || 0;
  const team2TotalPinsWithHandicap = game.matches?.reduce((sum: number, m: GameMatch) => sum + m.team2.totalWithHandicap, 0) || 0;
  const team1TotalPinsNoHandicap = game.matches?.reduce((sum: number, m: GameMatch) => sum + m.team1.totalPins, 0) || 0;
  const team2TotalPinsNoHandicap = game.matches?.reduce((sum: number, m: GameMatch) => sum + m.team2.totalPins, 0) || 0;

  return {
    team1Points: team1Points,
    team2Points: team2Points,
    team1TotalPinsWithHandicap,
    team1TotalPinsNoHandicap,
    team2TotalPinsWithHandicap,
    team2TotalPinsNoHandicap
  };
};

export const calculateGrandTotalPoints = (game: Game): { team1: number; team2: number } => {
  // Get configurable grand total points (defaults to 2 if not set)
  const teamGamePointsPerWin = game.teamGamePointsPerWin || 2;

  // Check if all matches are complete (accounting for absent players)
  if (!game.team1 || !game.team2) return { team1: 0, team2: 0 };
  const allMatchesComplete = game.matches?.every((m: GameMatch) => {
    const team1Complete = game.team1!.players.every((p: GamePlayer, idx: number) => !p || (p.absent || m.team1.players[idx]?.pins !== ''));
    const team2Complete = game.team2!.players.every((p: GamePlayer, idx: number) => !p || (p.absent || m.team2.players[idx]?.pins !== ''));
    return team1Complete && team2Complete;
  }) || false;

  // All-present bonus (per game, awarded once regardless of match count)
  const presentBonus = (game.teamAllPresentBonusEnabled && game.teamAllPresentBonusPoints) ? game.teamAllPresentBonusPoints : 0;
  const team1AllPresent = presentBonus > 0 && game.team1.players.every((p: GamePlayer) => !p.absent);
  const team2AllPresent = presentBonus > 0 && game.team2.players.every((p: GamePlayer) => !p.absent);

  if (allMatchesComplete) {
    // Calculate total pins with handicap across all matches
    const team1GrandTotal = game.matches?.reduce((sum: number, m: GameMatch) => sum + m.team1.totalWithHandicap, 0) || 0;
    const team2GrandTotal = game.matches?.reduce((sum: number, m: GameMatch) => sum + m.team2.totalWithHandicap, 0) || 0;

    let winPts1 = 0, winPts2 = 0;
    if (team1GrandTotal > team2GrandTotal) {
      winPts1 = teamGamePointsPerWin;
    } else if (team2GrandTotal > team1GrandTotal) {
      winPts2 = teamGamePointsPerWin;
    } else {
      winPts1 = teamGamePointsPerWin / 2;
      winPts2 = teamGamePointsPerWin / 2;
    }

    return {
      team1: winPts1 + (team1AllPresent ? presentBonus : 0),
      team2: winPts2 + (team2AllPresent ? presentBonus : 0),
    };
  } else {
    return {
      team1: team1AllPresent ? presentBonus : 0,
      team2: team2AllPresent ? presentBonus : 0,
    };
  }
};
