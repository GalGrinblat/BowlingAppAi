import type { Game, GameMatch, Team } from '../types/index';

/**
 * Head-to-Head Statistics Utilities
 * Calculate matchup records between teams
 */

export interface HeadToHeadStats {
  gamesPlayed: number;
  team1Wins: number;
  team2Wins: number;
  ties: number;
  team1TotalPoints: number;
  team2TotalPoints: number;
  team1AvgPoints: number;
  team2AvgPoints: number;
  lastMeetingDate: string | null;
  winStreak: { team: string; count: number } | null;
}

/**
 * Calculate head-to-head record between two teams
 * @param {string} team1Id - First team ID
 * @param {string} team2Id - Second team ID
 * @param {Array} games - All games in the season
 * @returns {object} Head-to-head statistics
 */
export const calculateHeadToHead = (team1Id: string, team2Id: string, games: Game[]): HeadToHeadStats => {
  // Filter games between these two teams
  const matchups = games.filter(game => 
    (game.team1Id === team1Id && game.team2Id === team2Id) ||
    (game.team1Id === team2Id && game.team2Id === team1Id)
  );

  // Filter only completed games
  const completedMatchups = matchups.filter(game => game.status === 'completed');

  if (completedMatchups.length === 0) {
    return {
      gamesPlayed: 0,
      team1Wins: 0,
      team2Wins: 0,
      ties: 0,
      team1TotalPoints: 0,
      team2TotalPoints: 0,
      team1AvgPoints: 0,
      team2AvgPoints: 0,
      lastMeetingDate: null,
      winStreak: null // e.g., { team: 'team1', count: 2 }
    };
  }

  let team1Wins = 0;
  let team2Wins = 0;
  let ties = 0;
  let team1TotalPoints = 0;
  let team2TotalPoints = 0;

  // Sort by completion date to track streaks
  const sortedGames = [...completedMatchups].sort((a, b) => 
    new Date(a.completedAt || '').getTime() - new Date(b.completedAt || '').getTime()
  );

  sortedGames.forEach(game => {
    // Calculate total points for each team
    const matchPoints1 = game.matches?.reduce((sum, m) => sum + (m.team1?.points || 0), 0) || 0;
    const matchPoints2 = game.matches?.reduce((sum, m) => sum + (m.team2?.points || 0), 0) || 0;
    const grand1 = game.grandTotalPoints?.team1 || 0;
    const grand2 = game.grandTotalPoints?.team2 || 0;
    
    const game1Total = matchPoints1 + grand1;
    const game2Total = matchPoints2 + grand2;

    // Determine winner (accounting for which team is which in this game)
    const isTeam1Home = game.team1Id === team1Id;
    
    if (isTeam1Home) {
      team1TotalPoints += game1Total;
      team2TotalPoints += game2Total;
      
      if (game1Total > game2Total) {
        team1Wins++;
      } else if (game2Total > game1Total) {
        team2Wins++;
      } else {
        ties++;
      }
    } else {
      team1TotalPoints += game2Total;
      team2TotalPoints += game1Total;
      
      if (game2Total > game1Total) {
        team1Wins++;
      } else if (game1Total > game2Total) {
        team2Wins++;
      } else {
        ties++;
      }
    }
  });

  // Calculate current win streak
  let currentStreak = 0;
  let streakTeam = null;

  for (let i = sortedGames.length - 1; i >= 0; i--) {
    const game = sortedGames[i];
    if (!game) continue;
    const matchPoints1 = game.matches?.reduce((sum: number, m: GameMatch) => sum + (m.team1?.points || 0), 0) || 0;
    const matchPoints2 = game.matches?.reduce((sum: number, m: GameMatch) => sum + (m.team2?.points || 0), 0) || 0;
    const grand1 = game.grandTotalPoints?.team1 || 0;
    const grand2 = game.grandTotalPoints?.team2 || 0;
    
    const game1Total = matchPoints1 + grand1;
    const game2Total = matchPoints2 + grand2;

    if (game1Total === game2Total) {
      break; // Tie breaks streak
    }

    const isTeam1Home = game.team1Id === team1Id;
    const winner = game1Total > game2Total ? 
                   (isTeam1Home ? 'team1' : 'team2') : 
                   (isTeam1Home ? 'team2' : 'team1');

    if (streakTeam === null) {
      streakTeam = winner;
      currentStreak = 1;
    } else if (streakTeam === winner) {
      currentStreak++;
    } else {
      break; // Different winner, streak ended
    }
  }

  const lastMeeting = sortedGames[sortedGames.length - 1];

  return {
    gamesPlayed: completedMatchups.length,
    team1Wins,
    team2Wins,
    ties,
    team1TotalPoints,
    team2TotalPoints,
    team1AvgPoints: team1TotalPoints / completedMatchups.length,
    team2AvgPoints: team2TotalPoints / completedMatchups.length,
    lastMeetingDate: lastMeeting?.completedAt || null,
    winStreak: currentStreak > 0 && streakTeam ? { team: streakTeam, count: currentStreak } : null
  };
};

/**
 * Get all head-to-head records for a team
 * @param {string} teamId - Team ID
 * @param {Array} allTeams - All teams in the season
 * @param {Array} games - All games in the season
 * @returns {Array} Array of head-to-head records with opponent info
 */
export const getTeamHeadToHeadRecords = (teamId: string, allTeams: Team[], games: Game[]): Array<{teamId: string; teamName: string; record: HeadToHeadStats}> => {
  const opponents = allTeams.filter(t => t.id !== teamId);
  
  return opponents.map(opponent => {
    const h2h = calculateHeadToHead(teamId, opponent.id, games);
    return {
      teamId: opponent.id,
      teamName: opponent.name,
      record: h2h
    };
  }).filter(record => record.record.gamesPlayed > 0);
};

