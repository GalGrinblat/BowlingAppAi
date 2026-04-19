import React from 'react';
import { useTranslation } from '../../../contexts/LanguageContext';
import { useDateFormat } from '../../../hooks/useDateFormat';
import { calcGamePoints } from '../../../utils/matchUtils';
import { GameScoreSheet } from './GameScoreSheet';
import { PageHeader } from '../PageHeader';
import type { Game } from '../../../types/index';

interface GameViewLayoutProps {
  game: Game;
  onBack: () => void;
}

export const GameViewLayout: React.FC<GameViewLayoutProps> = ({ game, onBack }) => {
  const { t, direction } = useTranslation();
  const { formatDate } = useDateFormat();
  const { team1: team1Points, team2: team2Points, winner } = calcGamePoints(game);

  return (
    <div className="space-y-6" dir={direction}>
      {/* Header */}
      <PageHeader
        title={t('gameHistory.title')}
        subtitle={<>
          {t('common.round')} {game.round} • {t('common.matchDay')} {game.matchDay}
          {game.completedAt && ` • ${t('playerDashboard.completedOn')} ${formatDate(game.completedAt)}`}
        </>}
        back={{ label: t('common.back'), onClick: onBack }}
      />

      {/* Winner Banner */}
      {winner !== 'tie' && (
        <div className="bg-gradient-to-r from-yellow-400 to-orange-500 rounded-xl shadow-lg p-4">
          <div className="text-center">
            <span className="text-2xl font-bold text-gray-900">
              🏆 {t('gameHistory.championBanner')} {winner === 'team1' ? game.team1?.name : game.team2?.name} 🏆
            </span>
          </div>
        </div>
      )}

      {/* Game Summary Table */}
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="bg-gradient-to-r from-purple-600 to-blue-600 p-3">
          <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-white font-bold text-lg text-center">
            <span className="text-orange-300 min-w-0 truncate max-w-[30%]">{game.team1?.name}</span>
            <span className="shrink-0">{team1Points}</span>
            <span className="shrink-0 text-gray-300">🆚</span>
            <span className="shrink-0">{team2Points}</span>
            <span className="text-blue-300 min-w-0 truncate max-w-[30%]">{game.team2?.name}</span>
          </div>
        </div>
        <GameScoreSheet game={game} mode="readonly" />
      </div>
    </div>
  );
};
