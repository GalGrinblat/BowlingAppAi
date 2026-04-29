import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { gamesApi } from '../../../services/api';
import { logger } from '../../../utils/logger';
import { GameScoreSheet } from '../../common/game/GameScoreSheet';
import { calculateMatchResults, calculateBonusPoints, clampScore } from '../../../utils/matchUtils';
import { calculateGrandTotalPoints } from '../../../utils/statsUtils';
import { PreMatchSetup } from '../../common/game/PreMatchSetup';
import { useGameInitializer } from '../../../hooks/useGameInitializer';
import { useTranslation } from '../../../contexts/LanguageContext';
import { ArrowLeft } from '../../common/Icons';

import type { Game, GamePlayer, GameMatch, MatchPlayer } from '../../../types/index';

export const SeasonGame: React.FC = () => {
  const navigate = useNavigate();
  const { gameId } = useParams<{ gameId: string }>();
  const { t, isRTL } = useTranslation();
  const {
    game, setGame,
    showPreMatch, setShowPreMatch,
    team1Players,
    team2Players,
  } = useGameInitializer(gameId!);

  const [validationError, setValidationError] = useState('');
  const pendingApplied = useRef(false);

  // Auto-apply pending submission scores when game loads (if cells are still empty)
  useEffect(() => {
    if (!game || pendingApplied.current) return;
    const sub = game.pendingSubmission;
    if (!sub || game.status === 'completed') return;
    if (!game.team1 || !game.team2 || !game.matches) return;

    const hasScores = game.matches.some((m: GameMatch) =>
      m.team1.players.some((p: MatchPlayer) => p.pins !== '') ||
      m.team2.players.some((p: MatchPlayer) => p.pins !== '')
    );
    if (hasScores) { pendingApplied.current = true; return; }

    pendingApplied.current = true;

    const updatedTeam1Players: GamePlayer[] = game.team1.players.map((p, i) => ({
      ...p, absent: sub.team1AbsentFlags[i] ?? p.absent,
    }));
    const updatedTeam2Players: GamePlayer[] = game.team2.players.map((p, i) => ({
      ...p, absent: sub.team2AbsentFlags[i] ?? p.absent,
    }));

    const updatedMatches: GameMatch[] = game.matches.map((m, mi) => {
      const ms = sub.matchScores[mi];
      if (!ms) return m;
      return {
        ...m,
        team1: {
          ...m.team1,
          players: m.team1.players.map((p, pi) => {
            const raw = ms.team1Pins[pi];
            const pins = raw == null ? '' : String(raw);
            const player = updatedTeam1Players[pi];
            return {
              ...p, pins,
              bonusPoints: player
                ? calculateBonusPoints(pins, player.average, player.absent, game.bonusRules ?? [])
                : p.bonusPoints,
            };
          }),
        },
        team2: {
          ...m.team2,
          players: m.team2.players.map((p, pi) => {
            const raw = ms.team2Pins[pi];
            const pins = raw == null ? '' : String(raw);
            const player = updatedTeam2Players[pi];
            return {
              ...p, pins,
              bonusPoints: player
                ? calculateBonusPoints(pins, player.average, player.absent, game.bonusRules ?? [])
                : p.bonusPoints,
            };
          }),
        },
      };
    });

    const updated: Game = {
      ...game,
      team1: { ...game.team1, players: updatedTeam1Players },
      team2: { ...game.team2, players: updatedTeam2Players },
      matches: updatedMatches,
      status: 'in-progress',
    };
    for (let i = 0; i < updatedMatches.length; i++) calculateMatchResults(updated, i);
    updated.grandTotalPoints = calculateGrandTotalPoints(updated);

    setGame(updated);
    gamesApi.update(gameId!, updated).catch(err =>
      logger.error('Failed to save pending pre-population:', err)
    );
  }, [game?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const handlePreMatchContinue = async (finalTeam1Players: GamePlayer[], finalTeam2Players: GamePlayer[]) => {
    if (!game || !game.team1 || !game.team2) return;
    const defaultGrandTotalPoints = { team1: 0, team2: 0 };
    const updatedGame: Game = {
      ...game,
      team1: { ...game.team1, players: finalTeam1Players, name: game.team1.name ?? '' },
      team2: { ...game.team2, players: finalTeam2Players, name: game.team2.name ?? '' },
      id: game.id ?? '',
      seasonId: game.seasonId ?? '',
      round: game.round ?? 1,
      matchDay: game.matchDay ?? 1,
      team1Id: game.team1Id ?? '',
      team2Id: game.team2Id ?? '',
      status: game.status ?? 'pending',
      matches: game.matches ?? [],
      matchesPerGame: game.matchesPerGame ?? 3,
      bonusRules: game.bonusRules ?? [],
      lineupStrategy: game.lineupStrategy,
      lineupRule: game.lineupRule,
      grandTotalPoints: typeof game.grandTotalPoints === 'object' && game.grandTotalPoints !== null
        ? game.grandTotalPoints : defaultGrandTotalPoints,
      completedAt: game.completedAt,
      updatedAt: game.updatedAt,
    };
    await gamesApi.update(gameId!, updatedGame);
    setGame(updatedGame);
    setShowPreMatch(false);
  };

  const updateMatchScore = async (
    matchIndex: number, team: 'team1' | 'team2', playerIndex: number, pins: string
  ) => {
    if (!game || !game.matches || !game.team1 || !game.team2) return;
    const updated: Game = { ...game };
    if (!updated.matches || !updated.team1 || !updated.team2) return;
    const match = updated.matches[matchIndex];
    if (!match) return;

    const parsedPins = parseInt(pins);
    const sanitizedPins = pins === '' ? '' : isNaN(parsedPins) ? '' : String(clampScore(parsedPins));

    if (team === 'team1' && match.team1?.players?.[playerIndex] && updated.team1?.players?.[playerIndex]) {
      match.team1.players[playerIndex].pins = sanitizedPins;
      const playerObj = updated.team1.players[playerIndex];
      if (playerObj) {
        match.team1.players[playerIndex].bonusPoints = calculateBonusPoints(sanitizedPins, playerObj.average, playerObj.absent, game.bonusRules ?? []);
      }
    } else if (team === 'team2' && match.team2?.players?.[playerIndex] && updated.team2?.players?.[playerIndex]) {
      match.team2.players[playerIndex].pins = sanitizedPins;
      const playerObj = updated.team2.players[playerIndex];
      if (playerObj) {
        match.team2.players[playerIndex].bonusPoints = calculateBonusPoints(sanitizedPins, playerObj.average, playerObj.absent, game.bonusRules ?? []);
      }
    }

    calculateMatchResults(updated, matchIndex);
    updated.grandTotalPoints = calculateGrandTotalPoints(updated);

    if (updated.status === 'pending') {
      updated.status = 'in-progress';
    }

    setValidationError('');
    const previous = game;
    setGame(updated);
    try {
      await gamesApi.update(gameId!, updated);
    } catch (error) {
      logger.error('Failed to save score update:', error);
      setGame(previous);
    }
  };

  const handleCancel = async () => {
    if (game?.matches) {
      const hasAnyScores = game.matches.some((m: GameMatch) =>
        m.team1.players.some((p: MatchPlayer) => p.pins !== '') ||
        m.team2.players.some((p: MatchPlayer) => p.pins !== '')
      );
      if (!hasAnyScores && game.status !== 'pending') {
        try {
          const updated: Game = { ...game, status: 'pending' };
          await gamesApi.update(gameId!, updated);
          setGame(updated);
        } catch (error) {
          logger.error('Failed to reset game status to pending:', error);
        }
      }
    }
    navigate(-1);
  };

  const handleDismissPending = async () => {
    try {
      await gamesApi.clearPending(gameId!);
      setGame(prev => prev ? { ...prev, pendingSubmission: undefined } : prev);
    } catch (error) {
      logger.error('Failed to dismiss pending submission:', error);
    }
  };

  const finishGame = async () => {
    if (!game?.team1 || !game?.team2 || !game?.matches) return;

    // Validate all non-absent players have scores
    const missing = game.matches.some((m: GameMatch) =>
      game.team1!.players.some((p: GamePlayer, pi: number) =>
        !p.absent && (!m.team1.players[pi] || m.team1.players[pi].pins === '')
      ) ||
      game.team2!.players.some((p: GamePlayer, pi: number) =>
        !p.absent && (!m.team2.players[pi] || m.team2.players[pi].pins === '')
      )
    );
    if (missing) {
      setValidationError(t('games.notAllScoresEntered'));
      return;
    }

    const updated: Game = {
      ...game,
      status: 'completed',
      completedAt: new Date().toISOString(),
      id: game.id ?? '',
      seasonId: game.seasonId ?? '',
      round: game.round ?? 1,
      matchDay: game.matchDay ?? 1,
      team1Id: game.team1Id ?? '',
      team2Id: game.team2Id ?? '',
      matches: game.matches ?? [],
      matchesPerGame: game.matchesPerGame ?? 3,
      bonusRules: game.bonusRules ?? [],
      lineupStrategy: game.lineupStrategy,
      lineupRule: game.lineupRule,
      grandTotalPoints: typeof game.grandTotalPoints === 'object' && game.grandTotalPoints !== null
        ? game.grandTotalPoints : { team1: 0, team2: 0 },
      updatedAt: game.updatedAt,
      team1: game.team1,
      team2: game.team2,
    };
    await gamesApi.update(gameId!, updated);
    await gamesApi.clearPending(gameId!);
    navigate(-1);
  };

  if (!game) return <div>{t('common.loading')}</div>;

  if (game.status === 'completed') {
    navigate(`/admin/games/${gameId}`, { replace: true });
    return null;
  }

  if (showPreMatch) {
    return (
      <PreMatchSetup
        game={game}
        initialTeam1Players={team1Players}
        initialTeam2Players={team2Players}
        onContinue={handlePreMatchContinue}
        onBack={() => navigate(-1)}
      />
    );
  }

  const sub = game.pendingSubmission;

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4 md:p-6">
      {/* Header */}
      <div className="mb-4 text-center">
        <p className="text-gray-400 text-sm mb-1">{t('common.round')} {game.round} · {t('common.matchDay')} {game.matchDay}</p>
        <h1 className="text-2xl font-bold">{game.team1?.name} {t('common.vs')} {game.team2?.name}</h1>
      </div>

      {/* Pending submission banner */}
      {sub && (
        <div className="bg-yellow-900/40 border border-yellow-500 rounded-xl p-4 mb-4 flex items-start justify-between gap-4">
          <div>
            <p className="text-yellow-300 font-semibold text-sm">
              {t('pending.reviewBanner').replace('{{name}}', sub.submitterName ?? t('pending.submittedBy'))}
            </p>
            <p className="text-yellow-400/70 text-xs mt-0.5">
              {t('pending.submittedAt')}: {new Date(sub.submittedAt).toLocaleString()}
            </p>
          </div>
          <button
            onClick={handleDismissPending}
            className="shrink-0 text-xs text-yellow-400 hover:text-yellow-200 underline"
          >
            {t('pending.clearSubmission')}
          </button>
        </div>
      )}

      {/* Score sheet */}
      <div className="bg-white rounded-xl overflow-hidden mb-4">
        <GameScoreSheet
          game={game}
          mode="edit"
          onUpdateScore={updateMatchScore}
        />
      </div>

      {/* Total points summary */}
      {(() => {
        const calcTotal = (teamKey: 'team1' | 'team2') => {
          const allPresentBonus = (game.teamAllPresentBonusEnabled && game.teamAllPresentBonusPoints &&
            game[teamKey]?.players.every(p => !p.absent)) ? game.teamAllPresentBonusPoints : 0;
          return (game.matches ?? []).reduce((s, m) => s + (m[teamKey]?.points ?? 0), 0)
            + (game.grandTotalPoints?.[teamKey] ?? 0) + allPresentBonus;
        };
        const t1 = calcTotal('team1');
        const t2 = calcTotal('team2');
        if (t1 === 0 && t2 === 0) return null;
        return (
          <div className="bg-gray-800 rounded-xl p-4 mb-4 text-center">
            <p className="text-gray-400 text-xs uppercase tracking-wide mb-1">{t('gameHistory.totalPoints')}</p>
            <div className="flex justify-center items-center gap-4 text-lg font-bold">
              <span className="text-orange-400">{game.team1?.name}: {t1}</span>
              <span className="text-gray-500">·</span>
              <span className="text-blue-400">{game.team2?.name}: {t2}</span>
            </div>
          </div>
        );
      })()}

      {/* Validation error */}
      {validationError && (
        <p className="text-red-400 text-sm text-center mb-3">{validationError}</p>
      )}

      {/* Actions */}
      <div className={`flex gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
        <button
          onClick={handleCancel}
          className="flex items-center gap-2 bg-gray-700 hover:bg-gray-600 text-white px-5 py-3 rounded-lg font-semibold transition-colors"
        >
          <ArrowLeft size={18} />
          {t('common.back')}
        </button>
        <button
          onClick={finishGame}
          className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white py-3 rounded-lg font-bold transition-colors shadow-lg"
        >
          {t('games.saveAndFinish')}
        </button>
      </div>
    </div>
  );
};
