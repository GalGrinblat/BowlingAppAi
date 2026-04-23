import { ArrowLeft, CheckCircle } from '../Icons';
import { GameTeamStatsCard } from './GameTeamStatsCard';
import { GameScoreSheet } from './GameScoreSheet';
import { useTranslation } from '../../../contexts/LanguageContext';

import type { GameSummaryViewProps } from '../../../types/index';

export const GameSummaryView: React.FC<GameSummaryViewProps> = ({ game, totals, playerStats, onBack, onFinish }) => {
  const { t, direction, isRTL } = useTranslation();

  if (!game || !game.team1 || !game.team2) return null;

  // Calculate last match number for back button
  const lastMatchNumber = Array.isArray(game.matches) ? game.matches.length : 0;

  return (
    <div className="scorecard rounded-xl p-6 md:p-8 mb-8 animate-slide-in" dir={direction}>
      <div className={`flex items-center justify-between mb-6 ${isRTL ? 'flex-row-reverse' : ''}`}>
        <div className="bowling-title text-white text-3xl">{t('summary.gameSummary')}</div>
        <CheckCircle className="text-green-500" size={36} />
      </div>

      {/* Overall Winner */}
      <div className="bg-gradient-to-br from-yellow-400 to-orange-500 text-gray-900 p-6 rounded-lg mb-6 text-center">
        <div className="text-lg font-bold uppercase mb-2">{t('summary.gameWinner')}</div>
        {totals.team1Points > totals.team2Points ? (
          <div className="bowling-title text-5xl">{game.team1.name}</div>
        ) : totals.team2Points > totals.team1Points ? (
          <div className="bowling-title text-5xl">{game.team2.name}</div>
        ) : (
          <div className="bowling-title text-5xl">{t('summary.tieGame')}</div>
        )}
        <div className="text-3xl font-bold mt-2">
          {totals.team1Points} - {totals.team2Points}
        </div>
      </div>

      {/* Full Score Table */}
      <div className="bg-white rounded-lg mb-6 overflow-x-auto">
        <GameScoreSheet game={game} mode="readonly" />
      </div>

      {/* Game Statistics */}
      <div className={`bowling-title text-white text-2xl mb-4 ${isRTL ? 'text-right' : 'text-left'}`}>
        {t('summary.gameStatistics')}
      </div>

      {/* Player Statistics */}
      <div className="grid md:grid-cols-2 gap-6 mb-6">
        <GameTeamStatsCard
          teamName={game.team1.name}
          teamColor="orange"
          playerStats={playerStats.team1Stats}
          teamAverage={playerStats.team1Average}
          matchCount={lastMatchNumber}
        />

        <GameTeamStatsCard
          teamName={game.team2.name}
          teamColor="blue"
          playerStats={playerStats.team2Stats}
          teamAverage={playerStats.team2Average}
          matchCount={lastMatchNumber}
        />
      </div>

      {/* Navigation */}
      <div className={`grid grid-cols-2 gap-4 ${isRTL ? 'grid-flow-col-dense' : ''}`}>
        <button
          onClick={onBack}
          className={`flex items-center justify-center gap-2 bg-gray-700 text-white py-3 rounded-lg font-bold uppercase text-sm hover:bg-gray-600 transition-colors ${isRTL ? 'flex-row-reverse col-start-2' : ''}`}
        >
          <ArrowLeft size={18} />
          {t('summary.backToMatch').replace('{{matchNumber}}', String(lastMatchNumber))}
        </button>

        <button
          onClick={onFinish}
          className={`bg-gradient-to-r from-green-600 to-emerald-600 text-white py-3 rounded-lg font-bold uppercase text-sm hover:from-green-700 hover:to-emerald-700 transition-colors shadow-lg ${isRTL ? 'col-start-1' : ''}`}
        >
          {t('summary.saveGame')}
        </button>
      </div>
    </div>
  );
}
