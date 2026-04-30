import { leaguesApi, seasonsApi, teamsApi, gamesApi, playersApi } from '../services/api';
import { logger } from './logger';
import { getPlayerDisplayName } from './playerUtils';
import { downloadFile, getTimestamp } from './fileExportUtils';
import type { League, Season, Team, Game, Player, GameMatch } from '../types/index';

interface LeagueExportData {
  version: string;
  exportDate: string;
  type: 'league';
  league: League;
  seasons: Season[];
  teams: Team[];
  games: Game[];
  players: Player[]; // Players referenced in teams
}

interface SeasonExportData {
  version: string;
  exportDate: string;
  type: 'season';
  league: League;
  season: Season;
  teams: Team[];
  games: Game[];
  players: Player[]; // Players referenced in teams
}

/**
 * Export a complete league with all its seasons, teams, and games
 */
export async function exportLeague(leagueId: string): Promise<LeagueExportData | null> {
  const league = await leaguesApi.getById(leagueId);
  if (!league) return null;

  const seasons = await seasonsApi.getByLeague(leagueId);
  const allTeams: Team[] = [];
  const allGames: Game[] = [];
  const playerIds = new Set<string>();

  // Gather all teams and games from all seasons
  for (const season of seasons) {
    const teams = await teamsApi.getBySeason(season.id);
    const games = await gamesApi.getBySeason(season.id);

    allTeams.push(...teams);
    allGames.push(...games);

    // Collect player IDs from teams
    teams.forEach(team => {
      team.playerIds.forEach(id => playerIds.add(id));
    });
  }

  // Get all referenced players
  const playerResults = await Promise.all(
    Array.from(playerIds).map(id => playersApi.getById(id))
  );
  const players = playerResults.filter((p): p is Player => p !== undefined && p !== null);

  return {
    version: '1.0.0',
    exportDate: new Date().toISOString(),
    type: 'league',
    league,
    seasons,
    teams: allTeams,
    games: allGames,
    players,
  };
}

/**
 * Export a single season with its teams and games
 */
export async function exportSeason(seasonId: string): Promise<SeasonExportData | null> {
  const season = await seasonsApi.getById(seasonId);
  if (!season) return null;

  const league = await leaguesApi.getById(season.leagueId);
  if (!league) return null;

  const teams = await teamsApi.getBySeason(seasonId);
  const games = await gamesApi.getBySeason(seasonId);
  const playerIds = new Set<string>();

  // Collect player IDs from teams
  teams.forEach(team => {
    team.playerIds.forEach(id => playerIds.add(id));
  });

  // Get all referenced players
  const playerResults = await Promise.all(
    Array.from(playerIds).map(id => playersApi.getById(id))
  );
  const players = playerResults.filter((p): p is Player => p !== undefined && p !== null);

  return {
    version: '1.0.0',
    exportDate: new Date().toISOString(),
    type: 'season',
    league,
    season,
    teams,
    games,
    players,
  };
}

/**
 * Import a league or season from exported data
 */
export async function importLeagueOrSeason(
  data: LeagueExportData | SeasonExportData
): Promise<{ success: boolean; error?: string; leagueId?: string; seasonId?: string }> {
  try {
    // Validate data structure
    if (!data.version || !data.exportDate || !data.type) {
      return { success: false, error: 'Invalid export file format' };
    }

    // Map old player IDs to new ones (or existing ones)
    const playerIdMap = new Map<string, string>();
    const existingPlayers = await playersApi.getAll();

    for (const exportedPlayer of data.players) {
      // Check if player already exists by first + last name
      const exportedDisplayName = getPlayerDisplayName(exportedPlayer);
      const existing = existingPlayers.find(
        p => getPlayerDisplayName(p).toLowerCase() === exportedDisplayName.toLowerCase()
      );

      if (existing) {
        // Use existing player
        playerIdMap.set(exportedPlayer.id, existing.id);
      } else {
        // Create new player
        const newPlayer = await playersApi.create({
          firstName: exportedPlayer.firstName,
          lastName: exportedPlayer.lastName,
          middleName: exportedPlayer.middleName,
          active: exportedPlayer.active,
        });
        playerIdMap.set(exportedPlayer.id, newPlayer.id);
      }
    }

    if (data.type === 'league') {
      return await importLeagueData(data, playerIdMap);
    } else {
      return await importSeasonData(data, playerIdMap);
    }
  } catch (error) {
    logger.error('Import error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error during import'
    };
  }
}

async function importLeagueData(
  data: LeagueExportData,
  playerIdMap: Map<string, string>
): Promise<{ success: boolean; error?: string; leagueId?: string }> {
  // Create new league (with new ID)
  const newLeague = await leaguesApi.create({
    name: `${data.league.name} (Imported)`,
    description: data.league.description,
    dayOfWeek: data.league.dayOfWeek,
    defaultSeasonConfigurations: data.league.defaultSeasonConfigurations,
    active: data.league.active,
  });

  // Map old season/team/game IDs to new ones
  const seasonIdMap = new Map<string, string>();
  const teamIdMap = new Map<string, string>();

  // Import seasons
  for (const season of data.seasons) {
    const newSeason = await seasonsApi.create({
      name: season.name,
      leagueId: newLeague.id,
      startDate: season.startDate,
      endDate: season.endDate || season.startDate,
      seasonConfigurations: season.seasonConfigurations,
      status: season.status,
    });
    seasonIdMap.set(season.id, newSeason.id);
  }

  // Import teams
  for (const team of data.teams) {
    const newSeasonId = seasonIdMap.get(team.seasonId);
    if (!newSeasonId) continue;

    // Map player IDs
    const newPlayerIds = team.playerIds
      .map(oldId => playerIdMap.get(oldId))
      .filter((id): id is string => id !== undefined);

    const newTeam = await teamsApi.create({
      name: team.name,
      seasonId: newSeasonId,
      playerIds: newPlayerIds,
      rosterChanges: team.rosterChanges || [],
    });
    teamIdMap.set(team.id, newTeam.id);
  }

  // Import games
  for (const game of data.games) {
    const newSeasonId = seasonIdMap.get(game.seasonId);
    const newTeam1Id = teamIdMap.get(game.team1Id);
    const newTeam2Id = teamIdMap.get(game.team2Id);

    if (!newSeasonId || !newTeam1Id || !newTeam2Id) continue;

    // Map player IDs in matches if they exist
    const newMatches = (game.matches ? game.matches.map(match => ({
      ...match,
      team1: Array.isArray(match.team1) ? match.team1.map((player: Record<string, string>) => {
        if (!player.playerId) throw new Error('Missing playerId in match.team1');
        return {
          ...player,
          playerId: playerIdMap.get(player.playerId) || player.playerId,
        };
      }) : match.team1,
      team2: Array.isArray(match.team2) ? match.team2.map((player: Record<string, string>) => {
        if (!player.playerId) throw new Error('Missing playerId in match.team2');
        return {
          ...player,
          playerId: playerIdMap.get(player.playerId) || player.playerId,
        };
      }) : match.team2,
    })) : []) as GameMatch[];
    
    // Find the season config for this game to get required fields
    const seasonConfig = data.seasons.find(s => s.id === game.seasonId);
    if (!seasonConfig) continue;
    const sCfg = seasonConfig.seasonConfigurations;

    await gamesApi.create({
      seasonId: newSeasonId,
      team1Id: newTeam1Id,
      team2Id: newTeam2Id,
      round: game.round,
      matchDay: game.matchDay,
      scheduledDate: game.scheduledDate,
      matches: newMatches,
      playerMatchPointsPerWin: sCfg.playerMatchPointsPerWin,
      teamMatchPointsPerWin: sCfg.teamMatchPointsPerWin,
      teamGamePointsPerWin: sCfg.teamGamePointsPerWin,
      useHandicap: sCfg.useHandicap,
      matchesPerGame: sCfg.matchesPerGame,
      lineupStrategy: sCfg.lineupStrategy,
      lineupRule: sCfg.lineupRule,
      teamAllPresentBonusEnabled: sCfg.teamAllPresentBonusEnabled,
      teamAllPresentBonusPoints: sCfg.teamAllPresentBonusPoints,
      bonusRules: sCfg.bonusRules,
      postponed: game.postponed || false,
      originalDate: game.originalDate ?? undefined,
    });
  }

  return { success: true, leagueId: newLeague.id };
}

async function importSeasonData(
  data: SeasonExportData,
  playerIdMap: Map<string, string>
): Promise<{ success: boolean; error?: string; seasonId?: string }> {
  // Check if league already exists (by name)
  const existingLeagues = await leaguesApi.getAll();
  let targetLeague = existingLeagues.find(
    l => l.name.toLowerCase() === data.league.name.toLowerCase()
  );

  // If league doesn't exist, create it
  if (!targetLeague) {
    targetLeague = await leaguesApi.create({
      name: data.league.name,
      description: data.league.description,
      dayOfWeek: data.league.dayOfWeek,
      defaultSeasonConfigurations: data.league.defaultSeasonConfigurations,
      active: data.league.active,
    });
  }

  // Create season
  const newSeason = await seasonsApi.create({
    name: `${data.season.name} (Imported)`,
    leagueId: targetLeague.id,
    startDate: data.season.startDate,
    endDate: data.season.endDate || data.season.startDate,
    seasonConfigurations: data.season.seasonConfigurations,
    status: data.season.status,
  });

  // Map team IDs
  const teamIdMap = new Map<string, string>();

  // Import teams
  for (const team of data.teams) {
    // Map player IDs
    const newPlayerIds = team.playerIds
      .map(oldId => playerIdMap.get(oldId))
      .filter((id): id is string => id !== undefined);

    const newTeam = await teamsApi.create({
      name: team.name,
      seasonId: newSeason.id,
      playerIds: newPlayerIds,
      rosterChanges: team.rosterChanges || [],
    });
    teamIdMap.set(team.id, newTeam.id);
  }

  // Import games
  for (const game of data.games) {
    const newTeam1Id = teamIdMap.get(game.team1Id);
    const newTeam2Id = teamIdMap.get(game.team2Id);

    if (!newTeam1Id || !newTeam2Id) continue;

    // Map player IDs in matches if they exist
    const newMatches = (game.matches ? game.matches.map(match => ({
      ...match,
      team1: Array.isArray(match.team1) ? match.team1.map((player: Record<string, string>) => {
        if (!player.playerId) throw new Error('Missing playerId in match.team1');
        return {
          ...player,
          playerId: playerIdMap.get(player.playerId) || player.playerId,
        };
      }) : match.team1,
      team2: Array.isArray(match.team2) ? match.team2.map((player: Record<string, string>) => {
        if (!player.playerId) throw new Error('Missing playerId in match.team2');
        return {
          ...player,
          playerId: playerIdMap.get(player.playerId) || player.playerId,
        };
      }) : match.team2,
    })) : []) as GameMatch[];

    // Find the season config for this game to get required fields
    const sCfg = data.season.seasonConfigurations;

    await gamesApi.create({
      seasonId: newSeason.id,
      team1Id: newTeam1Id,
      team2Id: newTeam2Id,
      round: game.round,
      matchDay: game.matchDay,
      scheduledDate: game.scheduledDate,
      matches: newMatches,
      matchesPerGame: sCfg.matchesPerGame,
      useHandicap: sCfg.useHandicap,
      lineupStrategy: sCfg.lineupStrategy,
      lineupRule: sCfg.lineupRule,
      teamAllPresentBonusEnabled: sCfg.teamAllPresentBonusEnabled,
      teamAllPresentBonusPoints: sCfg.teamAllPresentBonusPoints,
      playerMatchPointsPerWin: sCfg.playerMatchPointsPerWin,
      teamMatchPointsPerWin: sCfg.teamMatchPointsPerWin,
      teamGamePointsPerWin: sCfg.teamGamePointsPerWin,
      bonusRules: sCfg.bonusRules,
      postponed: game.postponed || false,
      originalDate: game.originalDate ?? undefined,
    });
  }

  return { success: true, seasonId: newSeason.id };
}

/**
 * Download league or season export as JSON file
 */
export function downloadExportFile(
  data: LeagueExportData | SeasonExportData,
  filename: string
): void {
  const jsonString = JSON.stringify(data, null, 2);
  downloadFile(jsonString, `${filename}_${getTimestamp()}.json`, 'application/json');
}

/**
 * Read and parse an import file
 */
export function readImportFile(file: File): Promise<LeagueExportData | SeasonExportData> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const data = JSON.parse(text);
        resolve(data);
      } catch {
        reject(new Error('Failed to parse JSON file'));
      }
    };

    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };

    reader.readAsText(file);
  });
}
