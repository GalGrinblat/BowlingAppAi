import { useState, useEffect } from 'react';
import { gamesApi } from '../services/api';
import { createEmptyMatch } from '../utils/matchUtils';
import { buildGameTeamsFromIds } from '../utils/gameInitUtils';
import { recalculatePlayerAveragesAndHandicaps } from './usePlayerAverages';
import type { Game, GameMatch, MatchPlayer, GamePlayer } from '../types/index';

interface GameInitResult {
  game: Game | null;
  showSummary: boolean;
  showPreMatch: boolean;
  currentMatch: number;
  team1Players: GamePlayer[];
  team2Players: GamePlayer[];
}

async function fetchAndAssignTeams(gameObj: Game) {
  if (!gameObj.team1Id || !gameObj.team2Id) return;
  const teams = await buildGameTeamsFromIds(gameObj.team1Id, gameObj.team2Id);
  if (!teams) return;
  gameObj.team1 = teams.team1;
  gameObj.team2 = teams.team2;
}

export function useGameInitializer(gameId: string): GameInitResult & {
  setGame: React.Dispatch<React.SetStateAction<Game | null>>;
  setShowSummary: React.Dispatch<React.SetStateAction<boolean>>;
  setShowPreMatch: React.Dispatch<React.SetStateAction<boolean>>;
  setCurrentMatch: React.Dispatch<React.SetStateAction<number>>;
  setTeam1Players: React.Dispatch<React.SetStateAction<GamePlayer[]>>;
  setTeam2Players: React.Dispatch<React.SetStateAction<GamePlayer[]>>;
} {
  const [game, setGame] = useState<Game | null>(null);
  const [currentMatch, setCurrentMatch] = useState<number>(1);
  const [showSummary, setShowSummary] = useState<boolean>(false);
  const [showPreMatch, setShowPreMatch] = useState<boolean>(false);
  const [team1Players, setTeam1Players] = useState<GamePlayer[]>([]);
  const [team2Players, setTeam2Players] = useState<GamePlayer[]>([]);

  useEffect(() => {
    let cancelled = false;

    const loadGame = async () => {
      const gameData = await gamesApi.getById(gameId);
      if (cancelled || !gameData) return;

      if (!gameData.team1 || !gameData.team2) {
        await fetchAndAssignTeams(gameData);
      }

      // Initialize matches if empty
      if (!gameData.matches || gameData.matches.length === 0) {
        if (!gameData.team1 || !gameData.team2) return;
        const playersPerTeam = gameData.team1.players.length;
        const matchCount = gameData.matchesPerGame;
        gameData.matches = Array.from({ length: matchCount }, (_, i) =>
          createEmptyMatch(i + 1, playersPerTeam)
        );
        await gamesApi.update(gameId, gameData);
      }

      await recalculatePlayerAveragesAndHandicaps(gameData);
      await gamesApi.update(gameId, gameData);
      if (cancelled) return;
      setGame(gameData);

      if (gameData.team1 && gameData.team2) {
        setTeam1Players(gameData.team1.players);
        setTeam2Players(gameData.team2.players);
      }

      if (gameData.status === 'completed') {
        setShowSummary(true);
      } else {
        const hasAnyScores = gameData.matches.some((m: GameMatch) =>
          m.team1.players.some((p: MatchPlayer) => p.pins !== '') ||
          m.team2.players.some((p: MatchPlayer) => p.pins !== '')
        );

        if (!hasAnyScores) {
          setShowPreMatch(true);
        } else {
          if (!gameData.team1 || !gameData.team2) return;
          const incompleteMatchIndex = gameData.matches.findIndex((m: GameMatch) => {
            const team1Complete = gameData.team1!.players.every((p: GamePlayer, idx: number) =>
              p.absent || (m.team1.players[idx] && m.team1.players[idx].pins !== '')
            );
            const team2Complete = gameData.team2!.players.every((p: GamePlayer, idx: number) =>
              p.absent || (m.team2.players[idx] && m.team2.players[idx].pins !== '')
            );
            return !team1Complete || !team2Complete;
          });

          if (incompleteMatchIndex >= 0) {
            setCurrentMatch(incompleteMatchIndex + 1);
          } else {
            setShowSummary(true);
          }
        }
      }
    };

    loadGame();
    return () => { cancelled = true; };
  }, [gameId]);

  return {
    game, setGame,
    showSummary, setShowSummary,
    showPreMatch, setShowPreMatch,
    currentMatch, setCurrentMatch,
    team1Players, setTeam1Players,
    team2Players, setTeam2Players,
  };
}
