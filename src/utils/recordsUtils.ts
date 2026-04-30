/**
 * Utilities for calculating season records
 */

import { Game, GameMatch, GamePlayer, MatchPlayer, PlayerRecordEntry, TeamRecordEntry, Team } from '../types/index';

interface PlayerSeasonRecordEntry {
  playerRecordEntry: PlayerRecordEntry;
  teamId: string;
  teamName: string;
  matchDay: number;
  round: number;
}

interface TeamSeasonRecordEntry {
  teamRecordEntry: TeamRecordEntry;
  matchDay: number;
  round: number;
}

interface SeasonRecords {
  highestPlayerMatchScores: PlayerSeasonRecordEntry[];
  highestPlayerSeries: PlayerSeasonRecordEntry[];
  highestTeamMatchScores: TeamSeasonRecordEntry[];
  highestTeamGameTotals: TeamSeasonRecordEntry[];
}

/**
 * Calculate all season records from games data
 */
export function calculateSeasonRecords(teams: Team[], games: Game[]): SeasonRecords {
  const completedGames = games.filter(g => g.status === 'completed');
  
  const highestPlayerMatchScores: PlayerSeasonRecordEntry[] = [];
  const highestPlayerSeries: PlayerSeasonRecordEntry[] = [];
  const highestTeamMatchScores: TeamSeasonRecordEntry[] = [];
  const highestTeamGameTotals: TeamSeasonRecordEntry[] = [];

  // Helper to process both teams
  function processTeam(
    team: Team,
    gameTeam: GamePlayer[] | undefined,
    matchTeam: (match: GameMatch) => { players?: MatchPlayer[] },
    game: Game,
    match: GameMatch,
    isLastMatch: boolean,
    teamGameTotalRef: { value: number },
    teamMatchCountRef: { value: number },
    highestPlayerMatchScores: PlayerSeasonRecordEntry[],
    highestPlayerSeries: PlayerSeasonRecordEntry[]
  ) {
    if (!gameTeam) return;
    gameTeam.forEach((player: GamePlayer, playerIndex: number) => {
      if (!player) return;
      const matchPlayer = matchTeam(match).players?.[playerIndex];
      if (!matchPlayer || player.absent) return;
      const pins = parseInt(matchPlayer.pins) || 0;
      // Add to team game total
      teamGameTotalRef.value += pins;
      teamMatchCountRef.value++;
      // Track highest match score
      const playerRecordEntry: PlayerRecordEntry = {
        playerId: player.playerId,
        playerName: player.name,
        recordType: 'singleMatch',
        value: pins,
        numberOfGames: 1,
        date: game.scheduledDate || '',
      };
      highestPlayerMatchScores.push({
        playerRecordEntry: playerRecordEntry,
        teamId: team.id,
        teamName: team.name,
        matchDay: game.matchDay,
        round: game.round
      });
      // Track player series
      if (isLastMatch) {
        let playerSeries = 0;
        let numberOfGames = 0;
        game.matches?.forEach((m: GameMatch) => {
          const mp = matchTeam(m).players?.[playerIndex];
          const gp = gameTeam?.[playerIndex];
          if (mp && gp && !gp.absent && mp.pins !== '') {
            const p = parseInt(mp.pins) || 0;
            playerSeries += p;
            numberOfGames++;
          }
        });
        if (playerSeries > 0) {
          const playerRecordEntry: PlayerRecordEntry = {
            playerId: player.playerId,
            playerName: player.name,
            recordType: 'series',
            value: playerSeries,
            numberOfGames: numberOfGames,
            date: game.scheduledDate || '',
          };
          highestPlayerSeries.push({
            playerRecordEntry: playerRecordEntry,
            teamId: team.id,
            teamName: team.name,
            matchDay: game.matchDay,
            round: game.round
          });
        }
      }
    });
  }

  // Helper for team match totals
  function getTeamMatchTotal(matchPlayers: MatchPlayer[] | undefined, gamePlayers: GamePlayer[] | undefined) {
    let total = 0;
    if (matchPlayers && gamePlayers) {
      matchPlayers.forEach((mp, idx) => {
        const player = gamePlayers[idx];
        if (mp && player && !player.absent && mp.pins !== '') {
          const pins = parseInt(mp.pins) || 0;
          total += pins;
        }
      });
    }
    return total;
  }

  // Process each completed game
  completedGames.forEach(game => {
    const team1 = teams.find(t => t.id === game.team1Id);
    const team2 = teams.find(t => t.id === game.team2Id);
    if (!team1 || !team2 || !game.matches) return;
    const team1GameTotalRef = { value: 0 };
    const team1MatchCountRef = { value: 0 };
    const team2GameTotalRef = { value: 0 };
    const team2MatchCountRef = { value: 0 };
    game.matches.forEach((match: GameMatch, matchIndex: number) => {
      if (!match.team1 || !match.team2) return;
      
      // Process both teams using helper
      processTeam(
        team1,
        game.team1?.players,
        (m) => m.team1,
        game,
        match,
        matchIndex === ((game.matches?.length ?? 0) - 1),
        team1GameTotalRef,
        team1MatchCountRef,
        highestPlayerMatchScores,
        highestPlayerSeries
      );
      processTeam(
        team2,
        game.team2?.players,
        (m) => m.team2,
        game,
        match,
        matchIndex === ((game.matches?.length ?? 0) - 1),
        team2GameTotalRef,
        team2MatchCountRef,
        highestPlayerMatchScores,
        highestPlayerSeries
      );
      // Team match totals
      const team1MatchTotal = getTeamMatchTotal(match.team1.players, game.team1?.players);
      const team2MatchTotal = getTeamMatchTotal(match.team2.players, game.team2?.players);
      if (team1MatchTotal > 0) {
        const teamRecordEntry: TeamRecordEntry = {
          recordType: 'singleMatch',
          value: team1MatchTotal,
          date: game.scheduledDate || '',
          teamId: team1.id,
          teamName: team1.name,
          numberOfGames: 1,
          playerIds: team1.playerIds
        };
        highestTeamMatchScores.push({
          teamRecordEntry: teamRecordEntry,
          matchDay: game.matchDay,
          round: game.round
        });
      }
      if (team2MatchTotal > 0) {
        const teamRecordEntry: TeamRecordEntry = {
          recordType: 'singleMatch',
          value: team2MatchTotal,
          date: game.scheduledDate || '',
          teamId: team2.id,
          teamName: team2.name,
          numberOfGames: 1,
          playerIds: team2.playerIds
        };
        highestTeamMatchScores.push({
          teamRecordEntry: teamRecordEntry,
          matchDay: game.matchDay,
          round: game.round
        });
      }
    });
    // Team game totals
    if (team1GameTotalRef.value > 0) {
      const teamRecordEntry: TeamRecordEntry = {
        recordType: 'series',
        value: team1GameTotalRef.value,
        date: game.scheduledDate || '',
        teamId: team1.id,
        teamName: team1.name,
        numberOfGames: team1MatchCountRef.value,
        playerIds: team1.playerIds
      };
      highestTeamGameTotals.push({
        teamRecordEntry: teamRecordEntry,
        matchDay: game.matchDay,
        round: game.round
      });
    }
    if (team2GameTotalRef.value > 0) {
      const teamRecordEntry: TeamRecordEntry = {
        recordType: 'series',
        value: team2GameTotalRef.value,
        date: game.scheduledDate || '',
        teamId: team2.id,
        teamName: team2.name,
        numberOfGames: team2MatchCountRef.value,
        playerIds: team2.playerIds
      };
      highestTeamGameTotals.push({
        teamRecordEntry: teamRecordEntry,
        matchDay: game.matchDay,
        round: game.round
      });
    }
  });

  // Sort and get top 3 for each category
  return {
    highestPlayerMatchScores: highestPlayerMatchScores
      .sort((a, b) => b.playerRecordEntry.value - a.playerRecordEntry.value)
      .slice(0, 3),
    highestPlayerSeries: highestPlayerSeries
      .sort((a, b) => b.playerRecordEntry.value - a.playerRecordEntry.value)
      .slice(0, 3),
    highestTeamMatchScores: highestTeamMatchScores
      .sort((a, b) => b.teamRecordEntry.value - a.teamRecordEntry.value)
      .slice(0, 3),
    highestTeamGameTotals: highestTeamGameTotals
      .sort((a, b) => b.teamRecordEntry.value - a.teamRecordEntry.value)
      .slice(0, 3)
  };
}

/**
 * Format date for display
 * @param {String} date - Date string
 * @param {String} locale - Optional locale for date formatting (defaults to 'en-US')
 * @returns {String} Formatted date string
 */
export function formatRecordDate(date: string, locale: string = 'en-US'): string {
  if (!date) return 'N/A';
  const d = new Date(date);
  return d.toLocaleDateString(locale, { month: 'short', day: 'numeric', year: 'numeric' });
}
