import React, { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { boardApi } from '../../../services/api/boardApi';
import { LoadingSpinner } from '../../common/LoadingSpinner';
import { EmptyState } from '../../common/EmptyState';
import { useTranslation } from '../../../contexts/LanguageContext';
import { useDateFormat } from '../../../hooks/useDateFormat';
import { useNavLabel } from '../../../hooks/useNavLabel';
import type { League, Season, Game } from '../../../types/index';

export const BoardHome: React.FC = () => {
  const { t } = useTranslation();
  const { formatDate } = useDateFormat();
  const { forward } = useNavLabel();
  const [leagues, setLeagues] = useState<League[]>([]);
  const [seasonsByLeague, setSeasonsByLeague] = useState<Record<string, Season[]>>({});
  const [recentGames, setRecentGames] = useState<Game[]>([]);
  const [orgName, setOrgName] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      const [org, leagueList] = await Promise.all([
        boardApi.getOrgName(),
        boardApi.getActiveLeagues(),
      ]);

      if (cancelled) return;
      if (org) setOrgName(org.name);
      setLeagues(leagueList);

      // Load seasons for each league in parallel
      const seasonResults = await Promise.all(
        leagueList.map(l => boardApi.getSeasonsByLeague(l.id))
      );
      if (cancelled) return;

      const map: Record<string, Season[]> = {};
      leagueList.forEach((l, i) => { map[l.id] = seasonResults[i] ?? []; });
      setSeasonsByLeague(map);

      // Load recent completed games across all active seasons
      const activeSeassonIds = leagueList.flatMap(l =>
        (seasonResults[leagueList.indexOf(l)] || [])
          .filter(s => s.status === 'active')
          .map(s => s.id)
      );
      if (activeSeassonIds.length > 0) {
        const recent = await boardApi.getRecentCompletedGames(activeSeassonIds, 5);
        if (!cancelled) setRecentGames(recent);
      }

      if (!cancelled) setIsLoading(false);
    };

    load();
    return () => { cancelled = true; };
  }, []);

  const hasActiveSeason = (leagueId: string) =>
    (seasonsByLeague[leagueId] || []).some(s => s.status === 'active');

  const activeSeason = (leagueId: string) =>
    (seasonsByLeague[leagueId] || []).find(s => s.status === 'active');

  const dayLabel = useMemo(() => {
    const dayMap: Record<string, string> = {
      sunday: 'days.sunday', monday: 'days.monday', tuesday: 'days.tuesday',
      wednesday: 'days.wednesday', thursday: 'days.thursday', friday: 'days.friday',
      saturday: 'days.saturday',
    };
    return (day: string) => {
      const key = dayMap[day.toLowerCase()];
      return key ? t(key) : day;
    };
  }, [t]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Heading */}
      <div className="text-center">
        <h2 className="text-3xl font-bold text-gray-800">{orgName || t('board.allLeagues')}</h2>
        <p className="text-gray-500 mt-1">{t('board.subtitle')}</p>
      </div>

      {/* League Cards */}
      {leagues.length === 0 ? (
        <EmptyState message={t('board.noActiveLeagues')} className="bg-white rounded-xl shadow-lg p-8 text-center text-gray-500" />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {leagues.map(league => {
            const active = hasActiveSeason(league.id);
            const season = activeSeason(league.id);
            return (
              <Link
                key={league.id}
                to={`/board/leagues/${league.id}`}
                className="bg-white rounded-xl shadow-lg p-5 hover:shadow-xl transition-shadow group block"
              >
                <div className="flex items-start justify-between mb-2">
                  <h3 className="text-lg font-bold text-gray-800 group-hover:text-blue-600 transition-colors">
                    {league.name}
                  </h3>
                  {active && (
                    <span className="shrink-0 ml-2 px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs font-semibold">
                      {t('board.activeSeason')}
                    </span>
                  )}
                </div>
                {league.description && (
                  <p className="text-sm text-gray-500 mb-3 line-clamp-2">{league.description}</p>
                )}
                <div className="text-xs text-gray-400 flex flex-wrap gap-2">
                  {league.dayOfWeek && (
                    <span>📅 {dayLabel(league.dayOfWeek)}</span>
                  )}
                  {season && (
                    <span>🏆 {season.name}</span>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {/* Recent Results */}
      {recentGames.length > 0 && (
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-xl font-bold text-gray-800 mb-4">🎳 {t('board.recentResults')}</h3>
          <div className="space-y-3">
            {recentGames.map(game => {
              const t1Points = (game.matches?.reduce((s, m) => s + (m.team1?.points || 0), 0) || 0) + (game.grandTotalPoints?.team1 || 0);
              const t2Points = (game.matches?.reduce((s, m) => s + (m.team2?.points || 0), 0) || 0) + (game.grandTotalPoints?.team2 || 0);
              return (
                <Link
                  key={game.id}
                  to={`/board/games/${game.id}`}
                  className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-sm font-bold text-gray-800 truncate">{game.team1?.name}</span>
                    <span className="text-blue-600 font-bold shrink-0">{t1Points} : {t2Points}</span>
                    <span className="text-sm font-bold text-gray-800 truncate">{game.team2?.name}</span>
                  </div>
                  <div className="shrink-0 flex items-center gap-2 text-xs text-gray-400 ml-2">
                    {game.completedAt && <span>{formatDate(game.completedAt)}</span>}
                    <span className="text-blue-600 font-semibold">{forward(t('board.viewFullGame'))}</span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
