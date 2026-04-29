import {
  clampScore,
  createEmptyMatch,
  calculateBonusPoints,
  calculateMatchResults,
  calcGamePoints,
  validateMatch,
} from '../../../src/utils/matchUtils';
import type { Game, BonusRule } from '../../../src/types/index';

// ── Helpers ─────────────────────────────────────────────────────────────────

const makeGamePlayer = (overrides: Partial<{
  playerId: string; name: string; average: number; handicap: number; rank: number; absent: boolean;
}> = {}) => ({
  playerId: 'p1',
  name: 'Alice',
  average: 150,
  handicap: 10,
  rank: 1,
  absent: false,
  ...overrides,
});

/** Build a minimal Game with two players and one match ready for scoring */
const makeGame = (overrides: Partial<Game> = {}): Game => ({
  id: 'g1',
  seasonId: 's1',
  round: 1,
  matchDay: 1,
  team1Id: 't1',
  team2Id: 't2',
  postponed: false,
  status: 'in-progress',
  createdAt: '2024-01-01T00:00:00Z',
  matchesPerGame: 1,
  useHandicap: false,
  lineupStrategy: 'flexible',
  lineupRule: 'standard',
  playerMatchPointsPerWin: 1,
  teamMatchPointsPerWin: 1,
  teamGamePointsPerWin: 2,
  teamAllPresentBonusEnabled: false,
  teamAllPresentBonusPoints: 0,
  bonusRules: [],
  team1: {
    name: 'Team A',
    players: [makeGamePlayer({ playerId: 'p1', name: 'Alice', average: 150, handicap: 0 })],
  },
  team2: {
    name: 'Team B',
    players: [makeGamePlayer({ playerId: 'p2', name: 'Bob', average: 140, handicap: 0 })],
  },
  matches: [
    {
      matchNumber: 1,
      team1: { points: 0, totalPins: 0, totalWithHandicap: 0, bonusPoints: 0, players: [{ pins: '180', bonusPoints: 0 }] },
      team2: { points: 0, totalPins: 0, totalWithHandicap: 0, bonusPoints: 0, players: [{ pins: '160', bonusPoints: 0 }] },
      playerMatches: [{ player: 1, result: null, team1Points: 0, team2Points: 0 }],
    },
  ],
  ...overrides,
});

// ── clampScore ───────────────────────────────────────────────────────────────

describe('clampScore', () => {
  it('returns score unchanged when in valid range', () => {
    expect(clampScore(150)).toBe(150);
    expect(clampScore(0)).toBe(0);
    expect(clampScore(300)).toBe(300);
  });

  it('clamps values below 0 to 0', () => {
    expect(clampScore(-5)).toBe(0);
    expect(clampScore(-100)).toBe(0);
  });

  it('clamps values above 300 to 300', () => {
    expect(clampScore(301)).toBe(300);
    expect(clampScore(999)).toBe(300);
  });
});

// ── createEmptyMatch ─────────────────────────────────────────────────────────

describe('createEmptyMatch', () => {
  it('creates a match with correct match number', () => {
    const match = createEmptyMatch(3, 4);
    expect(match.matchNumber).toBe(3);
  });

  it('creates correct number of players per team', () => {
    const match = createEmptyMatch(1, 4);
    expect(match.team1.players).toHaveLength(4);
    expect(match.team2.players).toHaveLength(4);
  });

  it('initialises all player pins as empty string', () => {
    const match = createEmptyMatch(1, 2);
    match.team1.players.forEach(p => expect(p.pins).toBe(''));
    match.team2.players.forEach(p => expect(p.pins).toBe(''));
  });

  it('initialises points and totals to 0', () => {
    const match = createEmptyMatch(1, 2);
    expect(match.team1.points).toBe(0);
    expect(match.team1.totalPins).toBe(0);
    expect(match.team1.totalWithHandicap).toBe(0);
    expect(match.team1.bonusPoints).toBe(0);
    expect(match.team2.points).toBe(0);
  });

  it('creates correct number of playerMatches', () => {
    const match = createEmptyMatch(1, 3);
    expect(match.playerMatches).toHaveLength(3);
    match.playerMatches.forEach(pm => {
      expect(pm.result).toBeNull();
      expect(pm.team1Points).toBe(0);
      expect(pm.team2Points).toBe(0);
    });
  });
});

// ── calculateBonusPoints ─────────────────────────────────────────────────────

describe('calculateBonusPoints', () => {
  const vsAverageRules: BonusRule[] = [
    { type: 'player', condition: 'vs_average', threshold: 50, points: 1 },
    { type: 'player', condition: 'vs_average', threshold: 70, points: 2 },
  ];

  it('returns 0 for absent player', () => {
    expect(calculateBonusPoints('220', 150, true, vsAverageRules)).toBe(0);
  });

  it('returns 0 for empty score string', () => {
    expect(calculateBonusPoints('', 150, false, vsAverageRules)).toBe(0);
  });

  it('returns 0 when average is 0', () => {
    expect(calculateBonusPoints('200', 0, false, vsAverageRules)).toBe(0);
  });

  it('returns 0 when no bonus rules provided', () => {
    expect(calculateBonusPoints('220', 150, false, null)).toBe(0);
    expect(calculateBonusPoints('220', 150, false, [])).toBe(0);
  });

  it('awards highest matching vs_average bonus (score >= avg + 70 → 2 pts)', () => {
    // average 150, threshold 70: 150+70=220; score 221 → +2
    expect(calculateBonusPoints('221', 150, false, vsAverageRules)).toBe(2);
  });

  it('awards lower bonus when score meets threshold 50 but not 70', () => {
    // score 200: 200 >= 150+50(200)=true, 200 >= 150+70(220)=false → 1 pt
    expect(calculateBonusPoints('200', 150, false, vsAverageRules)).toBe(1);
  });

  it('awards 0 when score is below all thresholds', () => {
    // score 180: 180 < 200 → 0
    expect(calculateBonusPoints('180', 150, false, vsAverageRules)).toBe(0);
  });

  it('handles pure_score condition', () => {
    const pureRules: BonusRule[] = [
      { type: 'player', condition: 'pure_score', threshold: 200, points: 1 },
    ];
    expect(calculateBonusPoints('200', 150, false, pureRules)).toBe(1);
    expect(calculateBonusPoints('199', 150, false, pureRules)).toBe(0);
  });

  it('ignores team-type rules', () => {
    const teamRules: BonusRule[] = [
      { type: 'team', condition: 'vs_average', threshold: 10, points: 5 },
    ];
    expect(calculateBonusPoints('200', 150, false, teamRules)).toBe(0);
  });
});

// ── validateMatch ────────────────────────────────────────────────────────────

describe('validateMatch', () => {
  it('returns false when game has no matches', () => {
    const game = makeGame({ matches: undefined });
    expect(validateMatch(game, 0)).toBe(false);
  });

  it('returns false when match index is out of range', () => {
    const game = makeGame();
    expect(validateMatch(game, 5)).toBe(false);
  });

  it('returns true when all scores are valid', () => {
    const game = makeGame();
    expect(validateMatch(game, 0)).toBe(true);
  });

  it('returns true when a player is absent (no pins required)', () => {
    const game = makeGame();
    game.team1!.players[0]!.absent = true;
    // Clear the pin entry to simulate absent state
    game.matches![0]!.team1.players[0]!.pins = '';
    expect(validateMatch(game, 0)).toBe(true);
  });

  it('returns false when team2 player has empty pins', () => {
    const game = makeGame();
    game.matches![0]!.team2.players[0]!.pins = '';
    expect(validateMatch(game, 0)).toBe(false);
  });

  it('returns false when pins are out of range (> 300)', () => {
    const game = makeGame();
    game.matches![0]!.team1.players[0]!.pins = '999';
    expect(validateMatch(game, 0)).toBe(false);
  });
});

// ── calculateMatchResults ────────────────────────────────────────────────────

describe('calculateMatchResults', () => {
  it('sets team1 as winner when team1 score > team2 score', () => {
    const game = makeGame();
    // Alice: 180 vs Bob: 160
    calculateMatchResults(game, 0);
    const pm = game.matches![0]!.playerMatches[0]!;
    expect(pm.result).toBe('team1');
    expect(pm.team1Points).toBe(1);
    expect(pm.team2Points).toBe(0);
  });

  it('sets team2 as winner when team2 score > team1 score', () => {
    const game = makeGame();
    game.matches![0]!.team1.players[0]!.pins = '150';
    game.matches![0]!.team2.players[0]!.pins = '180';
    calculateMatchResults(game, 0);
    const pm = game.matches![0]!.playerMatches[0]!;
    expect(pm.result).toBe('team2');
    expect(pm.team1Points).toBe(0);
    expect(pm.team2Points).toBe(1);
  });

  it('sets draw when both scores are equal', () => {
    const game = makeGame();
    game.matches![0]!.team1.players[0]!.pins = '170';
    game.matches![0]!.team2.players[0]!.pins = '170';
    calculateMatchResults(game, 0);
    const pm = game.matches![0]!.playerMatches[0]!;
    expect(pm.result).toBe('draw');
    expect(pm.team1Points).toBe(0.5);
    expect(pm.team2Points).toBe(0.5);
  });

  it('sets draw when both players are absent', () => {
    const game = makeGame();
    game.team1!.players[0]!.absent = true;
    game.team2!.players[0]!.absent = true;
    calculateMatchResults(game, 0);
    const pm = game.matches![0]!.playerMatches[0]!;
    expect(pm.result).toBe('draw');
  });

  it('does not calculate when one player has no score entered', () => {
    const game = makeGame();
    game.matches![0]!.team2.players[0]!.pins = '';
    calculateMatchResults(game, 0);
    const pm = game.matches![0]!.playerMatches[0]!;
    expect(pm.result).toBeNull();
    expect(pm.team1Points).toBe(0);
    expect(pm.team2Points).toBe(0);
  });

  it('calculates totalPins correctly', () => {
    const game = makeGame();
    // Alice: 180, Bob: 160
    calculateMatchResults(game, 0);
    expect(game.matches![0]!.team1.totalPins).toBe(180);
    expect(game.matches![0]!.team2.totalPins).toBe(160);
  });

  it('includes handicap in totalWithHandicap', () => {
    const game = makeGame();
    game.team1!.players[0]!.handicap = 20;
    game.team2!.players[0]!.handicap = 10;
    calculateMatchResults(game, 0);
    expect(game.matches![0]!.team1.totalWithHandicap).toBe(200); // 180 + 20
    expect(game.matches![0]!.team2.totalWithHandicap).toBe(170); // 160 + 10
  });

  it('uses absent player score (average - 10) instead of pins', () => {
    const game = makeGame();
    // Alice absent: average 150 → score = 140
    game.team1!.players[0]!.absent = true;
    game.team1!.players[0]!.average = 150;
    game.matches![0]!.team1.players[0]!.pins = '';
    calculateMatchResults(game, 0);
    expect(game.matches![0]!.team1.totalPins).toBe(140);
  });

  it('returns early when game has no matches', () => {
    const game = makeGame({ matches: undefined });
    // Should not throw
    expect(() => calculateMatchResults(game, 0)).not.toThrow();
  });

  it('applies team match winner points when all scores are entered', () => {
    const game = makeGame({ teamMatchPointsPerWin: 2 });
    // Alice: 180 > Bob: 160 → team1 wins the match winner bonus
    calculateMatchResults(game, 0);
    // team1 player wins (1 pt) + match winner (2 pts) = 3
    expect(game.matches![0]!.team1.points).toBe(3);
    expect(game.matches![0]!.team2.points).toBe(0);
  });

  it('skips player result when player is undefined (extra player in match)', () => {
    const game = makeGame();
    // Add a second playerMatch slot but only one player per team → player at idx 1 is undefined
    game.matches![0]!.playerMatches.push({ player: 2, result: null, team1Points: 0, team2Points: 0 });
    calculateMatchResults(game, 0);
    const pm = game.matches![0]!.playerMatches[1]!;
    expect(pm.result).toBeNull();
    expect(pm.team1Points).toBe(0);
    expect(pm.team2Points).toBe(0);
  });
});

// ── calcGamePoints ───────────────────────────────────────────────────────────

describe('calcGamePoints', () => {
  it('returns team1 winner when team1 has more points', () => {
    const game = makeGame({ grandTotalPoints: { team1: 2, team2: 0 } });
    game.matches![0]!.team1.points = 3;
    game.matches![0]!.team2.points = 1;
    const result = calcGamePoints(game);
    expect(result.team1).toBe(5);
    expect(result.team2).toBe(1);
    expect(result.winner).toBe('team1');
  });

  it('returns team2 winner when team2 has more points', () => {
    const game = makeGame({ grandTotalPoints: { team1: 0, team2: 2 } });
    game.matches![0]!.team1.points = 1;
    game.matches![0]!.team2.points = 3;
    const result = calcGamePoints(game);
    expect(result.winner).toBe('team2');
  });

  it('returns tie when both teams have equal points', () => {
    const game = makeGame({ grandTotalPoints: { team1: 1, team2: 1 } });
    game.matches![0]!.team1.points = 2;
    game.matches![0]!.team2.points = 2;
    const result = calcGamePoints(game);
    expect(result.winner).toBe('tie');
  });

  it('includes all-present bonus when enabled and all players present', () => {
    const game = makeGame({
      teamAllPresentBonusEnabled: true,
      teamAllPresentBonusPoints: 1,
      grandTotalPoints: { team1: 2, team2: 0 },
    });
    game.matches![0]!.team1.points = 3;
    game.matches![0]!.team2.points = 1;
    // both teams have no absent players → both get bonus
    const result = calcGamePoints(game);
    expect(result.team1).toBe(6); // 3 match + 2 grand + 1 bonus
    expect(result.team2).toBe(2); // 1 match + 0 grand + 1 bonus
  });

  it('does not include bonus when disabled', () => {
    const game = makeGame({
      teamAllPresentBonusEnabled: false,
      teamAllPresentBonusPoints: 1,
      grandTotalPoints: { team1: 2, team2: 0 },
    });
    game.matches![0]!.team1.points = 3;
    const result = calcGamePoints(game);
    expect(result.team1).toBe(5); // no bonus
  });

  it('handles no matches gracefully', () => {
    const game = makeGame({ matches: [], grandTotalPoints: { team1: 0, team2: 0 } });
    const result = calcGamePoints(game);
    expect(result.team1).toBe(0);
    expect(result.team2).toBe(0);
    expect(result.winner).toBe('tie');
  });
});
