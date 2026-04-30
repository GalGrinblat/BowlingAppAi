import React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { EmptyState } from '../common/EmptyState';
import { useTranslation } from '../../contexts/LanguageContext';
import { useDateFormat } from '../../hooks/useDateFormat';
import { NavLink } from '../common/nav/NavLink';
import { ArrowLeft, ArrowRight } from '../common/Icons';
import { getPlayerDisplayName } from '../../utils/playerUtils';
import { useAuth } from '../../contexts/AuthContext';
import { usePlayerDashboardData } from '../../hooks/usePlayerDashboardData';

export const PlayerDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { playerData, isLoading: authIsLoading, session } = useAuth();
  const playerId = playerData?.id ?? '';
  const { t, isRTL } = useTranslation();
  const { formatDate } = useDateFormat();
  const ForwardIcon = isRTL ? ArrowLeft : ArrowRight;
  const [searchParams, setSearchParams] = useSearchParams();
  const view = searchParams.get('view') ?? 'dashboard';

  const {
    player,
    playerLeagues,
    recentCompletedGames,
    nextGame,
    nextGameDetails,
    playerStats,
    enrichedGames,
    isLoading,
    loadError,
  } = usePlayerDashboardData(playerId);

  if (authIsLoading) return (
    <div className="flex items-center justify-center min-h-64">
      <LoadingSpinner color="purple" />
    </div>
  );

  if (!playerData) return (
    <div className="max-w-lg mx-auto mt-16 px-4">
      <div className="bg-gradient-to-r from-amber-400 to-orange-500 rounded-xl shadow-lg p-8 text-white text-center">
        <p className="text-5xl mb-4">🔗</p>
        <h2 className="text-2xl font-bold mb-2">{t('playerDashboard.notLinkedTitle')}</h2>
        <p className="text-amber-100 mb-1">{t('playerDashboard.notLinkedDesc')}</p>
        {session?.user?.email && (
          <p className="text-amber-200 text-sm mb-6">
            {t('playerDashboard.notLinkedSignedInAs')}: <strong>{session.user.email}</strong>
          </p>
        )}
        <a
          href="/board"
          className="inline-block bg-white text-orange-600 font-bold px-6 py-3 rounded-lg hover:bg-orange-50 transition-colors"
        >
          {t('playerDashboard.notLinkedBrowseBoard')}
        </a>
      </div>
    </div>
  );

  if (isLoading) return (
    <div className="flex items-center justify-center min-h-64">
      <LoadingSpinner color="purple" />
    </div>
  );
  if (loadError) return <div className="text-red-600 p-6">{loadError}</div>;
  if (!player) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-500 to-blue-600 rounded-xl shadow-lg p-6 text-white">
        <h1 className="text-3xl font-bold mb-2">{t('playerDashboard.welcome')}, {getPlayerDisplayName(player)}!</h1>
        <p className="text-purple-100">{t('playerDashboard.playerDashboard')}</p>
        <div className="flex gap-4 mt-4 text-sm">
          <span>🎳 {playerLeagues.length} {playerLeagues.length === 1 ? t('playerDashboard.activeLeagues') : t('playerDashboard.activeLeaguesPlural')}</span>
          <span>📊 {recentCompletedGames.length} {recentCompletedGames.length === 1 ? t('playerDashboard.recentGame') : t('playerDashboard.recentGamesPlural')}</span>
        </div>
      </div>

      {/* My Leagues */}
      {playerLeagues.length > 0 && (
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">{t('playerDashboard.myLeagues')}</h2>
          <div className="space-y-3">
            {playerLeagues.map(league => (
              <div key={league.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <p className="font-semibold text-gray-800">{league.name}</p>
                <NavLink
                  direction="forward"
                  label={t('playerDashboard.viewStandings')}
                  to={`/board/leagues/${league.id}`}
                  className="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline whitespace-nowrap"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* View Tabs */}
      <div className="bg-white rounded-xl shadow-lg p-2 flex gap-1 sm:gap-2 overflow-x-auto">
        <button
          onClick={() => setSearchParams({ view: 'dashboard' })}
          className={`flex-1 min-w-[90px] py-2 sm:py-3 px-2 sm:px-4 rounded-lg font-semibold text-xs sm:text-base transition-colors whitespace-nowrap ${
            view === 'dashboard'
              ? 'bg-purple-600 text-white'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          🏠 {t('playerDashboard.dashboard')}
        </button>
        <button
          onClick={() => setSearchParams({ view: 'stats' })}
          className={`flex-1 min-w-[90px] py-2 sm:py-3 px-2 sm:px-4 rounded-lg font-semibold text-xs sm:text-base transition-colors whitespace-nowrap ${
            view === 'stats'
              ? 'bg-purple-600 text-white'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          📊 {t('playerDashboard.myStats')}
        </button>
      </div>

      {/* Dashboard View */}
      {view === 'dashboard' && (
        <>
          {/* Next Game */}
          {nextGame && nextGameDetails && (() => {
            const { league, team1, team2 } = nextGameDetails;
            const isTeam1 = team1?.playerIds.includes(playerId);
            const myTeam = isTeam1 ? team1 : team2;
            const opponentTeam = isTeam1 ? team2 : team1;
            const hasPending = !!nextGame.pendingSubmission;
            return (
              <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-purple-500">
                <h2 className="text-xl font-bold text-gray-800 mb-3">{t('playerDashboard.nextGame')}</h2>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    {league && (
                      <span className="text-xs font-semibold text-purple-600 bg-purple-100 px-2 py-1 rounded">
                        {league.name}
                      </span>
                    )}
                    <div className="flex items-center gap-2 mt-2 text-sm text-gray-500">
                      <span>{t('common.round')} {nextGame.round}</span>
                      <span>·</span>
                      <span>{t('common.matchDay')} {nextGame.matchDay}</span>
                      {nextGame.scheduledDate && (
                        <>
                          <span>·</span>
                          <span>{formatDate(nextGame.scheduledDate)}</span>
                        </>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="font-semibold text-blue-600">{myTeam?.name}</span>
                      <span className="text-gray-400 text-sm">{t('common.vs')}</span>
                      <span className="font-semibold text-gray-700">{opponentTeam?.name}</span>
                    </div>
                    {hasPending && (
                      <p className="text-xs text-amber-600 mt-1 font-medium">
                        {t('playerDashboard.scoresPendingReview')}
                      </p>
                    )}
                  </div>
                  <a
                    href={`/score/${nextGame.id}`}
                    className="inline-flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 text-white font-bold px-5 py-2.5 rounded-lg transition-colors whitespace-nowrap text-sm"
                  >
                    🎳 {t('playerDashboard.enterScores')}
                  </a>
                </div>
              </div>
            );
          })()}

          {/* Recent Completed Games */}
          {recentCompletedGames.length > 0 && (
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">{t('playerDashboard.recentCompletedGames')}</h2>
              <div className="space-y-3">
                {enrichedGames.map(data => {
                  if (!data) return null;
                  const {
                    game, league, team1, team2, isTeam1, team1TotalPoints, team2TotalPoints, playerWon,
                    wasAbsent, matchPins, playerTotalPins, gameAverage, playerMatchPoints,
                    matchWins, matchLosses, matchDraws, highestPin
                  } = data;

                  return (
                    <button
                      key={game.id}
                      type="button"
                      className="w-full text-left p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                      onClick={() => navigate(`/player/games/${game.id}`, { state: { game } })}
                    >
                      {/* Header row */}
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs font-semibold text-purple-600 bg-purple-100 px-2 py-1 rounded">
                          {league?.name}
                        </span>
                        <span className="text-xs text-gray-500">
                          {t('common.round')} {game.round} • {t('common.matchDay')} {game.matchDay}
                        </span>
                        <span className="text-xs text-gray-400">
                          {formatDate(game.completedAt || '')}
                        </span>
                      </div>

                      {/* Team matchup + result */}
                      <div className="flex items-center justify-between gap-3 mb-3">
                        <div className="flex items-center gap-2 min-w-0 shrink">
                          <span className={`font-semibold truncate ${isTeam1 ? 'text-blue-600' : 'text-gray-700'}`}>
                            {game.team1?.name || team1?.name}
                          </span>
                          <div className="text-center shrink-0">
                            <div className="text-xs text-gray-400 leading-none mb-0.5">{t('playerDashboard.totalPoints')}</div>
                            <span className="text-sm text-gray-500">
                              <span className="font-bold text-gray-700">{team1TotalPoints}</span>
                              <span className="mx-0.5">-</span>
                              <span className="font-bold text-gray-700">{team2TotalPoints}</span>
                            </span>
                          </div>
                          <span className={`font-semibold truncate ${!isTeam1 ? 'text-blue-600' : 'text-gray-700'}`}>
                            {game.team2?.name || team2?.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {playerWon ? (
                            <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded font-semibold">
                              {t('playerDashboard.won')}
                            </span>
                          ) : team1TotalPoints === team2TotalPoints ? (
                            <span className="text-xs bg-gray-200 text-gray-700 px-2 py-1 rounded font-semibold">
                              {t('playerDashboard.tie')}
                            </span>
                          ) : (
                            <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded font-semibold">
                              {t('playerDashboard.lost')}
                            </span>
                          )}
                          <span className="text-purple-600 font-semibold hidden sm:inline flex items-center gap-1">{t('common.view')}<ForwardIcon size={14} /></span>
                        </div>
                      </div>

                      {/* Player Statistics (desktop) */}
                      <div className="hidden md:block">
                        <div className="flex items-center gap-1 mb-1.5">
                          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{t('playerDashboard.playerStatistics')}</span>
                          <div className="flex-1 h-px bg-gray-200" />
                        </div>
                        {wasAbsent ? (
                          <span className="bg-amber-100 text-amber-700 px-2 py-1 rounded font-medium text-xs">
                            {t('games.absent')}
                          </span>
                        ) : (
                          <div className="flex items-start gap-0 text-xs">
                            <div className="flex flex-col items-start">
                              <div className="flex gap-0.5 mb-1">
                                {matchPins.map((_, idx) => (
                                  <span key={idx} className="px-1.5 text-gray-400 font-medium w-10 text-center">M{idx + 1}</span>
                                ))}
                              </div>
                              <div className="flex gap-0.5">
                                {matchPins.map((pins, idx) => (
                                  <span
                                    key={idx}
                                    className={`px-1.5 py-0.5 rounded font-mono w-10 text-center ${
                                      pins === highestPin && matchPins.length > 1
                                        ? 'bg-purple-100 text-purple-700 font-bold'
                                        : pins >= 200
                                          ? 'bg-green-100 text-green-700 font-bold'
                                          : 'bg-gray-100 text-gray-600'
                                    }`}
                                  >
                                    {pins}
                                  </span>
                                ))}
                              </div>
                            </div>
                            <div className="self-stretch w-px bg-gray-200 mx-3" />
                            <div className="flex flex-col items-center min-w-[60px]">
                              <span className="text-gray-400 font-medium mb-1">{t('common.totalPins')}</span>
                              <span className="font-bold text-gray-700 text-sm">{playerTotalPins}</span>
                            </div>
                            <div className="self-stretch w-px bg-gray-200 mx-3" />
                            <div className="flex flex-col items-center min-w-[55px]">
                              <span className="text-gray-400 font-medium mb-1">{t('playerDashboard.gameAverage')}</span>
                              <span className="font-bold text-gray-700 text-sm">{gameAverage.toFixed(0)}</span>
                            </div>
                            <div className="self-stretch w-px bg-gray-200 mx-3" />
                            <div className="flex flex-col items-center min-w-[60px]">
                              <span className="text-gray-400 font-medium mb-1">{t('playerDashboard.oneVone')}</span>
                              <span className="font-bold text-blue-600 text-sm">+{playerMatchPoints}</span>
                              <span className="text-gray-500 mt-0.5">{matchWins}W · {matchLosses}L{matchDraws > 0 ? ` · ${matchDraws}D` : ''}</span>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Player Statistics (mobile) */}
                      <div className="md:hidden">
                        <div className="flex items-center gap-1 mb-1.5">
                          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{t('playerDashboard.playerStatistics')}</span>
                          <div className="flex-1 h-px bg-gray-200" />
                        </div>
                        {wasAbsent ? (
                          <span className="bg-amber-100 text-amber-700 px-2 py-1 rounded font-medium text-xs">
                            {t('games.absent')}
                          </span>
                        ) : (
                          <>
                            <div className="flex items-start gap-0 text-xs mb-1">
                              <div className="flex flex-col items-start">
                                <div className="flex gap-0.5 mb-1">
                                  {matchPins.map((_, idx) => (
                                    <span key={idx} className="px-1 text-gray-400 font-medium w-9 text-center">M{idx + 1}</span>
                                  ))}
                                </div>
                                <div className="flex gap-0.5">
                                  {matchPins.map((pins, idx) => (
                                    <span
                                      key={idx}
                                      className={`px-1 py-0.5 rounded font-mono w-9 text-center ${
                                        pins === highestPin && matchPins.length > 1
                                          ? 'bg-purple-100 text-purple-700 font-bold'
                                          : pins >= 200
                                            ? 'bg-green-100 text-green-700 font-bold'
                                            : 'bg-gray-100 text-gray-600'
                                      }`}
                                    >
                                      {pins}
                                    </span>
                                  ))}
                                </div>
                              </div>
                              <div className="self-stretch w-px bg-gray-200 mx-2" />
                              <div className="flex flex-col items-center min-w-[48px]">
                                <span className="text-gray-400 font-medium mb-1">{t('common.totalPins')}</span>
                                <span className="font-bold text-gray-700">{playerTotalPins}</span>
                              </div>
                              <div className="self-stretch w-px bg-gray-200 mx-2" />
                              <div className="flex flex-col items-center min-w-[40px]">
                                <span className="text-gray-400 font-medium mb-1">{t('playerDashboard.gameAverage')}</span>
                                <span className="font-bold text-gray-700">{gameAverage.toFixed(0)}</span>
                              </div>
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              <span className="font-semibold text-blue-600">+{playerMatchPoints}</span>
                              <span className="mx-1">·</span>
                              <span>{matchWins}W · {matchLosses}L{matchDraws > 0 ? ` · ${matchDraws}D` : ''}</span>
                            </div>
                          </>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* No Completed Games Message */}
          {recentCompletedGames.length === 0 && playerLeagues.length > 0 && (
            <EmptyState
              icon="🎳"
              title={t('playerDashboard.noGamesCompletedYet')}
              message={t('playerDashboard.noGamesCompletedDesc')}
              className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl shadow-lg p-8 text-center"
            />
          )}
        </>
      )}

      {/* Stats View */}
      {view === 'stats' && playerStats && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">{t('playerDashboard.overallStatistics')}</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">{t('common.gamesPlayed')}</p>
                <p className="text-3xl font-bold text-blue-600">{playerStats.gamesPlayed}</p>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">{t('common.average')}</p>
                <p className="text-3xl font-bold text-green-600">{playerStats.average.toFixed(1)}</p>
              </div>
              <div className="p-4 bg-purple-50 rounded-lg">
                <p className="text-sm text-gray-600 mb-1 text-center">{t('common.highGame')}</p>
                <p className="text-3xl font-bold text-purple-600 text-center">{playerStats.highGame}</p>
                {playerStats.highGameContext && (
                  <div className="mt-2 text-xs text-gray-500 space-y-0.5">
                    <p className="font-medium truncate">{playerStats.highGameContext.leagueName}</p>
                    <p className="truncate">{playerStats.highGameContext.seasonName}</p>
                    <p>{t('common.round')} {playerStats.highGameContext.round} · {t('common.matchDay')} {playerStats.highGameContext.matchDay}</p>
                    {playerStats.highGameContext.date && <p>{formatDate(playerStats.highGameContext.date)}</p>}
                  </div>
                )}
              </div>
            </div>

            {Object.keys(playerStats.highSeriesByCount ?? {}).length > 0 && (
              <div className="mt-6">
                <h3 className="text-lg font-semibold text-gray-700 mb-3">{t('playerDashboard.highSeriesRecords')}</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {Object.entries(playerStats.highSeriesByCount)
                    .sort(([a], [b]) => Number(a) - Number(b))
                    .map(([count, record]) => (
                      <div key={count} className="p-4 bg-orange-50 rounded-lg">
                        <p className="text-sm text-gray-600 mb-1 text-center">
                          {t('playerDashboard.highNGameSeries').replace('{{n}}', count)}
                        </p>
                        <p className="text-3xl font-bold text-orange-600 text-center">{record.pins}</p>
                        <div className="mt-2 text-xs text-gray-500 space-y-0.5">
                          <p className="font-medium truncate">{record.context.leagueName}</p>
                          <p className="truncate">{record.context.seasonName}</p>
                          <p>{t('common.round')} {record.context.round} · {t('common.matchDay')} {record.context.matchDay}</p>
                          {record.context.date && <p>{formatDate(record.context.date)}</p>}
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>

          {playerStats.gamesPlayed === 0 && (
            <div className="bg-white rounded-xl shadow-lg p-12 text-center">
              <span className="text-6xl mb-4 block">📊</span>
              <h3 className="text-xl font-bold text-gray-800 mb-2">{t('playerDashboard.noStatisticsYet')}</h3>
              <p className="text-gray-600">{t('playerDashboard.noStatisticsDesc')}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
