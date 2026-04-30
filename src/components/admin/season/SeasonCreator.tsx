import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { playersApi, leaguesApi } from '../../../services/api';
import { useTranslation } from '../../../contexts/LanguageContext';
import { useAdminData } from '../../../contexts/AdminDataContext';
import type { LineupStrategy, LineupRule, League, CurrentPlayerAverages, Player } from '../../../types/index';
import {
  DEFAULT_HANDICAP_BASIS, DEFAULT_HANDICAP_PERCENTAGE, DEFAULT_NUMBER_OF_TEAMS,
  DEFAULT_NUMBER_OF_ROUNDS, DEFAULT_PLAYERS_PER_TEAM, DEFAULT_MATCHES_PER_GAME,
  DEFAULT_PLAYER_MATCH_POINTS, DEFAULT_TEAM_MATCH_POINTS, DEFAULT_TEAM_GAME_POINTS,
  DEFAULT_USE_HANDICAP, DEFAULT_LINEUP_STRATEGY, DEFAULT_LINEUP_RULE,
  DEFAULT_TEAM_ALL_PRESENT_BONUS_ENABLED, DEFAULT_TEAM_ALL_PRESENT_BONUS_POINTS
} from '../../../constants/bowling';
import { SeasonConfigStep, SeasonFormData } from './SeasonConfigStep';
import { TeamAssignmentStep } from './TeamAssignmentStep';
import { PlayerAveragesStep } from './PlayerAveragesStep';
import { useToast } from '../../../contexts/ToastContext';

type SimpleTeam = {
  name: string;
  playerIds: string[];
};

type SimplePlayer = Pick<Player, 'id' | 'firstName' | 'middleName' | 'lastName'>;

export const SeasonCreator: React.FC = () => {
  const navigate = useNavigate();
  const { leagueId } = useParams<{ leagueId: string }>();
  const { loadDashboardData } = useAdminData();
  const { t } = useTranslation();
  const { showToast } = useToast();
  const [step, setStep] = useState(1);
  const [league, setLeague] = useState<League | null>(null);
  const [formData, setFormData] = useState<SeasonFormData>({
    name: '',
    description: '',
    numberOfTeams: DEFAULT_NUMBER_OF_TEAMS,
    playersPerTeam: DEFAULT_PLAYERS_PER_TEAM,
    numberOfRounds: DEFAULT_NUMBER_OF_ROUNDS,
    matchesPerGame: DEFAULT_MATCHES_PER_GAME,
    lineupStrategy: DEFAULT_LINEUP_STRATEGY,
    lineupRule: DEFAULT_LINEUP_RULE,
    playerMatchPointsPerWin: DEFAULT_PLAYER_MATCH_POINTS,
    teamMatchPointsPerWin: DEFAULT_TEAM_MATCH_POINTS,
    teamGamePointsPerWin: DEFAULT_TEAM_GAME_POINTS,
    useHandicap: DEFAULT_USE_HANDICAP,
    handicapBasis: DEFAULT_HANDICAP_BASIS,
    handicapPercentage: DEFAULT_HANDICAP_PERCENTAGE,
    teamAllPresentBonusEnabled: DEFAULT_TEAM_ALL_PRESENT_BONUS_ENABLED,
    teamAllPresentBonusPoints: DEFAULT_TEAM_ALL_PRESENT_BONUS_POINTS,
    bonusRules: [],
    dayOfWeek: '',
  });
  const [teams, setTeams] = useState<SimpleTeam[]>([]);
  const [inheritLeagueConfig, setInheritLeagueConfig] = useState(true);
  const [availablePlayers, setAvailablePlayers] = useState<SimplePlayer[]>([]);
  const [playerAverages, setPlayerAverages] = useState<CurrentPlayerAverages>({});

  useEffect(() => {
    const fetchData = async () => {
      const leagueData = await leaguesApi.getById(leagueId!);
      setLeague(leagueData ?? null);
      const cfg = leagueData?.defaultSeasonConfigurations;
      setFormData(prev => ({
        ...prev,
        numberOfTeams: cfg?.numberOfTeams || DEFAULT_NUMBER_OF_TEAMS,
        playersPerTeam: cfg?.playersPerTeam || DEFAULT_PLAYERS_PER_TEAM,
        numberOfRounds: cfg?.numberOfRounds || DEFAULT_NUMBER_OF_ROUNDS,
        matchesPerGame: cfg?.matchesPerGame || DEFAULT_MATCHES_PER_GAME,
        lineupStrategy: cfg?.lineupStrategy || DEFAULT_LINEUP_STRATEGY,
        lineupRule: cfg?.lineupRule || DEFAULT_LINEUP_RULE,
        playerMatchPointsPerWin: cfg?.playerMatchPointsPerWin || DEFAULT_PLAYER_MATCH_POINTS,
        teamMatchPointsPerWin: cfg?.teamMatchPointsPerWin || DEFAULT_TEAM_MATCH_POINTS,
        teamGamePointsPerWin: cfg?.teamGamePointsPerWin || DEFAULT_TEAM_GAME_POINTS,
        useHandicap: cfg?.useHandicap ?? DEFAULT_USE_HANDICAP,
        handicapBasis: cfg?.handicapBasis ?? DEFAULT_HANDICAP_BASIS,
        handicapPercentage: cfg?.handicapPercentage ?? DEFAULT_HANDICAP_PERCENTAGE,
        teamAllPresentBonusEnabled: cfg?.teamAllPresentBonusEnabled ?? DEFAULT_TEAM_ALL_PRESENT_BONUS_ENABLED,
        teamAllPresentBonusPoints: cfg?.teamAllPresentBonusPoints ?? DEFAULT_TEAM_ALL_PRESENT_BONUS_POINTS,
        bonusRules: cfg?.bonusRules ? JSON.parse(JSON.stringify(cfg.bonusRules)) : [],
      }));
      const players = await playersApi.getAll();
      setAvailablePlayers(players);
    };
    fetchData();
  }, [leagueId]);

  // Team assignment handlers
  const handleTeamNameChange = (teamIndex: number, name: string) => {
    const newTeams = [...teams];
    if (newTeams[teamIndex]) {
      newTeams[teamIndex].name = name;
      setTeams(newTeams);
    }
  };

  const handleAssignPlayer = (teamIndex: number, playerId: string) => {
    const newTeams = [...teams];
    if (newTeams[teamIndex] && !newTeams[teamIndex].playerIds.includes(playerId)) {
      if (newTeams[teamIndex].playerIds.length >= formData.playersPerTeam) {
        showToast(t('validation.teamFull').replace('{{count}}', String(formData.playersPerTeam)), 'error');
        return;
      }
      newTeams[teamIndex].playerIds.push(playerId);
      setTeams(newTeams);
    }
  };

  const handleRemovePlayer = (teamIndex: number, playerId: string) => {
    const newTeams = [...teams];
    if (newTeams[teamIndex]) {
      newTeams[teamIndex].playerIds = newTeams[teamIndex].playerIds.filter((id: string) => id !== playerId);
      setTeams(newTeams);
    }
  };

  // Final submit
  const handleFinalSubmit = async () => {
    if (!formData.name || teams.length < 2 || teams.some(t => t.playerIds.length !== formData.playersPerTeam)) {
      showToast(t('validation.incompleteTeams'), 'error');
      return;
    }

    const today = new Date().toISOString();
    const leagueCfg = league?.defaultSeasonConfigurations;
    const seasonData = {
      leagueId: leagueId!,
      name: formData.name,
      startDate: today,
      endDate: today,
      seasonConfigurations: {
        numberOfTeams: teams.length,
        playersPerTeam: formData.playersPerTeam,
        numberOfRounds: formData.numberOfRounds,
        matchesPerGame: formData.matchesPerGame,
        lineupStrategy: leagueCfg?.lineupStrategy || 'flexible' as LineupStrategy,
        lineupRule: leagueCfg?.lineupRule || 'standard' as LineupRule,
        playerMatchPointsPerWin: leagueCfg?.playerMatchPointsPerWin || 1,
        teamMatchPointsPerWin: leagueCfg?.teamMatchPointsPerWin || 1,
        teamGamePointsPerWin: leagueCfg?.teamGamePointsPerWin || 2,
        useHandicap: formData.useHandicap,
        handicapBasis: formData.handicapBasis,
        handicapPercentage: formData.handicapPercentage,
        teamAllPresentBonusEnabled: formData.teamAllPresentBonusEnabled,
        teamAllPresentBonusPoints: formData.teamAllPresentBonusPoints,
        bonusRules: leagueCfg?.bonusRules || [],
      },
      status: "active" as const,
      teams: teams.map(team => ({ name: team.name, playerIds: team.playerIds })),
      initialPlayerAverages: playerAverages,
    };

    try {
      const { seasonsApi, gamesApi, teamsApi } = await import('../../../services/api');
      const { generateRoundRobinSchedule } = await import('../../../utils/scheduleUtils');

      const created = await seasonsApi.create(seasonData);

      const createdTeams: { id: string; name: string }[] = [];
      for (const team of teams) {
        const newTeam = await teamsApi.create({
          name: team.name,
          seasonId: created.id,
          playerIds: team.playerIds,
          rosterChanges: [],
        });
        createdTeams.push({ id: newTeam.id, name: newTeam.name });
      }

      const teamIds = createdTeams.map(team => team.id);
      const createdCfg = created.seasonConfigurations;
      const schedule = generateRoundRobinSchedule(
        teamIds, createdCfg.numberOfRounds, created.startDate, league?.dayOfWeek || null
      );

      for (const day of schedule) {
        for (const match of day.matches) {
          await gamesApi.create({
            seasonId: created.id,
            round: day.round,
            matchDay: day.matchDay,
            team1Id: match.team1Id,
            team2Id: match.team2Id,
            matchesPerGame: createdCfg.matchesPerGame,
            useHandicap: createdCfg.useHandicap,
            playerMatchPointsPerWin: createdCfg.playerMatchPointsPerWin,
            teamMatchPointsPerWin: createdCfg.teamMatchPointsPerWin,
            teamGamePointsPerWin: createdCfg.teamGamePointsPerWin,
            scheduledDate: day.date || undefined,
            postponed: false,
            lineupStrategy: createdCfg.lineupStrategy,
            lineupRule: createdCfg.lineupRule,
            bonusRules: createdCfg.bonusRules,
            teamAllPresentBonusEnabled: createdCfg.teamAllPresentBonusEnabled,
            teamAllPresentBonusPoints: createdCfg.teamAllPresentBonusPoints,
          });
        }
      }

      await seasonsApi.update(created.id, { schedule });
      await loadDashboardData();
      navigate(`/admin/seasons/${created.id}`);
    } catch {
      showToast(t('validation.saveError'), 'error');
    }
  };

  if (!league) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-6">
        <p className="text-gray-600">Loading league data...</p>
      </div>
    );
  }

  if (step === 1) {
    return (
      <SeasonConfigStep
        league={league}
        formData={formData}
        inheritLeagueConfig={inheritLeagueConfig}
        onFormDataChange={setFormData}
        onInheritChange={setInheritLeagueConfig}
        onNext={(numberOfTeams) => {
          const newTeams = Array.from({ length: numberOfTeams }, (_, i) => ({ name: `Team ${i + 1}`, playerIds: [] as string[] }));
          setTeams(newTeams);
          setStep(2);
        }}
        onBack={() => navigate(`/admin/leagues/${leagueId}`)}
      />
    );
  }

  if (step === 2) {
    return (
      <TeamAssignmentStep
        teams={teams}
        playersPerTeam={formData.playersPerTeam}
        availablePlayers={availablePlayers}
        onTeamNameChange={handleTeamNameChange}
        onAssignPlayer={handleAssignPlayer}
        onRemovePlayer={handleRemovePlayer}
        onNext={() => setStep(3)}
        onBack={() => setStep(1)}
      />
    );
  }

  return (
    <PlayerAveragesStep
      league={league}
      teams={teams}
      availablePlayers={availablePlayers}
      playerAverages={playerAverages}
      onPlayerAveragesChange={setPlayerAverages}
      onSubmit={handleFinalSubmit}
      onBack={() => setStep(2)}
      onCancel={() => navigate(`/admin/leagues/${leagueId}`)}
    />
  );
};
