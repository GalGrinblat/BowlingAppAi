import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { boardApi } from '../../../services/api/boardApi';
import { useTranslation } from '../../../contexts/LanguageContext';
import { useDateFormat } from '../../../hooks/useDateFormat';
import { BackButton } from '../../common/BackButton';
import type { League, Season } from '../../../types/index';

export const BoardLeague: React.FC = () => {
  const { leagueId } = useParams<{ leagueId: string }>();
  const { t } = useTranslation();
  const { formatDate } = useDateFormat();
  const [league, setLeague] = useState<League | null>(null);
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!leagueId) return;
    let cancelled = false;
    const load = async () => {
      const [leagueData, seasonList] = await Promise.all([
        boardApi.getLeagueById(leagueId),
        boardApi.getSeasonsByLeague(leagueId),
      ]);
      if (cancelled) return;
      setLeague(leagueData);
      setSeasons(seasonList);
      setIsLoading(false);
    };
    load();
    return () => { cancelled = true; };
  }, [leagueId]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <LoadingSpinner />
      </div>
    );
  }

  if (!league) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-8 text-center text-gray-500">
        {t('common.loading')}
      </div>
    );
  }

  const activeSeasons = seasons.filter(s => s.status === 'active');
  const completedSeasons = seasons.filter(s => s.status === 'completed');
  const setupSeasons = seasons.filter(s => s.status === 'setup');

  const SeasonCard: React.FC<{ season: Season }> = ({ season }) => (
    <Link
      to={`/board/seasons/${season.id}`}
      className="block border border-gray-200 rounded-lg p-4 hover:border-blue-300 hover:bg-blue-50 transition-colors"
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="font-semibold text-gray-800">{season.name}</p>
          <p className="text-xs text-gray-400 mt-0.5">
            {formatDate(season.startDate)} – {formatDate(season.endDate)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {season.status === 'active' && (
            <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs font-semibold">
              {t('board.activeSeason')}
            </span>
          )}
          {season.status === 'completed' && (
            <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full text-xs font-semibold">
              {t('board.completedSeason')}
            </span>
          )}
          {season.status === 'setup' && (
            <span className="px-2 py-0.5 bg-blue-100 text-blue-600 rounded-full text-xs font-semibold">
              {t('board.setupSeason')}
            </span>
          )}
          <span className="text-blue-600 text-sm">{t('common.rightArrow')}</span>
        </div>
      </div>
    </Link>
  );

  return (
    <div className="space-y-6">
      {/* Back link */}
      <BackButton to="/board" label={t('board.allLeagues')} className="text-blue-600 hover:text-blue-700 text-sm font-semibold" />

      {/* League header */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-1">{league.name}</h2>
        {league.description && (
          <p className="text-gray-500 mb-3">{league.description}</p>
        )}
        {league.dayOfWeek && (
          <p className="text-sm text-gray-400">📅 {league.dayOfWeek}</p>
        )}
      </div>

      {/* Active seasons */}
      {activeSeasons.length > 0 && (
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-lg font-bold text-gray-700 mb-3 flex items-center gap-2">
            <span className="w-2 h-2 bg-green-500 rounded-full inline-block"></span>
            {t('board.activeSeason')}
          </h3>
          <div className="space-y-2">
            {activeSeasons.map(s => <SeasonCard key={s.id} season={s} />)}
          </div>
        </div>
      )}

      {/* Completed seasons */}
      {completedSeasons.length > 0 && (
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-lg font-bold text-gray-700 mb-3">{t('board.completedSeason')}</h3>
          <div className="space-y-2">
            {completedSeasons.map(s => <SeasonCard key={s.id} season={s} />)}
          </div>
        </div>
      )}

      {/* Upcoming seasons */}
      {setupSeasons.length > 0 && (
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-lg font-bold text-gray-700 mb-3">{t('board.setupSeason')}</h3>
          <div className="space-y-2">
            {setupSeasons.map(s => <SeasonCard key={s.id} season={s} />)}
          </div>
        </div>
      )}

      {seasons.length === 0 && (
        <div className="bg-white rounded-xl shadow-lg p-8 text-center text-gray-500">
          {t('seasons.noSeasonsYet')}
        </div>
      )}
    </div>
  );
};
