import React, { useState, useMemo } from 'react';
import { useTranslation } from '../../../contexts/LanguageContext';
import { BackButton } from '../BackButton';
import { GameTeamPanel } from './GameTeamPanel';
import { sortPlayersByAverage, applyLineupRule } from '../../../utils/lineupUtils';
import type { Game, GamePlayer } from '../../../types/index';

interface PreMatchSetupProps {
  game: Game;
  initialTeam1Players: GamePlayer[];
  initialTeam2Players: GamePlayer[];
  onContinue: (team1: GamePlayer[], team2: GamePlayer[]) => void;
  onBack: () => void;
}

export const PreMatchSetup: React.FC<PreMatchSetupProps> = ({
  game, initialTeam1Players, initialTeam2Players, onContinue, onBack
}) => {
  const { t } = useTranslation();
  const lineupStrategy = game.lineupStrategy;
  const lineupRule = game.lineupRule;

  const [team1Players, setTeam1Players] = useState<GamePlayer[]>(initialTeam1Players);
  const [team2Players, setTeam2Players] = useState<GamePlayer[]>(initialTeam2Players);

  const displayTeam1Players = useMemo(() =>
    lineupStrategy === 'rule-based' ? sortPlayersByAverage(team1Players) : team1Players,
    [lineupStrategy, team1Players]
  );
  const displayTeam2Players = useMemo(() =>
    lineupStrategy === 'rule-based' ? sortPlayersByAverage(team2Players) : team2Players,
    [lineupStrategy, team2Players]
  );

  const handleToggleAbsent = (team: 'team1' | 'team2', playerId: string) => {
    if (team === 'team1') {
      setTeam1Players(prev => prev.map(p => p.playerId === playerId ? { ...p, absent: !p.absent } : p));
    } else {
      setTeam2Players(prev => prev.map(p => p.playerId === playerId ? { ...p, absent: !p.absent } : p));
    }
  };

  const handleMovePlayer = (team: 'team1' | 'team2', index: number, direction: 'up' | 'down') => {
    const setter = team === 'team1' ? setTeam1Players : setTeam2Players;
    setter(prev => {
      const updated = [...prev];
      const swapIdx = direction === 'up' ? index - 1 : index + 1;
      if (swapIdx < 0 || swapIdx >= updated.length || !updated[index] || !updated[swapIdx]) return prev;
      const temp = updated[index] as GamePlayer;
      updated[index] = updated[swapIdx] as GamePlayer;
      updated[swapIdx] = temp;
      return updated;
    });
  };

  const handleContinue = () => {
    let final1 = team1Players;
    let final2 = team2Players;
    if (lineupStrategy === 'rule-based' && lineupRule) {
      const ordered = applyLineupRule(team1Players, team2Players, lineupRule);
      final1 = ordered.team1;
      final2 = ordered.team2;
    }
    onContinue(final1, final2);
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <BackButton label={t('common.back')} onClick={onBack} className="text-blue-400 hover:text-blue-300 mb-4" />
          <h1 className="text-3xl font-bold mb-2">{t('games.preGameSetup')}</h1>
          <p className="text-gray-400">
            {t('common.round')} {game.round}, {t('common.matchDay')} {game.matchDay}
          </p>
          <p className="text-gray-400 text-sm mt-1">
            {t('games.reviewPlayers')}
          </p>
          <div className="mt-4 bg-blue-900/30 border border-blue-500 rounded-lg p-3">
            <div className="flex items-center gap-2">
              <span className="text-blue-400 font-semibold">{t('games.lineupStrategyLabel')}</span>
              <span className="text-white">
                {lineupStrategy === 'flexible' && `🔄 ${t('games.lineupFlexible')}`}
                {lineupStrategy === 'fixed' && `🔒 ${t('games.lineupFixed')}`}
                {lineupStrategy === 'rule-based' && `📊 ${t('games.lineupRuleBased')} - ${lineupRule === 'standard' ? t('games.lineupStandard') : t('games.lineupBalanced')}`}
              </span>
            </div>
            {lineupStrategy === 'rule-based' && (
              <p className="text-xs text-yellow-400 mt-2 flex items-center gap-1">
                <span>⚡</span>
                <span>
                  {lineupRule === 'standard'
                    ? t('games.lineupRuleStandardDesc')
                    : t('games.lineupRuleBalancedDesc')}
                </span>
              </p>
            )}
            {lineupStrategy === 'fixed' && (
              <p className="text-xs text-gray-400 mt-1">
                {t('games.lineupLocked')}
              </p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <GameTeamPanel
            teamName={game.team1?.name || t('games.team1Default')}
            teamColor="text-blue-400"
            players={displayTeam1Players}
            team="team1"
            lineupStrategy={lineupStrategy}
            toggleAbsent={handleToggleAbsent}
            movePlayer={handleMovePlayer}
            t={t}
          />
          <GameTeamPanel
            teamName={game.team2?.name || t('games.team2Default')}
            teamColor="text-green-400"
            players={displayTeam2Players}
            team="team2"
            lineupStrategy={lineupStrategy}
            toggleAbsent={handleToggleAbsent}
            movePlayer={handleMovePlayer}
            t={t}
          />
        </div>

        <div className="flex justify-end">
          <NavButton direction="forward" label={t('games.continueToMatch')} onClick={handleContinue} className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-bold text-lg transition-colors" />
        </div>
      </div>
    </div>
  );
};
