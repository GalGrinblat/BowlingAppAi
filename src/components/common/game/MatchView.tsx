import React from 'react';
import { ArrowLeft, ArrowRight } from '../Icons';
import { useTranslation } from '../../../contexts/LanguageContext';
import { ABSENT_PLAYER_PENALTY } from '../../../constants/bowling';
import type { MatchViewProps, GamePlayer } from '../../../types/index';

export const MatchView: React.FC<MatchViewProps> = ({ matchNumber, game, onUpdateScore, onNavigate, onCancel, isReadOnly = false }) => {
  const { t, isRTL } = useTranslation();
  const matchIndex = matchNumber - 1;
  if (!game || !game.matches || !game.matches[matchIndex]) return null;
  const match = game.matches[matchIndex];
  const totalMatches = game.matches.length;
  if (!game.team1 || !game.team2) return null;
  if (!match.team1 || !match.team2) return null;

  const matchTitle = t('games.matchOf')
    .replace('{{current}}', String(matchNumber))
    .replace('{{total}}', String(totalMatches));

  return (
    <div className="scorecard rounded-xl p-4 md:p-6 mb-8 animate-slide-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="bowling-title text-white text-2xl">
          {matchTitle}
          {isReadOnly && <span className="text-sm ml-3 text-yellow-400">({t('common.readOnly')})</span>}
        </div>
        <div className="flex gap-2">
          {Array.from({ length: totalMatches }, (_, i) => i + 1).map(num => (
            <div key={num} className={`w-3 h-3 rounded-full ${num === matchNumber ? 'bg-orange-500' : 'bg-gray-600'}`} />
          ))}
        </div>
      </div>

      {/* Team Headers */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-gradient-to-br from-orange-600 to-red-600 text-white px-3 py-2 rounded-lg text-center">
          <div className="bowling-title text-xl truncate">{game.team1.name}</div>
        </div>
        <div className="bg-gradient-to-br from-blue-600 to-indigo-700 text-white px-3 py-2 rounded-lg text-center">
          <div className="bowling-title text-xl truncate">{game.team2.name}</div>
        </div>
      </div>

      {/* Compact Players Table */}
      <div className="bg-gray-800 rounded-lg overflow-hidden mb-4">
        {game.team1.players.map((player: GamePlayer, idx: number) => {
          const team1MatchPlayer = match.team1.players[idx];
          const team2Player = game.team2?.players[idx];
          const team2MatchPlayer = match.team2.players[idx];
          if (!team1MatchPlayer || !team2Player || !team2MatchPlayer) return null;

          const pm = match.playerMatches?.[idx];
          const absentScore1 = Math.max(0, Math.round(player.average) - ABSENT_PLAYER_PENALTY);
          const absentScore2 = Math.max(0, Math.round(team2Player.average) - ABSENT_PLAYER_PENALTY);

          return (
            <div
              key={player.playerId}
              className="grid items-center gap-x-2 px-2 py-2 border-b border-gray-700 last:border-0"
              style={{ gridTemplateColumns: '1fr auto 1fr' }}
            >
              {/* Team 1 side */}
              <div className="flex items-center gap-1.5 min-w-0">
                <div className="bg-orange-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">
                  {player.rank}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-white text-xs font-semibold truncate">{player.name}</div>
                  <div className="text-gray-400 text-[10px] leading-tight">
                    {t('games.avg')}:{player.average.toFixed(0)}
                    {game.useHandicap ? ` · ${t('games.hc')}:${player.handicap}` : ''}
                    {player.absent && <span className="text-red-400 ml-1">({t('games.absent')})</span>}
                  </div>
                </div>
                {player.absent ? (
                  <div className="w-14 text-center px-1 py-1.5 bg-red-900 text-yellow-300 rounded text-sm font-bold flex-shrink-0">
                    {absentScore1}
                  </div>
                ) : (
                  <input
                    type="number"
                    inputMode="numeric"
                    min="0"
                    max="300"
                    value={team1MatchPlayer.pins}
                    onChange={e => onUpdateScore(matchIndex, 'team1', idx, e.target.value)}
                    onKeyDown={e => ['-', '+', 'e', 'E'].includes(e.key) && e.preventDefault()}
                    onFocus={e => e.target.select()}
                    placeholder="—"
                    disabled={isReadOnly}
                    className={`w-14 px-1 py-1.5 rounded border bg-gray-600 text-white text-center text-sm font-bold flex-shrink-0 focus:outline-none focus:ring-2 focus:ring-orange-500 ${
                      isReadOnly ? 'border-gray-500 opacity-60 cursor-not-allowed' : 'border-gray-500 focus:border-orange-500'
                    }`}
                  />
                )}
                {team1MatchPlayer.bonusPoints > 0 && (
                  <span className="text-yellow-400 text-[10px] flex-shrink-0">⭐+{team1MatchPlayer.bonusPoints}</span>
                )}
              </div>

              {/* Center: points */}
              <div className="w-12 text-center flex-shrink-0">
                <div className="text-[10px] text-gray-500 leading-none mb-0.5">{t('common.pts')}</div>
                <div className="text-sm font-bold leading-none">
                  <span className={pm?.result === 'team1' ? 'text-green-400' : 'text-gray-400'}>{pm?.team1Points ?? 0}</span>
                  <span className="text-gray-600 mx-0.5">-</span>
                  <span className={pm?.result === 'team2' ? 'text-green-400' : 'text-gray-400'}>{pm?.team2Points ?? 0}</span>
                </div>
              </div>

              {/* Team 2 side (mirrored) */}
              <div className="flex items-center gap-1.5 min-w-0 justify-end">
                {team2MatchPlayer.bonusPoints > 0 && (
                  <span className="text-yellow-400 text-[10px] flex-shrink-0">⭐+{team2MatchPlayer.bonusPoints}</span>
                )}
                {team2Player.absent ? (
                  <div className="w-14 text-center px-1 py-1.5 bg-red-900 text-yellow-300 rounded text-sm font-bold flex-shrink-0">
                    {absentScore2}
                  </div>
                ) : (
                  <input
                    type="number"
                    inputMode="numeric"
                    min="0"
                    max="300"
                    value={team2MatchPlayer.pins}
                    onChange={e => onUpdateScore(matchIndex, 'team2', idx, e.target.value)}
                    onKeyDown={e => ['-', '+', 'e', 'E'].includes(e.key) && e.preventDefault()}
                    onFocus={e => e.target.select()}
                    placeholder="—"
                    disabled={isReadOnly}
                    className={`w-14 px-1 py-1.5 rounded border bg-gray-600 text-white text-center text-sm font-bold flex-shrink-0 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      isReadOnly ? 'border-gray-500 opacity-60 cursor-not-allowed' : 'border-gray-500 focus:border-blue-500'
                    }`}
                  />
                )}
                <div className="min-w-0 flex-1 text-right">
                  <div className="text-white text-xs font-semibold truncate">{team2Player.name}</div>
                  <div className="text-gray-400 text-[10px] leading-tight">
                    {game.useHandicap ? `${t('games.hc')}:${team2Player.handicap} · ` : ''}
                    {t('games.avg')}:{team2Player.average.toFixed(0)}
                    {team2Player.absent && <span className="text-red-400 ml-1">({t('games.absent')})</span>}
                  </div>
                </div>
                <div className="bg-blue-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">
                  {team2Player.rank}
                </div>
              </div>
            </div>
          );
        })}

        {/* Totals row */}
        <div
          className="grid items-center gap-x-2 px-2 py-2 bg-gray-900 border-t-2 border-gray-600"
          style={{ gridTemplateColumns: '1fr auto 1fr' }}
        >
          <div className="text-xs font-bold text-orange-400 leading-tight">
            <div>{t('common.totalPins')}: {match.team1.totalPins}</div>
            {game.useHandicap && (
              <div className="text-orange-300">{t('games.totalPinsHC')}: {match.team1.totalWithHandicap}</div>
            )}
          </div>
          <div className="w-12 text-center flex-shrink-0">
            <div className="text-[10px] text-gray-500 leading-none mb-0.5">{t('common.pts')}</div>
            <div className="text-base font-bold leading-none">
              <span className="text-orange-400">{match.team1.points}</span>
              <span className="text-gray-600 mx-0.5">-</span>
              <span className="text-blue-400">{match.team2.points}</span>
            </div>
          </div>
          <div className="text-xs font-bold text-blue-400 text-right leading-tight">
            <div>{t('common.totalPins')}: {match.team2.totalPins}</div>
            {game.useHandicap && (
              <div className="text-blue-300">{t('games.totalPinsHC')}: {match.team2.totalWithHandicap}</div>
            )}
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="grid grid-cols-3 gap-2">
        <button
          onClick={() => onNavigate('back')}
          className="flex items-center justify-center gap-1 bg-gray-700 text-white py-3 rounded-lg font-bold uppercase text-xs hover:bg-gray-600 transition-colors touch-manipulation"
        >
          {isRTL ? <ArrowRight size={16} /> : <ArrowLeft size={16} />}
          <span>{t('common.back')}</span>
        </button>

        <button
          onClick={onCancel}
          className="bg-red-600 text-white py-3 rounded-lg font-bold uppercase text-xs hover:bg-red-700 transition-colors touch-manipulation"
        >
          {t('common.cancel')}
        </button>

        <button
          onClick={() => onNavigate('next')}
          className="flex items-center justify-center gap-1 bg-gradient-to-r from-green-600 to-emerald-600 text-white py-3 rounded-lg font-bold uppercase text-xs hover:from-green-700 hover:to-emerald-700 transition-colors shadow-lg touch-manipulation"
        >
          {matchNumber === totalMatches ? t('games.summary') : t('common.next')}
          {isRTL ? <ArrowLeft size={16} /> : <ArrowRight size={16} />}
        </button>
      </div>
    </div>
  );
};