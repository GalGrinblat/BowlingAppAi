import React from 'react';
import { useTranslation } from '../../../contexts/LanguageContext';
import { H2HRecord } from '../../common/H2HRecord';
import type { HeadToHeadStats } from '../../../utils/headToHeadUtils';
import type { Game, GameMatch, Team } from '../../../types/index';

interface GameCardProps {
  game: Game;
  team1: Team | undefined;
  team2: Team | undefined;
  h2h: HeadToHeadStats;
  onPlayGame: () => void;
  onViewGame: () => void;
  /** When true, hides the play/continue action button (used in public board) */
  readOnly?: boolean;
}

export const GameCard: React.FC<GameCardProps> = ({ game, team1, team2, h2h, onPlayGame, onViewGame, readOnly = false }) => {
  const { t } = useTranslation();

  const getStatusBadge = () => {
    switch (game.status) {
      case 'completed':
        return <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-semibold">{t('common.completed')}</span>;
      case 'in-progress':
        return <span className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-sm font-semibold">{t('games.inProgress')}</span>;
      default:
        return <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm font-semibold">{t('games.pending')}</span>;
    }
  };

  const team1TotalPoints = (game.matches?.reduce((sum: number, m: GameMatch) => sum + (m.team1?.points || 0), 0) ?? 0) + (game.grandTotalPoints?.team1 || 0);
  const team2TotalPoints = (game.matches?.reduce((sum: number, m: GameMatch) => sum + (m.team2?.points || 0), 0) ?? 0) + (game.grandTotalPoints?.team2 || 0);

  return (
    <div className={`border rounded-lg p-4 transition-colors ${
      game.status === 'completed'
        ? 'border-green-300 bg-green-50'
        : game.status === 'in-progress'
        ? 'border-yellow-300 bg-yellow-50'
        : 'border-gray-300 hover:border-blue-300'
    }`}>
      {/* Head-to-Head Record */}
      {h2h && h2h.gamesPlayed > 0 && (
        <div className="mb-3 pb-3 border-b border-gray-300">
          <H2HRecord h2h={h2h} team1Name={team1?.name ?? ''} team2Name={team2?.name ?? ''} variant="compact" />
        </div>
      )}

      <div className="flex justify-between items-center">
        <div className="flex-1">
          <div className="flex items-center justify-between mb-2">
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <span className="font-bold text-gray-800 text-lg">{team1?.name || t('games.team1Default')}</span>
                {game.status === 'completed' && (
                  <span className="text-2xl font-bold text-blue-600">{team1TotalPoints}</span>
                )}
              </div>
            </div>
            {getStatusBadge()}
          </div>
          <div className="flex items-center gap-3">
            <span className="font-bold text-gray-800 text-lg">{team2?.name || t('games.team2Default')}</span>
            {game.status === 'completed' && (
              <span className="text-2xl font-bold text-blue-600">{team2TotalPoints}</span>
            )}
          </div>
        </div>
        <div className="ml-4 flex flex-col gap-2 items-end">
          {!readOnly && game.pendingSubmission != null && (
            <button
              onClick={onPlayGame}
              className="px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 font-semibold text-sm"
            >
              📋 {t('games.viewPendingSubmission')}
            </button>
          )}
          {game.status === 'completed' ? (
            <button
              onClick={onViewGame}
              className="px-4 py-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 font-semibold"
            >
              {t('games.viewResults')}
            </button>
          ) : readOnly ? (
            getStatusBadge()
          ) : (
            <button
              onClick={onPlayGame}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold"
            >
              {game.status === 'in-progress' ? t('games.continue') : t('games.startGame')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
