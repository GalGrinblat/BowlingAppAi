import type { BonusRule, Game, PlayerMatchResult, GameMatch, MatchPlayer, GamePlayer } from '../types/index';
import { compareTeamScores, applyMatchWinnerPoints } from './comparisonUtils';
import { ABSENT_PLAYER_PENALTY, MIN_BOWLING_SCORE, MAX_BOWLING_SCORE } from '../constants/bowling';

export const clampScore = (score: number): number =>
  Math.max(MIN_BOWLING_SCORE, Math.min(MAX_BOWLING_SCORE, score));

export const createEmptyMatch = (matchNumber: number, playersPerTeam: number): GameMatch => {
  const createEmptyPlayers = (): MatchPlayer[] =>
    Array.from({ length: playersPerTeam }, () => ({
      pins: '',
      bonusPoints: 0
    }));

  const emptyPlayerMatches: PlayerMatchResult[] = Array.from({ length: playersPerTeam }, (_, i) => ({
    player: i + 1,
    result: null,
    team1Points: 0,
    team2Points: 0
  }));

  return {
    matchNumber,
    team1: {
      points: 0,
      totalPins: 0,
      totalWithHandicap: 0,
      bonusPoints: 0,
      players: createEmptyPlayers()
    },
    team2: {
      points: 0,
      totalPins: 0,
      totalWithHandicap: 0,
      bonusPoints: 0,
      players: createEmptyPlayers()
    },
    playerMatches: emptyPlayerMatches
  };
};

export const calculateBonusPoints = (
  score: string, 
  average: number, 
  isAbsent: boolean, 
  bonusRules: BonusRule[] | null = null
): number => {
  // Absent players cannot earn bonus points
  if (isAbsent) return 0;
  
  if (score === '' || average === 0) return 0;
  const scoreNum = typeof score === 'string' ? parseInt(score) : score;
  
  // Use bonus rules if provided
  if (!bonusRules || bonusRules.length === 0) return 0;
  
  // Filter for player bonuses only and sort by points descending to award highest first
  const playerRules = bonusRules
    .filter(r => r.type === 'player')
    .sort((a, b) => b.points - a.points);
  
  // Check each rule and return the first (highest) bonus that applies
  for (const rule of playerRules) {
    if (rule.condition === 'vs_average') {
      if (scoreNum >= average + rule.threshold) {
        return rule.points;
      }
    } else if (rule.condition === 'pure_score') {
      if (scoreNum >= rule.threshold) {
        return rule.points;
      }
    }
  }
  
  return 0;
};

/**
 * Helper function to calculate team totals (pins and pins with handicap)
 * @param gamePlayers - Array of player data from game.team1 or game.team2
 * @param matchPlayers - Array of match player data with pins
 * @returns Object with totalPins and totalWithHandicap
 */
const calculateTeamTotals = (
  gamePlayers: GamePlayer[],
  matchPlayers: MatchPlayer[]
): { totalPins: number; totalWithHandicap: number } => {
  let totalPins = 0;
  let totalWithHandicap = 0;
  
  gamePlayers.forEach((player, idx) => {
    if (!player || !matchPlayers[idx]) return;
    const score = player.absent ? Math.round(player.average) - ABSENT_PLAYER_PENALTY : clampScore(Number(matchPlayers[idx].pins) || 0);
    totalPins += score;
    totalWithHandicap += score + player.handicap;
  });
  
  return { totalPins, totalWithHandicap };
};

export const calculateMatchResults = (game: Game, matchIndex: number): void => {
  if (!game.matches) return;
  const match = game.matches[matchIndex];
  if (!match) return;
  
  // Get configurable point values (defaults to 1 if not set)
  const playerMatchPointsPerWin = game.playerMatchPointsPerWin || 1;
  const teamMatchPointsPerWin = game.teamMatchPointsPerWin || 1;
  
  // Calculate individual game results with handicap
  match.playerMatches.forEach((gameResult: PlayerMatchResult, idx: number) => {
    if (!game.team1 || !game.team2) return;
    const team1Player = game.team1.players[idx];
    const team2Player = game.team2.players[idx];
    
    // Safety check: if players are undefined, skip this game
    if (!team1Player || !team2Player) {
      gameResult.result = null;
      gameResult.team1Points = 0;
      gameResult.team2Points = 0;
      return;
    }
    
    // If player is absent, use average minus penalty; otherwise use entered pins (or 0)
    const team1PlayerScore = team1Player.absent ? Math.round(team1Player.average) - ABSENT_PLAYER_PENALTY : clampScore(Number(match.team1.players[idx]?.pins) || 0);
    const team2PlayerScore = team2Player.absent ? Math.round(team2Player.average) - ABSENT_PLAYER_PENALTY : clampScore(Number(match.team2.players[idx]?.pins) || 0);
    
    const team1PlayerScoreWithHandicap = team1PlayerScore + team1Player.handicap;
    const team2PlayerScoreWithHandicap = team2PlayerScore + team2Player.handicap;
    
    // Only calculate if both players have scores (entered or absent)
    const team1PlayerHasScore = team1Player.absent || match.team1.players[idx]?.pins !== '';
    const team2PlayerHasScore = team2Player.absent || match.team2.players[idx]?.pins !== '';
    
    if (team1PlayerHasScore && team2PlayerHasScore) {
      // Special rule: If both players are absent, it's always a draw
      if (team1Player.absent && team2Player.absent) {
        gameResult.result = 'draw';
        gameResult.team1Points = playerMatchPointsPerWin / 2;
        gameResult.team2Points = playerMatchPointsPerWin / 2;
      } else {
        // Use comparison utility for standard comparison
        const comparison = compareTeamScores(team1PlayerScoreWithHandicap, team2PlayerScoreWithHandicap, playerMatchPointsPerWin);
        gameResult.result = comparison.winner;
        gameResult.team1Points = comparison.team1Points;
        gameResult.team2Points = comparison.team2Points;
      }
    } else {
      gameResult.result = null;
      gameResult.team1Points = 0;
      gameResult.team2Points = 0;
    }
  });

  // Calculate totals using helper function
  if (!game.team1 || !game.team2) return;
  const team1Totals = calculateTeamTotals(game.team1.players, match.team1.players);
  match.team1.totalPins = team1Totals.totalPins;
  match.team1.totalWithHandicap = team1Totals.totalWithHandicap;
  
  const team2Totals = calculateTeamTotals(game.team2.players, match.team2.players);
  match.team2.totalPins = team2Totals.totalPins;
  match.team2.totalWithHandicap = team2Totals.totalWithHandicap;

  // Calculate bonus points
  match.team1.bonusPoints = match.team1.players.reduce((sum: number, p: MatchPlayer) => sum + p.bonusPoints, 0);
  match.team2.bonusPoints = match.team2.players.reduce((sum: number, p: MatchPlayer) => sum + p.bonusPoints, 0);

  // Calculate game points
  let team1GamePoints = 0;
  let team2GamePoints = 0;
  
  match.playerMatches.forEach((gameResult: PlayerMatchResult) => {
    team1GamePoints += gameResult.team1Points;
    team2GamePoints += gameResult.team2Points;
  });

  // Calculate total points (game points + total bonus + performance bonus)
  if (!game.team1 || !game.team2) return;
  const team1AllScoresEntered = game.team1.players.every((p: GamePlayer, idx: number) => {
    const matchPlayer = match.team1.players[idx];
    return !p || (p.absent || matchPlayer?.pins !== '');
  });
  const team2AllScoresEntered = game.team2.players.every((p: GamePlayer, idx: number) => {
    const matchPlayer = match.team2.players[idx];
    return !p || (p.absent || matchPlayer?.pins !== '');
  });
  const allScoresEntered = team1AllScoresEntered && team2AllScoresEntered;
  
  // Use comparison utility to apply match winner points
  const team1BasePoints = team1GamePoints + match.team1.bonusPoints;
  const team2BasePoints = team2GamePoints + match.team2.bonusPoints;
    if (allScoresEntered) {
    const scores = applyMatchWinnerPoints(
      match.team1.totalWithHandicap,
      match.team2.totalWithHandicap,
      team1BasePoints,
      team2BasePoints,
      teamMatchPointsPerWin
    );
    match.team1.points = scores.team1Points;
    match.team2.points = scores.team2Points;
  } else {
    match.team1.points = team1BasePoints;
    match.team2.points = team2BasePoints;
  }
};

export const calcGamePoints = (game: Game): { team1: number; team2: number; winner: 'team1' | 'team2' | 'tie' } => {
  const matches = game.matches ?? [];
  const getBonus = (teamKey: 'team1' | 'team2') => {
    if (!game.teamAllPresentBonusEnabled || !game.teamAllPresentBonusPoints) return 0;
    const players = game[teamKey]?.players;
    return (players?.length && players.every(p => !p.absent)) ? game.teamAllPresentBonusPoints : 0;
  };
  const team1 = matches.reduce((s, m) => s + (m.team1?.points || 0), 0) + (game.grandTotalPoints?.team1 || 0) + getBonus('team1');
  const team2 = matches.reduce((s, m) => s + (m.team2?.points || 0), 0) + (game.grandTotalPoints?.team2 || 0) + getBonus('team2');
  return { team1, team2, winner: team1 > team2 ? 'team1' : team2 > team1 ? 'team2' : 'tie' };
};

const isPinsInRange = (pins: string): boolean => {
  if (pins === '') return false;
  const value = parseInt(pins);
  return !isNaN(value) && value >= MIN_BOWLING_SCORE && value <= MAX_BOWLING_SCORE;
};

export const validateMatch = (currentGame: Game, matchIndex: number): boolean => {
  if (!currentGame.matches) return false;
  const match = currentGame.matches[matchIndex];
  if (!match) return false;
  if (!currentGame.team1 || !currentGame.team2) return false;
  const team1Valid = currentGame.team1.players.every((p: GamePlayer, idx: number) => {
    if (!p) return true;
    if (p.absent) return true;
    const pins = match.team1.players[idx]?.pins ?? '';
    return isPinsInRange(pins);
  });
  const team2Valid = currentGame.team2.players.every((p: GamePlayer, idx: number) => {
    if (!p) return true;
    if (p.absent) return true;
    const pins = match.team2.players[idx]?.pins ?? '';
    return isPinsInRange(pins);
  });
  return team1Valid && team2Valid;
};
