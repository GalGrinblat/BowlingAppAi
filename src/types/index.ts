// ============================================================================
// Core Data Types - Main application entities persisted in storage
// ============================================================================

/**
 * DateString - ISO 8601 date string (e.g., "2024-01-15T10:30:00.000Z")
 * Using string instead of Date because:
 * 1. Data is persisted in localStorage via JSON (Date objects serialize to strings)
 * 2. Avoids constant Date ↔ string conversions throughout the app
 * 3. Maintains consistency with database/API patterns
 */
export type DateString = string;

/** Organization - Top-level container for all players and leagues */
export interface Organization {
  name: string;
  language: 'en' | 'he';
  createdAt: DateString;
  updatedAt?: DateString;
}

/** Player - Individual bowler in the organization's player registry (can participate in multiple leagues) */
export interface Player {
  id: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  active: boolean;
  createdAt: DateString;
}

/** BonusRule - Configurable rule for awarding bonus points based on performance */
export interface BonusRule {
  type: 'player' | 'team';
  condition: 'vs_average' | 'pure_score';
  threshold: number;
  points: number;
}

/** LineupStrategy - How player matchups are determined for games */
export type LineupStrategy = 'flexible' | 'fixed' | 'rule-based';

/** LineupRule - Rule for automatic player ordering in rule-based lineup */
export type LineupRule = 'standard' | 'balanced';

/** SeasonConfigurations - Shared configuration for league defaults and season instances */
export interface SeasonConfigurations {
  numberOfTeams: number;
  playersPerTeam: number;
  numberOfRounds: number;
  matchesPerGame: number;
  lineupStrategy: LineupStrategy;
  lineupRule: LineupRule;
  playerMatchPointsPerWin: number;
  teamMatchPointsPerWin: number;
  teamGamePointsPerWin: number;
  useHandicap: boolean;
  handicapBasis: number;
  handicapPercentage: number;
  teamAllPresentBonusEnabled: boolean;
  teamAllPresentBonusPoints: number;
  bonusRules: BonusRule[];
}

/** League - Independent league with its own rules, seasons, and scoring configuration */
export interface League {
  id: string;
  name: string;
  description: string;
  dayOfWeek: string;
  defaultSeasonConfigurations: SeasonConfigurations;
  active: boolean;
  createdAt: DateString;
}

/** Season - Time-bound competition within a league with teams and schedule */
export interface Season {
  id: string;
  leagueId: string;
  name: string;
  startDate: DateString;
  endDate: DateString;
  seasonConfigurations: SeasonConfigurations;
  status: SeasonStatus;
  schedule?: ScheduleMatchDay[];
  /** Initial player averages for this season, keyed by playerId */
  initialPlayerAverages?: CurrentPlayerAverages;
  updatedAt?: DateString;
  createdAt: DateString;
}

/** RosterChange - Log entry tracking player substitutions in a team */
export interface RosterChange {
  date: DateString;
  position: number;
  oldPlayerId: string;
  newPlayerId: string;
  oldPlayerName: string;
  newPlayerName: string;
}

/** Team - Group of players assigned to compete in a season */
export interface Team {
  id: string;
  seasonId: string;
  name: string;
  playerIds: string[];
  rosterChanges: RosterChange[];
  createdAt: DateString;
}

/** GamePlayer - Player data snapshot for a specific game (includes calculated handicap) */
export interface GamePlayer {
  playerId: string;
  name: string;
  average: number;
  handicap: number;
  rank: number;
  absent: boolean;
}

/** GameTeam - Team data snapshot for a specific game with roster */
export interface GameTeam {
  name: string;
  players: GamePlayer[];
}

// Status type aliases
export type GameStatus = 'pending' | 'in-progress' | 'completed';
export type SeasonStatus = 'setup' | 'active' | 'completed';

/** PendingSubmission - Player-submitted score data awaiting admin approval */
export interface PendingSubmission {
  submittedAt: string;
  sessionId: string;
  submitterId?: string;   // playerId of the logged-in player who submitted
  submitterName?: string; // display name of the submitter
  team1AbsentFlags: boolean[];
  team2AbsentFlags: boolean[];
  team1PlayerOrder: string[]; // playerId order as the player set it up
  team2PlayerOrder: string[];
  matchScores: Array<{ team1Pins: number[]; team2Pins: number[] }>;
}

/** Game - Multi-match bowling game between two teams with scoring and status tracking */
export interface Game {
  // Identity
  id: string;
  seasonId: string;

  // Schedule
  round: number;
  matchDay: number;
  team1Id: string;
  team2Id: string;
  scheduledDate?: DateString;
  postponed: boolean;
  originalDate?: DateString;

  // Status
  status: GameStatus;
  completedAt?: DateString;
  createdAt: DateString;
  updatedAt?: DateString;

  // Config snapshot (copied from season at creation)
  matchesPerGame: number;
  useHandicap: boolean;
  lineupStrategy: LineupStrategy;
  lineupRule: LineupRule;
  playerMatchPointsPerWin: number;
  teamMatchPointsPerWin: number;
  teamGamePointsPerWin: number;
  teamAllPresentBonusEnabled: boolean;
  teamAllPresentBonusPoints: number;
  bonusRules: BonusRule[];

  // Scoring data (lazily populated on first load, then persisted as JSON)
  team1?: GameTeam;
  team2?: GameTeam;
  matches?: GameMatch[];
  /** Points awarded for highest total pins across all matches */
  grandTotalPoints?: { team1: number; team2: number };
  /** Player-submitted score data pending admin approval */
  pendingSubmission?: PendingSubmission;
}

// ============================================================================
// Validation & Utility Types
// ============================================================================

/** ValidationResult - Standard result from validation functions */
export interface ValidationResult {
  valid: boolean;
  error?: string;
}

// ============================================================================
// Context Types - React context interfaces for app-wide state
// ============================================================================

/** User - Authenticated user with role-based access */
export interface User {
  role: 'admin' | 'player';
  userId: string;
}

/** AuthContextType - Authentication context providing user state and actions */
export interface AuthContextType {
  currentUser: User | null;
  playerData: Player | null;
  isLoading?: boolean;
  user?: User | null;
  login: (userId: string, role: 'admin' | 'player') => void;
  loginWithGoogle?: () => Promise<void>;
  logout: () => void;
  isAdmin: () => boolean;
  isPlayer: () => boolean;
  session?: { user: { id: string; email?: string } } | null;
}

/** TranslationDictionary - Nested translation key-value structure */
export interface TranslationDictionary {
  [key: string]: string | TranslationDictionary;
}

/** LanguageContextType - i18n context providing language state and translation function */
export interface LanguageContextType {
  language: 'en' | 'he';
  setLanguage: (lang: 'en' | 'he') => void;
  t: (key: string) => string;
  direction: 'ltr' | 'rtl';
  isRTL: boolean;
  locale: string;
}

// ============================================================================
// Standings & Statistics Types - Calculated team rankings and player performance metrics
// ============================================================================

/** TeamStanding - Calculated standings for a team in a season */
export interface TeamStanding {
  teamId: string;
  teamName: string;
  gamesPlayed: number;
  wins: number;
  losses: number;
  draws: number;
  points: number;
  totalPins: number;
  totalPinsWithHandicap: number;
}

/** PlayerRecordContext - Where and when a personal record was achieved */
export interface PlayerRecordContext {
  date: string;
  leagueName: string;
  seasonName: string;
  round: number;
  matchDay: number;
}

/** PlayerStats - Aggregated player performance statistics across games */
export interface PlayerStats {
  playerId: string;
  playerName: string;
  gamesPlayed: number;
  totalPins: number;
  average: number;
  highGame: number;
  highGameContext?: PlayerRecordContext;
  highSeries: number;
  highSeriesContext?: PlayerRecordContext;
  highSeriesByCount: Record<number, { pins: number; context: PlayerRecordContext }>;
  seriesCount: number;
  teamId?: string;
  teamName?: string;
  pointsScored: number;
}

/** CurrentPlayerAverage - Running average calculation for dynamic handicap updates */
export interface CurrentPlayerAverage {
  totalPins: number;
  gamesPlayed: number;
  average: number;
}

/** CurrentPlayerAverages - Map of player IDs to their current averages in a season */
export interface CurrentPlayerAverages {
  [playerId: string]: CurrentPlayerAverage;
}

export interface PlayerRecordEntry {
  playerId: string;
  playerName: string;
  recordType: 'singleMatch' | 'series';
  value: number;
  numberOfGames: number;
  date: string;
}

export interface TeamRecordEntry {
  teamId: string;
  teamName: string;
  recordType: 'singleMatch' | 'series';
  value: number;
  numberOfGames: number;
  date: string;
  playerIds: string[]; // For team records, we can also track which players were involved
}

// ============================================================================
// Scheduling Types - Round-robin schedule generation and match day tracking
// ============================================================================

/** Match - Simple team pairing for scheduling purposes */
export interface Match {
  team1Id: string;
  team2Id: string;
}

/** ScheduleMatchDay - Single match day containing multiple matches in a round */
export interface ScheduleMatchDay {
  round: number;
  matchDay: number;
  matches: Match[];
  date?: DateString;
  postponed?: boolean;
  originalDate?: DateString;
}

// ============================================================================
// Scoring & Match Calculation Types - Real-time game scoring with multi-layer points system
// ============================================================================

/** MatchPlayer - Individual player's performance in a single match (pins + bonus) */
export interface MatchPlayer {
  pins: string;
  bonusPoints: number;
}

/** MatchTeam - Team's calculated totals for a single match */
export interface MatchTeam {
  points: number;
  totalPins: number;
  totalWithHandicap: number;
  bonusPoints: number;
  players: MatchPlayer[];
}

/** GameMatch - Single match within a game with player-by-player results and team totals */
export interface GameMatch {
  matchNumber: number;
  team1: MatchTeam;
  team2: MatchTeam;
  playerMatches: PlayerMatchResult[];
}

/** PlayerMatchResult - Head-to-head result for one player matchup */
export interface PlayerMatchResult {
  player: number;
  result: 'team1' | 'team2' | 'draw' | null;
  team1Points: number;
  team2Points: number;
}

// ============================================================================
// Component Props - Type-safe props for all React components
// ============================================================================

// --- Admin Components ---

/** Props for PrintMatchDay - Printable matchday sheet with team rosters and player info */
export interface PrintMatchDayProps {
  seasonId: string;
  matchDay: number;
  onClose: () => void;
}

// --- Game/Scoring Components ---

/** Props for MatchView - Score entry interface for a single match */
export interface MatchViewProps {
  matchNumber: number;
  game: Game;
  onUpdateScore: (matchIndex: number, team: 'team1' | 'team2', playerIndex: number, pins: string) => void;
  onToggleAbsent?: (team: 'team1' | 'team2', playerIndex: number) => void;
  onNavigate: (direction: string) => void;
  onCancel: () => void;
  isReadOnly?: boolean;
}

/** GameTotals - Aggregated point and pin totals across all matches in a game */
export interface GameTotals {
  team1Points: number;
  team2Points: number;
  team1TotalPinsWithHandicap: number;
  team1TotalPinsNoHandicap: number;
  team2TotalPinsWithHandicap: number;
  team2TotalPinsNoHandicap: number;
}

/** GamePlayerStats - Aggregated player statistics for an entire game */
export interface GamePlayerStats {
  team1Stats: (GamePlayer & { totalPins: number; gameAverage: number; pointsScored: number; isAbsent: boolean })[];
  team2Stats: (GamePlayer & { totalPins: number; gameAverage: number; pointsScored: number; isAbsent: boolean })[];
  team1TotalPins: number;
  team2TotalPins: number;
  team1Average: number;
  team2Average: number;
}

/** Props for GameSummaryView - Final game results and statistics */
export interface GameSummaryViewProps {
  game: Game;
  totals: GameTotals;
  playerStats: GamePlayerStats;
  onBack: () => void;
  onFinish: () => void;
}

// --- Shared/Common Components ---

/** Props for Header - Top navigation bar with user info */
export interface HeaderProps {
  currentUser: User | null;
  onLogout: () => void;
}

/** Props for Pagination - Paginated list navigation */
export interface PaginationProps {
  currentPage: number;
  totalItems: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
}
