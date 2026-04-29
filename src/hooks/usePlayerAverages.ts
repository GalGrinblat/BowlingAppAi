import { seasonsApi, gamesApi } from '../services/api';
import { calculateCurrentPlayerAverages } from '../utils/standingsUtils';
import type { Game, GamePlayer } from '../types/index';

export async function recalculatePlayerAveragesAndHandicaps(gameData: Game) {
  const [season, allGames] = await Promise.all([
    seasonsApi.getById(gameData.seasonId),
    gamesApi.getBySeason(gameData.seasonId),
  ]);
  if (!season) return;

  const useHandicap = season.seasonConfigurations.useHandicap ?? false;
  const handicapBasis = season.seasonConfigurations.handicapBasis ?? 0;
  const handicapPercentage = season.seasonConfigurations.handicapPercentage ?? 0;

  const completedGames = allGames.filter(g =>
    g.status === 'completed' &&
    (g.round < gameData.round || (g.round === gameData.round && g.matchDay < gameData.matchDay))
  );

  const currentAverages = calculateCurrentPlayerAverages(completedGames);

  function updatePlayerAveragesAndHandicaps(players: GamePlayer[] | undefined) {
    if (!players) return [];
    return players.map((player: GamePlayer) => {
      const currentAvg = currentAverages[player.playerId];
      let playerAvg: number;
      if (currentAvg && currentAvg.gamesPlayed > 0) {
        playerAvg = currentAvg.average;
      } else {
        playerAvg = (season && season.initialPlayerAverages && season.initialPlayerAverages[player.playerId] !== undefined)
          ? (season.initialPlayerAverages[player.playerId]?.average ?? 0)
          : (player.average || 0);
      }
      let handicap = 0;
      if (useHandicap && playerAvg > 0 && playerAvg < handicapBasis) {
        const diff = handicapBasis - playerAvg;
        handicap = Math.floor(diff * (handicapPercentage / 100));
      }
      return { ...player, average: playerAvg, handicap };
    });
  }

  if (gameData.team1) {
    gameData.team1.players = updatePlayerAveragesAndHandicaps(gameData.team1.players);
  }
  if (gameData.team2) {
    gameData.team2.players = updatePlayerAveragesAndHandicaps(gameData.team2.players);
  }
}
