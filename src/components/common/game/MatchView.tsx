import React from 'react';
import { ArrowLeft, ArrowRight } from '../Icons';
import { PlayerScoreInput } from './PlayerScoreInput';
import { useTranslation } from '../../../contexts/LanguageContext';
import type { MatchViewProps, GamePlayer } from '../../../types/index';

// ─── Local sub-components ────────────────────────────────────────────────────

interface TeamTotalsBoxProps {
  totalPins: number;
  totalWithHandicap: number;
  points: number;
  color: 'orange' | 'blue';
  t: (key: string) => string;
}

const TeamTotalsBox: React.FC<TeamTotalsBoxProps> = ({ totalPins, totalWithHandicap, points, color, t }) => {
  const bg = color === 'orange' ? 'bg-orange-600' : 'bg-blue-600';
  const border = color === 'orange' ? 'border-orange-400' : 'border-blue-400';
  return (
    <div className={`${bg} text-white p-3 sm:p-4 rounded-lg`}>
      <div className="text-center">
        <div className="text-sm font-bold uppercase tracking-wider opacity-90 mb-1">{t('common.totalPins')}</div>
        <div className="text-xl sm:text-3xl font-bold mb-2">{totalPins}</div>
        <div className="text-xs font-bold uppercase tracking-wider opacity-90 mb-1">{t('games.totalPinsHC')}</div>
        <div className="text-lg sm:text-2xl font-bold mb-3">{totalWithHandicap}</div>
        <div className={`pt-3 border-t ${border}`}>
          <div className="text-sm font-bold uppercase tracking-wider opacity-90 mb-1">{t('games.matchPoints')}</div>
          <div className="text-2xl sm:text-4xl font-bold">{points}</div>
        </div>
      </div>
    </div>
  );
};

// ─── Main component ───────────────────────────────────────────────────────────

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
    <div className="scorecard rounded-xl p-6 md:p-8 mb-8 animate-slide-in">
      <div className="flex items-center justify-between mb-6">
        <div className="bowling-title text-white text-3xl">
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
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-gradient-to-br from-orange-600 to-red-600 text-white p-4 rounded-lg text-center">
          <div className="bowling-title text-3xl truncate">{game.team1.name}</div>
        </div>

        <div className="bg-gradient-to-br from-blue-600 to-indigo-700 text-white p-4 rounded-lg text-center">
          <div className="bowling-title text-3xl truncate">{game.team2.name}</div>
        </div>
      </div>

      {/* Players Grid */}
      <div className="bg-gray-800 rounded-lg p-4 mb-6">
        <div className="space-y-3">
          {game.team1.players.map((player: GamePlayer, idx: number) => {
            const team1MatchPlayer = match.team1.players[idx];
            const team2Player = game.team2?.players[idx];
            const team2MatchPlayer = match.team2.players[idx];
            if (!team1MatchPlayer ||!team2Player || !team2MatchPlayer) return null;
            return (
              <div key={player.playerId} className="player-row bg-gray-700 rounded-lg p-3">
                {/* Mobile: stacked vertically. Desktop (sm+): 3-column side-by-side */}
                <div className="flex flex-col gap-2 sm:grid sm:grid-cols-3 sm:gap-4 sm:items-center">
                  {/* Team 1 Player */}
                  <PlayerScoreInput
                    player={player}
                    matchPlayer={team1MatchPlayer}
                    teamColor="orange"
                    teamKey="team1"
                    playerIdx={idx}
                    matchIdx={matchIndex}
                    useHandicap={game.useHandicap}
                    onUpdateScore={onUpdateScore}
                    isReadOnly={isReadOnly}
                    alignment="left"
                  />

                  {/* Points in Middle */}
                  <div className="text-center">
                    <div className="bg-gray-900 rounded-lg p-2 border border-gray-600">
                      <div className="text-xs text-gray-400 mb-1">{t('common.points').toUpperCase()}</div>
                      <div className="flex items-center justify-center gap-2">
                        <span className={`font-bold text-lg ${match.playerMatches?.[idx]?.result === 'team1' ? 'text-green-400' : 'text-gray-500'}`}>
                          {match.playerMatches?.[idx]?.team1Points ?? 0}
                        </span>
                        <span className="text-gray-600">-</span>
                        <span className={`font-bold text-lg ${match.playerMatches?.[idx]?.result === 'team2' ? 'text-green-400' : 'text-gray-500'}`}>
                          {match.playerMatches?.[idx]?.team2Points ?? 0}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Team 2 Player */}
                  <PlayerScoreInput
                    player={team2Player}
                    matchPlayer={team2MatchPlayer}
                    teamColor="blue"
                    teamKey="team2"
                    playerIdx={idx}
                    matchIdx={matchIndex}
                    useHandicap={game.useHandicap}
                    onUpdateScore={onUpdateScore}
                    isReadOnly={isReadOnly}
                    alignment="right"
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Bottom Totals */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <TeamTotalsBox
          totalPins={match.team1.totalPins}
          totalWithHandicap={match.team1.totalWithHandicap}
          points={match.team1.points}
          color="orange"
          t={t}
        />

        <div className="flex items-center justify-center">
          <div className="bg-gray-900 rounded-lg p-3 border border-gray-600">
            <div className="text-xs text-gray-400 mb-1 text-center">{t('common.points').toUpperCase()}</div>
            <div className="flex items-center justify-center gap-2">
              <span className="text-orange-400 font-bold text-lg sm:text-2xl">{match.team1.points}</span>
              <span className="text-gray-600">-</span>
              <span className="text-blue-400 font-bold text-lg sm:text-2xl">{match.team2.points}</span>
            </div>
          </div>
        </div>

        <TeamTotalsBox
          totalPins={match.team2.totalPins}
          totalWithHandicap={match.team2.totalWithHandicap}
          points={match.team2.points}
          color="blue"
          t={t}
        />
      </div>

      {/* Navigation */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        <button
          onClick={() => onNavigate('back')}
          className="flex items-center justify-center gap-1 sm:gap-2 bg-gray-700 text-white py-3 sm:py-4 rounded-lg font-bold uppercase text-xs sm:text-sm hover:bg-gray-600 transition-colors touch-manipulation"
        >
          {isRTL ? <ArrowRight size={18} /> : <ArrowLeft size={18} />}
          <span>{t('common.back')}</span>
        </button>

        <button
          onClick={onCancel}
          className="bg-red-600 text-white py-3 sm:py-4 rounded-lg font-bold uppercase text-xs sm:text-sm hover:bg-red-700 transition-colors touch-manipulation"
        >
          {t('common.cancel')}
        </button>

        <button
          onClick={() => onNavigate('next')}
          className="flex items-center justify-center gap-1 sm:gap-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white py-3 sm:py-4 rounded-lg font-bold uppercase text-xs sm:text-sm hover:from-green-700 hover:to-emerald-700 transition-colors shadow-lg touch-manipulation"
        >
          {matchNumber === totalMatches ? t('games.summary') : t('common.next')}
          {isRTL ? <ArrowLeft size={18} /> : <ArrowRight size={18} />}
        </button>
      </div>
    </div>
  );
}
