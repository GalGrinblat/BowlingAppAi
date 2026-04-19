import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from '../../../contexts/LanguageContext';
import { ABSENT_PLAYER_PENALTY } from '../../../constants/bowling';
import type { Game, GameMatch, GamePlayer } from '../../../types/index';

export type GameScoreSheetMode = 'edit' | 'readonly' | 'print';

export interface GameScoreSheetProps {
  game: Game;
  mode: GameScoreSheetMode;
  // edit mode only
  onUpdateScore?: (matchIndex: number, team: 'team1' | 'team2', playerIndex: number, pins: string) => void;
  // print mode fallback: player names when game.team1/team2 not yet populated
  printPlayers?: {
    team1: { id: string; name: string }[];
    team2: { id: string; name: string }[];
  };
}

// ─── Score input cell (edit mode only) ───────────────────────────────────────

interface ScoreInputCellProps {
  value: string;
  tabIndex: number;
  onCommit: (val: string) => void;
  accentFocus: string;
}

const ScoreInputCell: React.FC<ScoreInputCellProps> = ({ value, tabIndex, onCommit, accentFocus }) => {
  const [local, setLocal] = useState(value);
  useEffect(() => setLocal(value), [value]);

  return (
    <input
      type="number"
      inputMode="numeric"
      min="0"
      max="300"
      tabIndex={tabIndex}
      value={local}
      placeholder="—"
      onChange={e => setLocal(e.target.value)}
      onBlur={() => onCommit(local)}
      onKeyDown={e => {
        if (['-', '+', 'e', 'E'].includes(e.key)) e.preventDefault();
        if (e.key === 'Enter') {
          e.preventDefault();
          const next = document.querySelector<HTMLInputElement>(`[tabindex="${tabIndex + 1}"]`);
          next?.focus();
        }
      }}
      className={`w-14 px-1 py-1 text-center text-sm font-semibold rounded border border-gray-400 bg-white text-gray-900 focus:outline-none focus:ring-2 ${accentFocus} focus:border-transparent`}
    />
  );
};

// ─── Main component ───────────────────────────────────────────────────────────

export const GameScoreSheet: React.FC<GameScoreSheetProps> = ({
  game, mode, onUpdateScore, printPlayers,
}) => {
  const { t, direction, isRTL } = useTranslation();
  const matches = useMemo(() => game.matches ?? [], [game.matches]);
  const isPrint = mode === 'print';
  const isEdit = mode === 'edit';

  // Grand total across all matches + game-level bonus
  const totals = useMemo(() => ({
    team1TotalPoints: matches.reduce((s: number, m: GameMatch) => s + (m.team1?.points ?? 0), 0) + (game.grandTotalPoints?.team1 ?? 0),
    team2TotalPoints: matches.reduce((s: number, m: GameMatch) => s + (m.team2?.points ?? 0), 0) + (game.grandTotalPoints?.team2 ?? 0),
    team1TotalPins: matches.reduce((s: number, m: GameMatch) => s + (m.team1?.totalPins ?? 0), 0),
    team2TotalPins: matches.reduce((s: number, m: GameMatch) => s + (m.team2?.totalPins ?? 0), 0),
    team1TotalWithHC: matches.reduce((s: number, m: GameMatch) => s + (m.team1?.totalWithHandicap ?? 0), 0),
    team2TotalWithHC: matches.reduce((s: number, m: GameMatch) => s + (m.team2?.totalWithHandicap ?? 0), 0),
  }), [matches, game.grandTotalPoints]);

  const overallWinner = totals.team1TotalPoints > totals.team2TotalPoints ? 'team1'
    : totals.team2TotalPoints > totals.team1TotalPoints ? 'team2' : 'tie';

  const formatPts = (pts: number) => pts % 1 === 0 ? String(pts) : pts.toFixed(1);

  // Tab index calculation: column-major order across both teams
  const tabMap = useMemo(() => {
    const map = new Map<string, number>();
    let idx = 100;
    for (let mi = 0; mi < matches.length; mi++) {
      for (const teamKey of ['team1', 'team2'] as const) {
        const players = game[teamKey]?.players ?? [];
        players.forEach((p, pi) => {
          if (!p.absent) {
            map.set(`${mi}-${teamKey}-${pi}`, idx++);
          }
        });
      }
    }
    return map;
  }, [matches.length, game.team1?.players, game.team2?.players]); // eslint-disable-line react-hooks/exhaustive-deps

  const renderTeamTable = (teamKey: 'team1' | 'team2') => {
    const isTeam1 = teamKey === 'team1';
    const team = game[teamKey];

    // Determine player list: from game state for edit/readonly, with fallback for print
    const gamePlayers: GamePlayer[] = team?.players ?? [];
    const fallbackNames = (isTeam1 ? printPlayers?.team1 : printPlayers?.team2) ?? [];
    const playerNames: string[] = gamePlayers.length > 0
      ? gamePlayers.map(p => p.name)
      : fallbackNames.map(p => p.name);
    const playerCount = playerNames.length;

    const grandPts = isTeam1 ? (game.grandTotalPoints?.team1 ?? 0) : (game.grandTotalPoints?.team2 ?? 0);
    const teamTotalPts = isTeam1 ? totals.team1TotalPoints : totals.team2TotalPoints;

    // Styling tokens
    const accentBorder = isTeam1 ? 'border-orange-400' : 'border-blue-400';
    const accentHeader = isTeam1
      ? 'bg-orange-100 text-orange-800 border-orange-300'
      : 'bg-blue-100 text-blue-800 border-blue-300';
    const accentSubHeader = isTeam1 ? 'bg-orange-50 text-gray-700' : 'bg-blue-50 text-gray-700';
    const accentTotalBg = isTeam1 ? 'bg-orange-200 text-orange-900' : 'bg-blue-200 text-blue-900';
    const accentHcBg = isTeam1 ? 'bg-orange-50 text-orange-600' : 'bg-blue-50 text-blue-600';
    const accentWithHcBg = isTeam1 ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700';
    const accentPtsColor = isTeam1 ? 'text-orange-600' : 'text-blue-600';
    const accentFocus = isTeam1 ? 'focus:ring-orange-400' : 'focus:ring-blue-400';
    const hoverBg = isTeam1 ? 'hover:bg-orange-50' : 'hover:bg-blue-50';
    const emoji = isTeam1 ? '🟠' : '🔵';

    // Print-specific overrides
    const tableBorder = isPrint ? 'border-2 border-gray-800' : `border-2 ${accentBorder}`;
    const thBorder = isPrint ? 'border border-gray-800' : 'border border-gray-200';
    const tdBorder = isPrint ? 'border border-gray-800' : 'border-b border-gray-100';
    const headerBg = isPrint ? 'bg-gray-200 text-gray-900' : accentHeader;
    const subHeaderBg = isPrint ? 'bg-gray-100 text-gray-700' : accentSubHeader;

    const numCols = matches.length * 2 + 3; // Player + (Score+Pts)*N + Pins + TotalPts

    // Blank cell height for print mode
    const blankCellH = isPrint ? 'py-5' : 'py-1.5';

    return (
      <div className="overflow-x-auto">
        <table className={`w-full text-sm ${tableBorder}`}>
          <thead>
            {/* Team name */}
            <tr className={headerBg}>
              <th
                colSpan={numCols}
                className={`px-2 py-1.5 font-bold ${thBorder} text-center`}
              >
                {!isPrint && `${emoji} `}{team?.name ?? ''}
              </th>
            </tr>
            {/* Match group headers */}
            <tr className={subHeaderBg}>
              <th rowSpan={2} className={`px-2 py-1.5 text-xs font-bold align-bottom ${thBorder} ${isRTL ? 'text-right' : 'text-left'}`}>
                {t('common.player')}
              </th>
              {matches.map((m) => (
                <th key={`grp-${m.matchNumber}`} colSpan={2} className={`px-1 py-1 text-center text-xs font-bold ${thBorder}`}>
                  {t('common.match')} {m.matchNumber}
                </th>
              ))}
              <th colSpan={2} className={`px-1 py-1 text-center text-xs font-bold ${thBorder} ${isPrint ? 'bg-gray-200' : 'bg-gray-100'}`}>
                {t('common.total')}
              </th>
            </tr>
            {/* Score / Pts sub-headers */}
            <tr className={subHeaderBg}>
              {matches.map((m) => (
                <React.Fragment key={`sub-${m.matchNumber}`}>
                  <th className={`px-1 py-1 text-center text-xs font-semibold ${thBorder}`}>{t('common.score')}</th>
                  <th className={`px-1 py-1 text-center text-xs font-semibold ${thBorder}`}>{t('common.pts')}</th>
                </React.Fragment>
              ))}
              <th className={`px-1 py-1 text-center text-xs font-semibold ${thBorder} ${isPrint ? 'bg-gray-200' : 'bg-gray-100'}`}>{t('common.pins')}</th>
              <th className={`px-1 py-1 text-center text-xs font-semibold ${thBorder} ${isPrint ? 'bg-gray-200' : 'bg-gray-100'}`}>{t('common.pts')}</th>
            </tr>
          </thead>
          <tbody>
            {/* Player rows */}
            {Array.from({ length: playerCount }, (_, playerIdx) => {
              const player = gamePlayers[playerIdx];
              const isAbsent = player?.absent ?? false;
              const absentScore = player ? Math.floor(player.average - ABSENT_PLAYER_PENALTY) : 0;
              const playerTotalPins = isAbsent
                ? absentScore * matches.length
                : matches.reduce((s, m) => {
                    const pins = m[teamKey]?.players[playerIdx]?.pins;
                    return s + (pins !== '' && pins !== undefined ? parseInt(pins) : 0);
                  }, 0);
              const playerTotalPts = matches.reduce((s, m) => {
                const pm = m.playerMatches?.[playerIdx];
                return s + (isTeam1 ? (pm?.team1Points ?? 0) : (pm?.team2Points ?? 0));
              }, 0);

              return (
                <tr key={playerIdx} className={`${tdBorder} ${!isPrint ? hoverBg : ''}`}>
                  {/* Player name */}
                  <td className={`px-2 py-1.5 text-xs font-semibold ${isPrint ? 'text-gray-900' : 'text-gray-800'} ${thBorder} ${isRTL ? 'text-right' : 'text-left'}`}>
                    <div className="whitespace-nowrap">
                      {playerIdx + 1}. {isPrint ? playerNames[playerIdx]?.split(' ')[0] : playerNames[playerIdx]}
                      {isAbsent && !isPrint && (
                        <span className="ml-1 text-[10px] font-normal text-red-400 italic">({t('games.absent')})</span>
                      )}
                    </div>
                    {isEdit && player && !isAbsent && (
                      <div className="text-[10px] text-gray-400 font-normal mt-0.5">
                        {t('games.avg')}: {player.average.toFixed(0)}
                        {game.useHandicap && ` · ${t('games.hc')}: ${player.handicap}`}
                      </div>
                    )}
                  </td>

                  {/* Per-match cells */}
                  {matches.map((match, mi) => {
                    const matchPlayer = match[teamKey]?.players[playerIdx];
                    const pm = match.playerMatches?.[playerIdx];
                    const result = pm?.result;
                    const matchPts = isTeam1 ? (pm?.team1Points ?? 0) : (pm?.team2Points ?? 0);
                    const pinsVal = isAbsent
                      ? String(absentScore)
                      : (matchPlayer?.pins ?? '');

                    const resultIcon = !isAbsent && result != null
                      ? (isTeam1
                          ? (result === 'team1' ? '✅' : result === 'team2' ? '❌' : '⚖️')
                          : (result === 'team2' ? '✅' : result === 'team1' ? '❌' : '⚖️'))
                      : '';

                    const tabIdx = tabMap.get(`${mi}-${teamKey}-${playerIdx}`) ?? -1;

                    return (
                      <React.Fragment key={`m${mi}`}>
                        {/* Score cell */}
                        <td className={`px-1 text-center ${thBorder} ${blankCellH}`}>
                          {isAbsent ? (
                            <span className="text-xs text-gray-400 italic">({absentScore})</span>
                          ) : isEdit ? (
                            <ScoreInputCell
                              value={pinsVal}
                              tabIndex={tabIdx}
                              onCommit={val => onUpdateScore?.(mi, teamKey, playerIdx, val)}
                              accentFocus={accentFocus}
                            />
                          ) : (
                            <span className={`text-xs font-semibold ${isPrint ? 'text-gray-900' : 'text-gray-800'}`}>
                              {pinsVal !== '' ? pinsVal : ''}
                            </span>
                          )}
                          {!isPrint && resultIcon && (
                            <div className="text-[10px] leading-none mt-0.5">{resultIcon}</div>
                          )}
                        </td>
                        {/* Points cell */}
                        <td className={`px-1 text-center ${thBorder} ${blankCellH} ${!isPrint ? accentPtsColor : 'text-gray-700'} text-xs font-semibold`}>
                          {!isPrint && result != null ? formatPts(matchPts) : ''}
                        </td>
                      </React.Fragment>
                    );
                  })}

                  {/* Total pins */}
                  <td className={`px-1 py-1.5 text-center text-xs font-bold ${thBorder} ${isPrint ? 'bg-gray-100' : 'bg-gray-50'} ${isAbsent && !isPrint ? 'text-gray-400 italic' : ''}`}>
                    {isPrint
                      ? ''
                      : isAbsent ? `(${playerTotalPins})` : (playerTotalPins > 0 ? playerTotalPins : '')}
                  </td>
                  {/* Total pts */}
                  <td className={`px-1 py-1.5 text-center text-xs font-bold ${thBorder} ${isPrint ? 'bg-gray-100' : `bg-gray-50 ${accentPtsColor}`}`}>
                    {!isPrint && playerTotalPts > 0 ? formatPts(playerTotalPts) : ''}
                  </td>
                </tr>
              );
            })}

            {/* Team Scratch row */}
            <tr className={`font-bold text-xs border-t-2 ${isPrint ? 'border-gray-800 bg-gray-50' : `${accentTotalBg} border-gray-300`}`}>
              <td className={`px-2 py-1.5 ${thBorder} ${isRTL ? 'text-right' : 'text-left'}`}>
                {t('gameHistory.teamTotal')}
              </td>
              {matches.map((m, mi) => (
                <React.Fragment key={`scratch-${mi}`}>
                  <td className={`px-1 py-1.5 text-center ${thBorder} ${isPrint ? blankCellH : ''}`}>
                    {!isPrint ? (m[teamKey]?.totalPins ?? 0) : ''}
                  </td>
                  <td className={`${thBorder} ${isPrint ? blankCellH : ''}`} />
                </React.Fragment>
              ))}
              <td className={`px-1 py-1.5 text-center ${thBorder} ${isPrint ? blankCellH : ''}`}>
                {!isPrint ? (isTeam1 ? totals.team1TotalPins : totals.team2TotalPins) : ''}
              </td>
              <td className={`${thBorder} ${isPrint ? blankCellH : ''}`} />
            </tr>

            {/* Handicap row — only when useHandicap */}
            {game.useHandicap && (
              <tr className={`text-xs font-semibold ${isPrint ? 'bg-gray-50' : accentHcBg}`}>
                <td className={`px-2 py-1.5 ${thBorder} ${isRTL ? 'text-right' : 'text-left'}`}>
                  {t('common.handicap')}
                </td>
                {matches.map((m, mi) => {
                  const hdc = (m[teamKey]?.totalWithHandicap ?? 0) - (m[teamKey]?.totalPins ?? 0);
                  return (
                    <React.Fragment key={`hdc-${mi}`}>
                      <td className={`px-1 py-1.5 text-center ${thBorder} ${isPrint ? blankCellH : ''}`}>
                        {!isPrint ? hdc : ''}
                      </td>
                      <td className={`${thBorder} ${isPrint ? blankCellH : ''}`} />
                    </React.Fragment>
                  );
                })}
                <td className={`px-1 py-1.5 text-center ${thBorder} ${isPrint ? blankCellH : ''}`}>
                  {!isPrint ? (isTeam1 ? totals.team1TotalWithHC - totals.team1TotalPins : totals.team2TotalWithHC - totals.team2TotalPins) : ''}
                </td>
                <td className={`${thBorder} ${isPrint ? blankCellH : ''}`} />
              </tr>
            )}

            {/* Team Total (with handicap) row */}
            {game.useHandicap && (
              <tr className={`text-xs font-semibold border-t ${isPrint ? 'bg-gray-50' : accentWithHcBg}`}>
                <td className={`px-2 py-1.5 ${thBorder} ${isRTL ? 'text-right' : 'text-left'}`}>
                  {t('gameHistory.withHandicap')}
                </td>
                {matches.map((m, mi) => {
                  const t1 = m.team1?.totalWithHandicap ?? 0;
                  const t2 = m.team2?.totalWithHandicap ?? 0;
                  const winIcon = isTeam1
                    ? (t1 > t2 ? '✅' : t1 === t2 ? '⚖️' : '❌')
                    : (t2 > t1 ? '✅' : t2 === t1 ? '⚖️' : '❌');
                  // Team match winner points only (exclude player pts and bonus pts)
                  const matchAllPts = m[teamKey]?.points ?? 0;
                  const matchPlayerPts = (m.playerMatches ?? []).reduce((s, pm) =>
                    s + (isTeam1 ? (pm.team1Points ?? 0) : (pm.team2Points ?? 0)), 0);
                  const matchBonusPts = m[teamKey]?.bonusPoints ?? 0;
                  const matchTeamWinnerPts = matchAllPts - matchPlayerPts - matchBonusPts;
                  return (
                    <React.Fragment key={`whc-${mi}`}>
                      <td className={`px-1 py-1.5 text-center ${thBorder} ${isPrint ? blankCellH : ''}`}>
                        {!isPrint && (
                          <>
                            <div>{isTeam1 ? t1 : t2}</div>
                            <div className="text-[10px]">{winIcon}</div>
                          </>
                        )}
                      </td>
                      <td className={`px-1 py-1.5 text-center font-bold ${thBorder} ${isPrint ? blankCellH : ''}`}>
                        {!isPrint && matchTeamWinnerPts > 0 ? formatPts(matchTeamWinnerPts) : ''}
                      </td>
                    </React.Fragment>
                  );
                })}
                <td className={`px-1 py-1.5 text-center ${thBorder} ${isPrint ? blankCellH : ''}`}>
                  {!isPrint && (
                    <>
                      <div>{isTeam1 ? totals.team1TotalWithHC : totals.team2TotalWithHC}</div>
                      <div className="text-[10px]">{overallWinner === teamKey ? '✅' : overallWinner === (isTeam1 ? 'team2' : 'team1') ? '❌' : '⚖️'}</div>
                    </>
                  )}
                </td>
                <td className={`px-1 py-1.5 text-center font-bold ${thBorder} ${isPrint ? blankCellH : `${accentPtsColor}`}`}>
                  {!isPrint && grandPts > 0 ? formatPts(grandPts) : ''}
                </td>
              </tr>
            )}

            {/* Total Points row */}
            <tr className={`font-bold text-xs border-t-2 ${isPrint ? 'border-gray-800 bg-gray-100' : 'bg-gray-800 text-white border-gray-700'}`}>
              <td className={`px-2 py-1.5 ${thBorder} ${isRTL ? 'text-right' : 'text-left'}`}>
                {t('gameHistory.totalPoints')}
              </td>
              {matches.map((m, mi) => {
                const matchAllPts = m[teamKey]?.points ?? 0;
                return (
                  <React.Fragment key={`tpt-${mi}`}>
                    <td className={`${thBorder} ${isPrint ? blankCellH : ''}`} />
                    <td className={`px-1 py-1.5 text-center ${thBorder} ${isPrint ? blankCellH : ''}`}>
                      {!isPrint && matchAllPts > 0 ? formatPts(matchAllPts) : ''}
                    </td>
                  </React.Fragment>
                );
              })}
              <td className={`${thBorder} ${isPrint ? blankCellH : ''}`} />
              <td className={`px-1 py-1.5 text-center ${thBorder} ${isPrint ? blankCellH : ''}`}>
                {!isPrint ? formatPts(teamTotalPts) : ''}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className={isPrint ? '' : 'p-0 sm:p-3'}>
      <div className={`grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4`} dir={direction}>
        {renderTeamTable('team1')}
        {renderTeamTable('team2')}
      </div>
    </div>
  );
};
