import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { useTranslation } from '../../../contexts/LanguageContext';
import { useDateFormat } from '../../../hooks/useDateFormat';
import { calculateHeadToHead } from '../../../utils/headToHeadUtils';
import { PlayerRosterTable } from './PlayerRosterTable';
import { GameScoreSheet } from '../../common/game/GameScoreSheet';
import { SignatureBlock } from './SignatureBlock';
import type { Game, Season, League, Team, TeamStanding, ScheduleMatchDay } from '../../../types/index';

export interface TeamPlayerInfo {
  id: string;
  name: string;
  average: number;
  gamesPlayed: number;
  handicap: number;
}

interface MatchDayReportProps {
  season: Season;
  league: League;
  teams: Team[];
  games: Game[];
  matchDayGames: Game[];
  matchDay: number;
  teamStandings: TeamStanding[];
  teamPlayersMap: Record<string, TeamPlayerInfo[]>;
}

export const MatchDayReport: React.FC<MatchDayReportProps> = ({
  season, league, teams, games, matchDayGames, matchDay,
  teamStandings, teamPlayersMap
}) => {
  const { t } = useTranslation();
  const { formatMatchDate } = useDateFormat();

  const scheduleInfo = season.schedule?.find((s: ScheduleMatchDay) => s.matchDay === matchDay);
  const firstGame = matchDayGames[0];
  const round = firstGame?.round || 1;

  const getTeamStanding = (teamId: string) => teamStandings.find(s => s.teamId === teamId);

  if (matchDayGames.length === 0) {
    return (
      <div className="text-center text-gray-500 py-8">
        {t('seasons.noGamesInMatchDay')}
      </div>
    );
  }

  return (
    <div className="space-y-12">
      {matchDayGames.map((game, index) => {
        const team1 = teams.find(t => t.id === game.team1Id);
        const team2 = teams.find(t => t.id === game.team2Id);
        if (!team1 || !team2) return null;

        const team1Players = teamPlayersMap[team1.id] || [];
        const team2Players = teamPlayersMap[team2.id] || [];
        const team1Standing = getTeamStanding(team1.id);
        const team2Standing = getTeamStanding(team2.id);
        const h2h = calculateHeadToHead(team1.id, team2.id, games);

        return (
          <div key={game.id} className="match-section break-inside-avoid">
            {/* Page Header */}
            <div className="text-center mb-6 pb-4 border-b-2 border-gray-300">
              <h1 className="text-3xl font-bold text-gray-900 mb-1">{league.name}</h1>
              <h2 className="text-xl font-semibold text-gray-700 mb-2">{season.name}</h2>
              <div className="flex justify-center gap-6 text-base text-gray-600">
                <span>📅 {t('common.round')} {round}</span>
                <span>🎳 {t('common.matchDay')} {matchDay}</span>
                {scheduleInfo?.date && <span>📆 {formatMatchDate(scheduleInfo.date)}</span>}
              </div>
              {season.seasonConfigurations.useHandicap && (
                <div className="mt-2 text-sm text-gray-600">
                  ⚖️ {t('leagues.handicapDisplay')
                    .replace('{{percentage}}', String(season.seasonConfigurations.handicapPercentage || 100))
                    .replace('{{basis}}', String(season.seasonConfigurations.handicapBasis))}
                </div>
              )}
            </div>

            {/* Match Header */}
            <div className="bg-gray-800 text-white p-4 rounded-t-lg">
              <div className="flex justify-between items-center">
                <h3 className="text-2xl font-bold">{t('common.match')} {index + 1}</h3>
                {game.status === 'completed' && (
                  <span className="px-3 py-1 bg-green-500 rounded text-sm font-semibold">{t('common.completed')}</span>
                )}
              </div>
            </div>

            {/* Teams Face-off */}
            <div className="border-x-2 border-b-2 border-gray-800 p-6">
              <div className="grid grid-cols-5 gap-6 items-center mb-6">
                <div className="col-span-2 text-right">
                  <h4 className="text-3xl font-bold text-gray-900 mb-2">{team1.name}</h4>
                  {team1Standing && (
                    <div className="text-sm text-gray-600">
                      <div>{team1Standing.wins}-{team1Standing.losses}-{team1Standing.draws} ({team1Standing.points} {t('common.pts')})</div>
                    </div>
                  )}
                </div>
                <div className="col-span-1 text-center">
                  <div className="text-5xl font-bold text-gray-400">{t('print.vs')}</div>
                  {h2h.gamesPlayed > 0 && (
                    <div className="mt-2 text-xs text-gray-600">
                      {t('seasons.headToHead')}: {h2h.team1Wins}-{h2h.team2Wins}
                    </div>
                  )}
                </div>
                <div className="col-span-2">
                  <h4 className="text-3xl font-bold text-gray-900 mb-2">{team2.name}</h4>
                  {team2Standing && (
                    <div className="text-sm text-gray-600">
                      <div>{team2Standing.wins}-{team2Standing.losses}-{team2Standing.draws} ({team2Standing.points} {t('common.pts')})</div>
                    </div>
                  )}
                </div>
              </div>

              {/* Player Rosters */}
              <div className="grid grid-cols-2 gap-8">
                <PlayerRosterTable teamName={team1.name} players={team1Players} accentColor="blue" />
                <PlayerRosterTable teamName={team2.name} players={team2Players} accentColor="purple" />
              </div>

              {/* Score Sheet Section */}
              <div className="mt-8 border-t-2 border-gray-300 pt-6">
                <h5 className="text-xl font-bold text-gray-800 mb-4 text-center">{t('print.scoreSheet')}</h5>
                <GameScoreSheet
                  game={game}
                  mode="print"
                  printPlayers={{ team1: team1Players, team2: team2Players }}
                />
              </div>

              {/* Signature + QR Section */}
              <div className="mt-8 border-t-2 border-gray-300 pt-6">
                <div className="grid grid-cols-3 gap-8 items-start">
                  <SignatureBlock teamName={team1.name} />
                  <div className="flex flex-col items-center justify-center gap-2 pt-2">
                    <QRCodeSVG
                      value={`${window.location.origin}/score/${game.id}`}
                      size={96}
                      bgColor="transparent"
                      fgColor="#1f2937"
                    />
                    <span className="text-xs text-gray-500 text-center">{t('score.scanToEnter')}</span>
                  </div>
                  <SignatureBlock teamName={team2.name} />
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
