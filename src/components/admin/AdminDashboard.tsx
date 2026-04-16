import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from '../../contexts/LanguageContext';
import { useDateFormat } from '../../hooks/useDateFormat';
import { useAdminData } from '../../contexts/AdminDataContext';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { EmptyState } from '../common/EmptyState';
import { PageHeader } from '../common/PageHeader';

import type { ScheduleMatchDay } from '../../types/index';

export const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { formatMatchDate } = useDateFormat();
  const { org, leagues, seasonsMap, gamesMap, isLoadingData, users, isLoadingUsers } = useAdminData();
  const activeLeagues = leagues.filter(l => l.active);
  const pendingUsers = users.filter(u => u.role === 'player' && u.playerId === null);

  type PendingSeasonEntry = { seasonId: string; leagueName: string; seasonName: string; count: number };
  const seasonsWithPendingGames: PendingSeasonEntry[] = [];
  for (const [leagueId, seasons] of Object.entries(seasonsMap)) {
    for (const season of seasons) {
      const games = gamesMap[season.id] ?? [];
      const pendingCount = games.filter(g => g.pendingSubmission != null).length;
      if (pendingCount > 0) {
        const league = leagues.find(l => l.id === leagueId);
        seasonsWithPendingGames.push({
          seasonId: season.id,
          leagueName: league?.name ?? '',
          seasonName: season.name,
          count: pendingCount,
        });
      }
    }
  }

  if (isLoadingData) {
    return (
      <div className="space-y-6">
        <PageHeader title={t('dashboard.adminTitle')} subtitle={org?.name || t('dashboard.defaultOrgName')} />
        <div className="bg-white rounded-xl shadow-lg p-12 text-center">
          <LoadingSpinner size="lg" className="mx-auto mb-4" />
          <p className="text-gray-600 text-lg">{t('dashboard.loadingDashboard')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader title={t('dashboard.adminTitle')} subtitle={org?.name || t('dashboard.defaultOrgName')} />

      {/* Pending Users Alert */}
      {!isLoadingUsers && pendingUsers.length > 0 && (
        <div className="bg-gradient-to-r from-amber-400 to-orange-500 rounded-xl shadow-lg p-5 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4 text-white min-w-0">
            <span className="text-3xl shrink-0">⚠️</span>
            <div className="min-w-0">
              <p className="font-bold text-lg">{t('dashboard.pendingUsersTitle')}</p>
              <p className="text-amber-100 text-sm">
                {pendingUsers.length} {t('dashboard.pendingUsersDesc')}
              </p>
              <p className="text-amber-200 text-xs mt-1 truncate">
                {pendingUsers.slice(0, 3).map(u => u.email).join(', ')}
                {pendingUsers.length > 3 && ` +${pendingUsers.length - 3} ${t('dashboard.pendingUsersMore')}`}
              </p>
            </div>
          </div>
          <button
            onClick={() => navigate('/admin/users')}
            className="shrink-0 bg-white text-orange-600 font-bold px-4 py-2 rounded-lg hover:bg-orange-50 transition-colors"
          >
            {t('dashboard.pendingUsersAction')}
          </button>
        </div>
      )}

      {/* Pending Score Submissions Alert */}
      {seasonsWithPendingGames.length > 0 && (
        <div className="bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl shadow-lg p-5 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4 text-white min-w-0">
            <span className="text-3xl shrink-0">📋</span>
            <div className="min-w-0">
              <p className="font-bold text-lg">{t('dashboard.pendingSubmissionsTitle')}</p>
              {seasonsWithPendingGames.map(({ seasonId, leagueName, seasonName, count }) => (
                <p key={seasonId} className="text-blue-100 text-sm">
                  {leagueName} — {seasonName}: {count} {t('dashboard.pendingSubmissionsDesc')}
                </p>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-2 shrink-0">
            {seasonsWithPendingGames.map(({ seasonId, seasonName }) => (
              <button
                key={seasonId}
                onClick={() => navigate(`/admin/seasons/${seasonId}`)}
                className="bg-white text-indigo-600 font-bold px-4 py-2 rounded-lg hover:bg-indigo-50 transition-colors text-sm"
              >
                {t('dashboard.pendingSubmissionsAction')}: {seasonName}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <button
          onClick={() => navigate('/admin/players')}
          className="bg-gradient-to-br from-blue-500 to-blue-600 text-white p-6 rounded-xl shadow-lg hover:shadow-xl transition-shadow touch-manipulation"
        >
          <div className="text-4xl mb-2">👥</div>
          <h3 className="text-xl font-bold mb-1">{t('dashboard.managePlayers')}</h3>
          <p className="text-sm text-blue-100">{t('dashboard.managePlayersDesc')}</p>
        </button>

        <button
          onClick={() => navigate('/admin/leagues')}
          className="bg-gradient-to-br from-purple-500 to-purple-600 text-white p-6 rounded-xl shadow-lg hover:shadow-xl transition-shadow touch-manipulation"
        >
          <div className="text-4xl mb-2">🏆</div>
          <h3 className="text-xl font-bold mb-1">{t('dashboard.manageLeagues')}</h3>
          <p className="text-sm text-purple-100">{t('dashboard.manageLeaguesDesc')}</p>
        </button>

        <button
          onClick={() => navigate('/admin/users')}
          className="bg-gradient-to-br from-orange-500 to-orange-600 text-white p-6 rounded-xl shadow-lg hover:shadow-xl transition-shadow touch-manipulation"
        >
          <div className="text-4xl mb-2">🔐</div>
          <h3 className="text-xl font-bold mb-1">{t('dashboard.manageUsers')}</h3>
          <p className="text-sm text-orange-100">{t('dashboard.manageUsersDesc')}</p>
        </button>

        <button
          onClick={() => navigate('/admin/settings')}
          className="bg-gradient-to-br from-green-500 to-green-600 text-white p-6 rounded-xl shadow-lg hover:shadow-xl transition-shadow touch-manipulation"
        >
          <div className="text-4xl mb-2">⚙️</div>
          <h3 className="text-xl font-bold mb-1">{t('settings.title')}</h3>
          <p className="text-sm text-green-100">{t('dashboard.organizationSettings')}</p>
        </button>
      </div>

      {/* Active Leagues */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">{t('common.activeLeagues')}</h2>
        {activeLeagues.length === 0 ? (
          <EmptyState
            message={t('dashboard.noActiveLeagues')}
            action={{ label: t('dashboard.createFirstLeague'), onClick: () => navigate('/admin/leagues') }}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activeLeagues.map(league => {
              const seasons = seasonsMap[league.id] || [];
              const activeSeason = seasons.find(s => s.status === 'active');

              let nextMatchDay = null;
              if (activeSeason && activeSeason.schedule) {
                const games = gamesMap[activeSeason.id] || [];
                const incompleteMatchDays = activeSeason.schedule.filter((day: ScheduleMatchDay) => {
                  const dayGames = games.filter(g => g.matchDay === day.matchDay);
                  const hasIncomplete = dayGames.some(g => g.status !== 'completed');
                  const dayDate = day.date ? new Date(day.date) : null;
                  return hasIncomplete && dayDate;
                });
                if (incompleteMatchDays.length > 0) {
                  incompleteMatchDays.sort((a: ScheduleMatchDay, b: ScheduleMatchDay) => new Date(a.date || '').getTime() - new Date(b.date || '').getTime());
                  nextMatchDay = incompleteMatchDays[0];
                }
              }

              return (
                <button
                  key={league.id}
                  type="button"
                  className="w-full text-left border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors"
                  onClick={() => navigate(`/admin/leagues/${league.id}`)}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-800">{league.name}</h3>
                      {league.description && (
                        <p className="text-sm text-gray-600 mt-1">{league.description}</p>
                      )}
                      {activeSeason && (
                        <div className="mt-2 space-y-1">
                          <p className="text-sm text-green-600">
                            {t('dashboard.activeSeason')}: {activeSeason.name}
                          </p>
                          {nextMatchDay && (
                            <p className="text-sm text-blue-600 font-medium">
                              📅 {t('common.next')}: {formatMatchDate(nextMatchDay.date || null)}
                              {nextMatchDay.postponed && <span className="text-orange-600 ml-1">({t('dashboard.postponed')})</span>}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="text-right text-sm text-gray-500">
                      <div className="ltr-content">{seasons.length} {seasons.length !== 1 ? t('common.seasons') : t('common.season')}</div>
                      <div className="text-xs mt-1">
                        {league.dayOfWeek && <div>{t(`days.${league.dayOfWeek.toLowerCase()}Plural`)}</div>}
                        <span className="ltr-content">{league.defaultSeasonConfigurations.playersPerTeam} {t('common.playersPerTeam')}</span>
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
