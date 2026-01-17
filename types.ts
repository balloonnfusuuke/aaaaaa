
export type UserRole = 'admin' | 'user';

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  role: UserRole;
  createdAt: any;
}

export interface Team {
  id: string;
  name: string;
  abbreviation: string;
  coach?: string;
  color?: string;
  createdAt: any;
  updatedAt: any;
}

export interface Player {
  id: string;
  teamId: string; // 所属チームID
  name: string;
  number: string;
  throwing: '右' | '左';
  batting: '右' | '左' | '両';
  position: string;
  createdAt: any;
  updatedAt: any;
}

export type PitchType = 'ストレート' | 'スライダー' | 'カット' | 'カーブ' | 'チェンジアップ' | 'フォーク' | 'シンカー' | 'シュート' | 'その他';
export type RunnerState = { first: boolean; second: boolean; third: boolean; };
export type GameSituation = '接戦' | '勝ち越し中' | '追い上げ中' | '大差(勝)' | '大差(負)';
export type SwingDecision = 'Take' | 'Swing';
export type ExitVelocity = 'Strong' | 'Normal' | 'Weak';
export type LaunchAngle = 'ゴロ' | 'ライナー' | 'フライ' | 'ポップフライ' | 'Grounder' | 'Line Drive' | 'Fly Ball' | 'Pop Up';
export type HitDirection = '左' | '左中' | '中' | '右中' | '右';
export type BattedBallLocation = '内野' | '外野';
export type BattedBallDepth = '極浅' | '浅い' | '普通' | '深い' | '極深';
export type ContactCategory = 'Barrel' | 'Solid' | 'Flare' | 'Weak';
export type HangTime = '短い' | '普通' | '長い';

export type PAResult = 
  | '単打' | '二塁打' | '三塁打' | '本塁打' 
  | '四球' | '敬遠' | '死球' 
  | '三振(空振り)' | '三振(見逃し)' 
  | '犠打' | '犠飛' | '併殺打' | '打撃妨害' 
  | '内野凡打' | '内野フライ' | '外野フライ' | 'ライナー' | 'ポップフライ'
  | '失策出塁' | '野選' | '進行中'
  | '凡打(アウト)';

// Define PitchOutcome to fix missing export error
export type PitchOutcome = 'ストライク' | 'ボール' | '空振り' | 'ファウル' | 'ヒット' | 'アウト' | 'ホームラン';

// Define PitchRecord to fix missing export error
export interface PitchRecord {
  id?: string;
  gameId: string;
  date: string;
  opponent: string;
  venue: string;
  inning: number;
  isTop: boolean;
  outs: number;
  runners: RunnerState;
  scoreDiff: number;
  atBatCount: number;
  pitcherId: string;
  pitcherName: string;
  pitcherThrowing: string;
  pitcherStyle: '上手' | '横手' | '下手' | 'その他';
  batterId: string;
  batterName: string;
  batterBatting: string;
  battingOrder: number;
  balls: number;
  strikes: number;
  pitchInAtBat: number;
  pitchType: PitchType;
  speed: number | null;
  location: number;
  outcome: PitchOutcome;
  isSwing: boolean;
  isContact: boolean;
  isInPlay: boolean;
  intent: 'ストライク' | '決め' | '釣り' | 'その他';
  isMiss: boolean;
  batterReaction: '振り遅れ' | '差し込まれ' | '良反応' | '見逃し' | 'その他';
  evaluation: '良い' | '妥当' | '悪い';
  createdAt: any;
  updatedAt?: any;
}

// Define BatterRecord to fix missing export error
export interface BatterRecord {
  id?: string;
  gameId: string;
  date: string;
  opponent: string;
  inning: number;
  isTop: boolean;
  outs: number;
  runners: RunnerState;
  balls: number;
  strikes: number;
  scoreDiff: number;
  battingOrder: number;
  gameSituation: GameSituation;
  pitcherId: string;
  pitcherName: string;
  pitchType: PitchType;
  speed: number | null;
  location: number;
  pitchesInAtBat: number;
  totalPitchesSeen: number;
  decision: SwingDecision;
  reaction: '振り遅れ' | '差し込まれ' | '良反応' | '見逃し' | 'その他';
  missAmount: 'なし' | 'かすり' | 'チップ' | '空振り';
  isHardHit: boolean;
  isSweetSpot: boolean;
  exitVelocity: ExitVelocity;
  launchAngle: LaunchAngle;
  direction: HitDirection;
  ballLocation: BattedBallLocation;
  ballDepth: BattedBallDepth;
  fieldPlacement: '正面' | '逆をついた' | '野手間';
  hangTime: HangTime;
  category: ContactCategory;
  isCaught: boolean;
  paResult: PAResult;
  rbi: number;
  runs: number;
  re24: number;
  advancements: any[];
  isQualityOut: boolean;
  forcedCloserPitches: boolean;
  createdAt: any;
  updatedAt?: any;
}

export interface UnifiedRecord {
  id?: string;
  date: string;
  opponent: string;
  inning: number;
  isTop: boolean;
  outs: number;
  runners: RunnerState;
  balls: number;
  strikes: number;
  scoreDiff: number;
  gameSituation: GameSituation;

  pitcherId: string;
  pitcherName: string;
  pitcherTeamId?: string; // オプション: チーム横断分析用
  pitchType: PitchType;
  speed: number | null;
  location: number;
  intent: 'ストライク' | '釣り' | '決め' | 'その他';
  intentResult: '成功' | '失敗';
  isPitchMiss: boolean;
  pitchEval: '良い' | '妥当' | '悪い';

  pitchOutcome: '見逃しS' | '空振りS' | 'ファウル' | 'ボール' | 'インプレー';

  batterId: string;
  batterName: string;
  batterTeamId?: string;
  decision: SwingDecision;
  reaction: '振り遅れ' | '差し込まれ' | '良反応' | '見逃し' | 'その他';
  isHardHit: boolean;
  isSweetSpot: boolean;
  pitchesSeenInATBat: number;

  paResult: PAResult;
  exitVelocity: ExitVelocity;
  launchAngle: LaunchAngle;
  battedAngle?: number;
  hitDirection: HitDirection;
  ballLoc: BattedBallLocation;
  ballDepth: BattedBallDepth;
  isCaught: boolean;
  rbi: number;
  isQualityOut: boolean;
  forcedCloserPitches: boolean;
  
  createdAt: any;
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}
