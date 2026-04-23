import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { gamesApi } from '../../../services/api';
import { LoadingSpinner } from '../../common/LoadingSpinner';
import { useTranslation } from '../../../contexts/LanguageContext';
import { useAuth } from '../../../contexts/AuthContext';
import { getPlayerDisplayName } from '../../../utils/playerUtils';
import { PreMatchSetup } from '../../common/game/PreMatchSetup';
import { MatchView } from '../../common/game/MatchView';
import { createEmptyMatch, calculateMatchResults, calculateBonusPoints, clampScore } from '../../../utils/matchUtils';
import { calculateGrandTotalPoints, calculateGameTotals, calculatePlayerStats } from '../../../utils/statsUtils';
import { buildGameTeamsFromIds } from '../../../utils/gameInitUtils';
import { recalculatePlayerAveragesAndHandicaps } from '../../../hooks/usePlayerAverages';
import { GameSummaryView } from '../../common/game/GameSummaryView';
import type { Game, GamePlayer, GameMatch, PendingSubmission } from '../../../types/index';

// ─── Draft persistence ────────────────────────────────────────────────────────

const draftKey = (gameId: string) => `score_draft_${gameId}`;

interface Draft {
  step: 1 | 2 | 3;
  team1Players: GamePlayer[];
  team2Players: GamePlayer[];
  matches: GameMatch[];
  currentMatch: number;
}

function getOrCreateSessionId(): string {
  const key = 'score_session_id';
  let id = localStorage.getItem(key);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(key, id);
  }
  return id;
}

// ─── Error screen ─────────────────────────────────────────────────────────────

type ErrorKind = 'notFound' | 'completed' | 'postponed' | 'loadError';

const ErrorScreen: React.FC<{ kind: ErrorKind; t: (k: string) => string }> = ({ kind, t }) => {
  const titles: Record<ErrorKind, string> = {
    notFound:   t('score.notFound'),
    completed:  t('score.alreadyComplete'),
    postponed:  t('score.postponed'),
    loadError:  t('score.loadError'),
  };
  const descs: Record<ErrorKind, string> = {
    notFound:   t('score.notFoundDesc'),
    completed:  t('score.alreadyCompleteDesc'),
    postponed:  t('score.postponedDesc'),
    loadError:  t('score.loadError'),
  };
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 text-center">
      <div className="text-5xl mb-4">🎳</div>
      <h1 className="text-2xl font-bold text-white mb-2">{titles[kind]}</h1>
      <p className="text-gray-400 max-w-sm">{descs[kind]}</p>
    </div>
  );
};

// ─── Step indicator ───────────────────────────────────────────────────────────

const StepIndicator: React.FC<{ step: 1 | 2 | 3 | 4; t: (k: string) => string }> = ({ step, t }) => {
  const steps = [t('score.step1'), t('score.step2'), t('score.step3')];
  return (
    <div className="flex items-center justify-center gap-2 mb-6">
      {steps.map((label, i) => {
        const num = i + 1;
        const active = num === step;
        const done = num < step;
        return (
          <React.Fragment key={num}>
            <div className="flex flex-col items-center gap-1">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold
                ${active ? 'bg-blue-500 text-white' : done ? 'bg-green-500 text-white' : 'bg-gray-700 text-gray-400'}`}>
                {done ? '✓' : num}
              </div>
              <span className={`text-xs hidden sm:block ${active ? 'text-blue-400' : done ? 'text-green-400' : 'text-gray-500'}`}>
                {label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div className={`flex-1 h-0.5 max-w-12 ${done ? 'bg-green-500' : 'bg-gray-700'}`} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};

// ─── Submitted screen ─────────────────────────────────────────────────────────

const SubmittedScreen: React.FC<{ gameId: string; t: (k: string) => string }> = ({ gameId, t }) => {
  const [copied, setCopied] = useState(false);
  const url = `${window.location.origin}/score/${gameId}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 text-center">
      <div className="text-6xl mb-4">✅</div>
      <h1 className="text-2xl font-bold text-white mb-2">{t('score.submitted')}</h1>
      <p className="text-gray-400 mb-8 max-w-sm">{t('score.submittedDesc')}</p>
      <button
        onClick={handleCopy}
        className="bg-gray-700 hover:bg-gray-600 text-white px-6 py-3 rounded-lg text-sm transition-colors"
      >
        {copied ? t('score.linkCopied') : t('score.shareLink')}
      </button>
    </div>
  );
};

// ─── Main component ───────────────────────────────────────────────────────────

export const PlayerScoreEntry: React.FC = () => {
  const { gameId } = useParams<{ gameId: string }>();
  const { t } = useTranslation();
  const { playerData } = useAuth();

  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState<ErrorKind | null>(null);
  const [game, setGame]             = useState<Game | null>(null);
  const [step, setStep]             = useState<1 | 2 | 3 | 4>(1);
  const [team1Players, setTeam1Players] = useState<GamePlayer[]>([]);
  const [team2Players, setTeam2Players] = useState<GamePlayer[]>([]);
  const [localGame, setLocalGame]   = useState<Game | null>(null);
  const [currentMatch, setCurrentMatch] = useState(1);
  const [submitError, setSubmitError] = useState<string | false>(false);
  const [hasPending, setHasPending] = useState(false);
  const [draftRestoredMsg, setDraftRestoredMsg] = useState(false);

  const sessionId = useMemo(() => getOrCreateSessionId(), []);

  // beforeunload warning while entering data
  useEffect(() => {
    if (step === 4 || loading || error) return;
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [step, loading, error]);

  // Auto-save draft (500ms debounce)
  const draftTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!game || step === 4 || !localGame) return;
    if (draftTimer.current) clearTimeout(draftTimer.current);
    draftTimer.current = setTimeout(() => {
      const draft: Draft = { step, team1Players, team2Players, matches: localGame.matches ?? [], currentMatch };
      try { localStorage.setItem(draftKey(gameId!), JSON.stringify(draft)); } catch { /* quota exceeded */ }
    }, 500);
    return () => { if (draftTimer.current) clearTimeout(draftTimer.current); };
  }, [step, team1Players, team2Players, localGame, currentMatch, game, gameId]);

  // ── Load game ──────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!gameId) { setError('notFound'); setLoading(false); return; }

    const load = async () => {
      try {
        const gameData = await gamesApi.getById(gameId);
        if (!gameData) { setError('notFound'); return; }
        if (gameData.status === 'completed') { setError('completed'); return; }
        if (gameData.postponed) { setError('postponed'); return; }
        if (gameData.pendingSubmission) setHasPending(true);

        // Build roster from team IDs if not already in game (read-only — no DB write)
        if (!gameData.team1 || !gameData.team2) {
          const teams = await buildGameTeamsFromIds(gameData.team1Id, gameData.team2Id);
          if (!teams) { setError('notFound'); return; }
          gameData.team1 = teams.team1;
          gameData.team2 = teams.team2;
        }

        // Populate real averages & handicaps from season history (in-memory only, no DB write)
        await recalculatePlayerAveragesAndHandicaps(gameData);

        // Initialize matches in memory if missing (no DB write)
        if (!gameData.matches || gameData.matches.length === 0) {
          const playersPerTeam = gameData.team1.players.length;
          gameData.matches = Array.from({ length: gameData.matchesPerGame }, (_, i) =>
            createEmptyMatch(i + 1, playersPerTeam)
          );
        }

        setGame(gameData);

        let t1 = [...gameData.team1.players];
        let t2 = [...gameData.team2.players];
        let matches = gameData.matches ? [...gameData.matches] : [];
        let restoredStep: 1 | 2 | 3 = 1;
        let restoredMatch = 1;
        let restored = false;

        // Restore draft if player counts still match
        try {
          const saved = localStorage.getItem(draftKey(gameId));
          if (saved) {
            const draft: Draft = JSON.parse(saved);
            const countMatch =
              draft.team1Players?.length === gameData.team1.players.length &&
              draft.team2Players?.length === gameData.team2.players.length &&
              draft.matches?.length === gameData.matches.length;
            if (countMatch) {
              t1 = draft.team1Players;
              t2 = draft.team2Players;
              matches = draft.matches;
              restoredStep = draft.step;
              restoredMatch = draft.currentMatch;
              restored = true;
              // Overlay fresh averages/handicaps so stale drafts don't carry zero values
              t1 = t1.map((p, i) => ({ ...p, average: gameData.team1!.players[i]?.average ?? p.average, handicap: gameData.team1!.players[i]?.handicap ?? p.handicap }));
              t2 = t2.map((p, i) => ({ ...p, average: gameData.team2!.players[i]?.average ?? p.average, handicap: gameData.team2!.players[i]?.handicap ?? p.handicap }));
            } else {
              localStorage.removeItem(draftKey(gameId));
            }
          }
        } catch {
          localStorage.removeItem(draftKey(gameId));
        }

        setTeam1Players(t1);
        setTeam2Players(t2);
        setLocalGame({ ...gameData, team1: { ...gameData.team1, players: t1 }, team2: { ...gameData.team2, players: t2 }, matches });
        setStep(restoredStep);
        setCurrentMatch(restoredMatch);
        if (restored) setDraftRestoredMsg(true);

      } catch {
        setError('loadError');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [gameId]);

  // ── PreMatchSetup handlers ─────────────────────────────────────────────────

  const handleContinueToScoring = useCallback((team1: GamePlayer[], team2: GamePlayer[]) => {
    setTeam1Players(team1);
    setTeam2Players(team2);
    setLocalGame(prev => prev ? {
      ...prev,
      team1: { ...prev.team1!, players: team1 },
      team2: { ...prev.team2!, players: team2 },
    } : prev);
    setStep(2);
  }, []);

  // ── MatchView score handlers (local state only — no DB write) ──────────────

  const handleUpdateScore = useCallback((matchIndex: number, team: 'team1' | 'team2', playerIndex: number, pins: string) => {
    setLocalGame(prev => {
      if (!prev?.matches || !prev.team1 || !prev.team2) return prev;

      const parsed = parseInt(pins);
      const sanitized = pins === '' ? '' : isNaN(parsed) ? '' : String(clampScore(parsed));
      const gamePlayer = prev[team]?.players?.[playerIndex];
      if (!gamePlayer) return prev;
      const bonusPoints = calculateBonusPoints(sanitized, gamePlayer.average, gamePlayer.absent, prev.bonusRules ?? []);

      const updated: Game = {
        ...prev,
        matches: prev.matches.map((m, mi) => {
          if (mi !== matchIndex) return m;
          const updatedTeamSide = {
            ...m[team],
            players: m[team].players.map((p, pi) =>
              pi === playerIndex ? { ...p, pins: sanitized, bonusPoints } : p
            ),
          };
          return {
            ...m,
            [team]: updatedTeamSide,
            playerMatches: m.playerMatches.map(pm => ({ ...pm })),
          };
        }),
      };

      calculateMatchResults(updated, matchIndex);
      updated.grandTotalPoints = calculateGrandTotalPoints(updated);
      return updated;
    });
  }, []);

  const handleToggleAbsentInMatch = useCallback((team: 'team1' | 'team2', playerIndex: number) => {
    setLocalGame(prev => {
      if (!prev?.team1?.players || !prev.team2?.players) return prev;
      const updated: Game = { ...prev };
      if (team === 'team1' && updated.team1?.players?.[playerIndex]) {
        updated.team1 = { ...updated.team1, players: updated.team1.players.map((p, i) => i === playerIndex ? { ...p, absent: !p.absent } : p) };
      } else if (team === 'team2' && updated.team2?.players?.[playerIndex]) {
        updated.team2 = { ...updated.team2, players: updated.team2.players.map((p, i) => i === playerIndex ? { ...p, absent: !p.absent } : p) };
      }
      return updated;
    });
  }, []);

  const handleNavigate = useCallback((direction: string) => {
    if (!localGame?.matches) return;
    if (direction === 'next') {
      if (currentMatch < localGame.matches.length) {
        setCurrentMatch(m => m + 1);
      } else {
        // On last match — go to summary/review step
        setStep(3);
      }
    } else {
      if (currentMatch > 1) setCurrentMatch(m => m - 1);
      else setStep(1);
    }
  }, [localGame, currentMatch]);

  // ── Submit ─────────────────────────────────────────────────────────────────

  const handleSubmit = useCallback(async () => {
    if (!localGame?.matches || !localGame.team1 || !localGame.team2) return;
    setSubmitError(false);

    const submission: PendingSubmission = {
      submittedAt: new Date().toISOString(),
      sessionId,
      ...(playerData && {
        submitterId: playerData.id,
        submitterName: getPlayerDisplayName(playerData),
      }),
      team1AbsentFlags: localGame.team1.players.map(p => p.absent),
      team2AbsentFlags: localGame.team2.players.map(p => p.absent),
      team1PlayerOrder: localGame.team1.players.map(p => p.playerId),
      team2PlayerOrder: localGame.team2.players.map(p => p.playerId),
      matchScores: localGame.matches.map(m => ({
        team1Pins: m.team1.players.map(p => p.pins === '' ? 0 : parseInt(p.pins, 10)),
        team2Pins: m.team2.players.map(p => p.pins === '' ? 0 : parseInt(p.pins, 10)),
      })),
    };

    const result = await gamesApi.submitPending(gameId!, submission);
    if (result.ok) {
      try { localStorage.removeItem(draftKey(gameId!)); } catch { /* ignore */ }
      setStep(4);
    } else {
      setSubmitError(result.errorMessage ?? t('score.submitError'));
    }
  }, [localGame, sessionId, gameId, playerData, t]);

  // ── Render ─────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) return <ErrorScreen kind={error} t={t} />;
  if (!game || !localGame) return <ErrorScreen kind="notFound" t={t} />;
  if (step === 4) return <SubmittedScreen gameId={gameId!} t={t} />;

  return (
    <div className="min-h-screen bg-gray-900 pb-8">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 px-4 py-3 flex items-center justify-between">
        <div className="text-lg font-bold text-white">🎳 {t('score.title')}</div>
        <div className="text-sm text-gray-400 flex items-center gap-1 min-w-0">
          <span className="truncate max-w-[120px]">{game.team1?.name}</span>
          <span className="shrink-0">vs</span>
          <span className="truncate max-w-[120px]">{game.team2?.name}</span>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 pt-6">
        <StepIndicator step={step} t={t} />

        {/* Banners */}
        {draftRestoredMsg && (
          <div className="mb-4 bg-blue-900/40 border border-blue-500 text-blue-300 text-sm px-4 py-2 rounded-lg flex items-center justify-between">
            <span>{t('score.draftRestored')}</span>
            <button onClick={() => setDraftRestoredMsg(false)} className="text-blue-400 hover:text-blue-200 ml-4">✕</button>
          </div>
        )}
        {hasPending && (
          <div className="mb-4 bg-yellow-900/40 border border-yellow-500 text-yellow-300 text-sm px-4 py-2 rounded-lg">
            {t('score.pendingWarning')}
          </div>
        )}
        {submitError && (
          <div className="mb-4 bg-red-900/40 border border-red-500 text-red-300 text-sm px-4 py-2 rounded-lg flex items-start justify-between gap-3">
            <div>
              <p className="font-semibold">{t('score.submitError')}</p>
              {typeof submitError === 'string' && submitError !== t('score.submitError') && (
                <p className="text-xs text-red-400 mt-1 break-all">{submitError}</p>
              )}
            </div>
            <button onClick={handleSubmit} className="text-red-300 hover:text-red-100 underline shrink-0">{t('score.retry')}</button>
          </div>
        )}

        {/* Step 1: Pre-Match Setup */}
        {step === 1 && (
          <PreMatchSetup
            game={game}
            initialTeam1Players={team1Players}
            initialTeam2Players={team2Players}
            onContinue={handleContinueToScoring}
            onBack={() => window.history.back()}
          />
        )}

        {/* Step 2: Match Score Entry */}
        {step === 2 && (
          <MatchView
            matchNumber={currentMatch}
            game={localGame}
            onUpdateScore={handleUpdateScore}
            onToggleAbsent={handleToggleAbsentInMatch}
            onNavigate={handleNavigate}
            onCancel={() => setStep(1)}
          />
        )}

        {/* Step 3: Summary & Review */}
        {step === 3 && (
          <GameSummaryView
            game={localGame}
            totals={calculateGameTotals(localGame)}
            playerStats={calculatePlayerStats(localGame)}
            onBack={() => {
              setCurrentMatch(localGame.matches?.length ?? 1);
              setStep(2);
            }}
            onFinish={handleSubmit}
          />
        )}
      </div>
    </div>
  );
};
