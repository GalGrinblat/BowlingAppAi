import React from 'react';
import { Star } from '../Icons';
import { useTranslation } from '../../../contexts/LanguageContext';
import { GamePlayer, MatchPlayer } from '../../../types';

// ─── Local sub-components ────────────────────────────────────────────────────

const BonusIndicator: React.FC<{ bonusPoints: number; reversed?: boolean }> = ({ bonusPoints, reversed }) => (
  <div className="flex items-center gap-1 text-yellow-400 flex-shrink-0 w-12">
    {bonusPoints > 0 && (
      reversed ? (
        <>
          <span className="text-xs font-bold">+{bonusPoints}</span>
          <Star size={12} fill="currentColor" />
        </>
      ) : (
        <>
          <Star size={12} fill="currentColor" />
          <span className="text-xs font-bold">+{bonusPoints}</span>
        </>
      )
    )}
  </div>
);

// ─── Main component ───────────────────────────────────────────────────────────

export interface PlayerScoreInputProps {
  player: GamePlayer;
  matchPlayer: MatchPlayer;
  teamColor: 'orange' | 'blue';
  teamKey: 'team1' | 'team2';
  playerIdx: number;
  matchIdx: number;
  useHandicap: boolean;
  onUpdateScore: (matchIdx: number, team: 'team1' | 'team2', idx: number, pins: string) => void;
  isReadOnly?: boolean;
  alignment?: 'left' | 'right';
}

export const PlayerScoreInput: React.FC<PlayerScoreInputProps> = ({
  player,
  matchPlayer,
  teamColor,
  teamKey,
  playerIdx,
  matchIdx,
  useHandicap,
  onUpdateScore,
  isReadOnly = false,
  alignment = 'left',
}) => {
  const { t } = useTranslation();
  const isRightAligned = alignment === 'right';

  // Color configurations
  const bgColor = teamColor === 'orange' ? 'bg-orange-600' : 'bg-blue-600';
  const textColor = teamColor === 'orange' ? 'text-orange-400' : 'text-blue-400';
  const focusBorder = teamColor === 'orange' ? 'focus:border-orange-500' : 'focus:border-blue-500';
  const focusRing = teamColor === 'orange' ? 'focus:ring-orange-500' : 'focus:ring-blue-500';

  // Calculate values
  const absentScore = parseInt(String(player.average)) - 10;
  const scoreWithHandicap = player.absent
    ? absentScore + player.handicap
    : matchPlayer.pins !== ''
    ? parseInt(String(matchPlayer.pins)) + player.handicap
    : 0;

  // Render player info (name and stats)
  const playerInfo = (
    <div className="flex-1 min-w-0">
      <div className={`font-semibold text-white text-sm truncate ${isRightAligned ? 'text-right' : ''}`}>
        {player.name}
      </div>
      <div className={`text-xs text-gray-400 ${isRightAligned ? 'text-right' : ''}`}>
        {t('games.avg')}: {typeof player.average === 'number' ? player.average.toFixed(1) : player.average} | {t('games.hc')}: {useHandicap === false ? t('common.na') : player.handicap}
        {player.absent && <span className="text-red-400 font-bold ml-1">({t('games.absent').toUpperCase()})</span>}
      </div>
    </div>
  );

  // Render rank badge
  const rankBadge = (
    <div className={`${bgColor} text-white w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0`}>
      {player.rank}
    </div>
  );

  // Render score inputs or absent display
  const scoreDisplay = (
    <div className="flex items-center gap-2 flex-shrink-0">
      {player.absent ? (
        <>
          {isRightAligned && <BonusIndicator bonusPoints={matchPlayer.bonusPoints} reversed />}
          <div className="text-center">
            <span className="text-gray-400 text-sm block">{t('games.withHdc')}</span>
            <div className={`w-16 px-2 py-1 ${textColor} font-bold text-sm text-center`}>
              {scoreWithHandicap}
            </div>
          </div>
          <div className="text-center">
            <span className="text-gray-400 text-sm block">{t('common.score')}</span>
            <div className="w-16 px-2 py-1 bg-red-700 text-yellow-300 rounded border border-red-600 font-bold text-center text-sm">
              {absentScore}
            </div>
          </div>
          {!isRightAligned && <BonusIndicator bonusPoints={matchPlayer.bonusPoints} />}
        </>
      ) : (
        <>
          {isRightAligned && <BonusIndicator bonusPoints={matchPlayer.bonusPoints} reversed />}
          <div className="text-center">
            <span className="text-gray-400 text-sm block">{t('games.withHdc')}</span>
            <div className={`w-16 px-2 py-1 ${textColor} font-bold text-sm text-center`}>
              {scoreWithHandicap}
            </div>
          </div>
          <div className="text-center">
            <label htmlFor={`score-${matchIdx}-${teamKey}-${playerIdx}`} className="text-gray-400 text-sm block">{t('common.score')}</label>
            <input
              id={`score-${matchIdx}-${teamKey}-${playerIdx}`}
              name={`score-${teamKey}-${playerIdx}`}
              type="number"
              inputMode='numeric'
              value={matchPlayer.pins}
              onChange={(e) => onUpdateScore(matchIdx, teamKey, playerIdx, e.target.value)}
              onKeyDown={(e) => ['-', '+', 'e', 'E'].includes(e.key) && e.preventDefault()}
              onFocus={(e) => e.target.select()}
              placeholder="0-300"
              min="0"
              max="300"
              disabled={isReadOnly}
              className={`w-16 sm:w-20 px-2 py-2 sm:py-3 rounded border font-bold text-center text-base sm:text-lg ${
                isReadOnly
                  ? 'bg-gray-600 text-gray-400 border-gray-500 cursor-not-allowed'
                  : `bg-gray-600 text-white border-gray-500 ${focusBorder} focus:outline-none focus:ring-2 ${focusRing}`
              }`}
            />
          </div>
          {!isRightAligned && <BonusIndicator bonusPoints={matchPlayer.bonusPoints} />}
        </>
      )}
    </div>
  );

  // Main layout based on alignment
  return (
    <div className={`flex items-center gap-2 ${isRightAligned ? 'text-right justify-end' : ''}`}>
      {!isRightAligned && rankBadge}
      {!isRightAligned && playerInfo}
      {scoreDisplay}
      {isRightAligned && playerInfo}
      {isRightAligned && rankBadge}
    </div>
  );
};
