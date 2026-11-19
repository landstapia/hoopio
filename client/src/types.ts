export type TeamCategory = 'Senior' | 'Junior' | 'Free';
export type GameStatus = 'scheduled' | 'live' | 'final';
export type FoulType =
  | 'personal'
  | 'technical'
  | 'technical_c1'
  | 'technical_c2'
  | 'disruptive'
  | 'flagrant'
  | 'disqualifying';

export interface Team {
  id: number;
  name: string;
  abbr: string;
  alias: string;
  color: string;
  photo: string;
  category: TeamCategory;
  archived: boolean;
  coach: string;
  assistant: string;
  captainId: number | null;
}

export interface Player {
  id: number;
  teamId: number;
  first: string;
  last: string;
  nick: string;
  number: string;
  locale: string;
  photo: string;
  archived: boolean;
  verified: boolean;
  verifiedAt?: string;
}

export interface GameEvent {
  id: number;
  period: number;
  clock: number;
  teamId: number | null;
  playerId: number | null;
  type: string;
  outId?: number | null;
  pts?: number;
  secs?: number;
  foulType?: FoulType;
  teamFoul?: boolean;
  staff?: 'coach' | 'assistant' | 'bench';
}

export interface Game {
  id: number;
  season: string;
  date: string;
  time: string;
  no: number;
  competition: string;
  place: string;
  home: number;
  away: number;
  status: GameStatus;
  runningTime: boolean;
  rtLast2: boolean;
  lineupPeriod: number;
  isDefault: boolean;
  events: GameEvent[];
  adj: Record<number, number>;
  active: Record<number, number[]>;
  played: number[];
}

export interface LiveState {
  gameId: number | null;
  period: number;
  clock: number;
  periodLen: number;
  running: boolean;
  shot: number;
  shotOn: boolean;
  shotHold: boolean;
  shotViol?: boolean;
  arrow: number | null;
  timeouts: Record<number, number>;
  names: Record<number, string>;
  toKind: 'timeout' | 'break' | null;
  toTeam: number | null;
  toLeft: number;
  toSuspended: boolean;
  swap: boolean;
  buzzOn: boolean;
  buzzLeft: number;
  buzzKind: 'shot' | null;
  timeoutSecs: number;
}

export interface CustomTeamSide {
  name: string;
  full: string;
  color: string;
  score: number;
  fouls: number;
  timeouts: number;
}

export interface CustomState {
  a: CustomTeamSide;
  b: CustomTeamSide;
  period: number;
  clock: number;
  periodLen: number;
  running: boolean;
  shot: number;
  shotOn: boolean;
  shotHold: boolean;
  arrow: 'a' | 'b' | null;
  swap: boolean;
  toKind: 'timeout' | 'break' | null;
  toTeam: 'a' | 'b' | null;
  toLeft: number;
  toSuspended: boolean;
  buzzOn: boolean;
  buzzLeft: number;
  buzzKind: 'shot' | null;
  timeoutSecs: number;
}

export interface FullDbPayload {
  teams: Team[];
  players: Player[];
  games: Game[];
  live: LiveState;
  custom: CustomState;
}

export interface PatchChange {
  live?: Partial<LiveState>;
  liveAdd?: { clock?: number; shot?: number };
  custom?: Omit<Partial<CustomState>, 'a' | 'b'> & {
    a?: Partial<CustomTeamSide>;
    b?: Partial<CustomTeamSide>;
  };
  customAdd?: { clock?: number; shot?: number };
  teams?: Array<Partial<Team> & { id?: number }>;
  players?: Array<Partial<Player> & { id?: number }>;
  games?: Game[];
  newGame?: {
    season: string;
    date: string;
    time?: string;
    home: number;
    away: number;
    runningTime?: boolean;
    competition?: string;
    place?: string;
  };
  delGame?: number;
  delTeam?: number;
  delPlayer?: number;
  log?: string;
}

export interface ClockTickPayload {
  live: Pick<
    LiveState,
    'clock' | 'shot' | 'running' | 'toKind' | 'toTeam' | 'toLeft' | 'toSuspended' | 'buzzOn' | 'buzzLeft' | 'buzzKind'
  >;
  custom: Pick<
    CustomState,
    'clock' | 'shot' | 'running' | 'toKind' | 'toTeam' | 'toLeft' | 'toSuspended' | 'buzzOn' | 'buzzLeft' | 'buzzKind'
  >;
}