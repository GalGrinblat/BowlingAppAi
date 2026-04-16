import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { boardApi } from '../../../services/api/boardApi';
import { GameViewLayout } from '../../common/game/GameViewLayout';
import type { Game } from '../../../types/index';

export const BoardGame: React.FC = () => {
  const navigate = useNavigate();
  const { gameId } = useParams<{ gameId: string }>();
  const location = useLocation();
  const [game, setGame] = useState<Game | undefined>(location.state?.game);

  useEffect(() => {
    if (!game && gameId) {
      boardApi.getGameById(gameId).then(data => {
        if (data) setGame(data);
      });
    }
  }, [gameId, game]);

  if (!game) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-blue-600"></div>
      </div>
    );
  }

  return <GameViewLayout game={game} onBack={() => navigate(-1)} />;
};
