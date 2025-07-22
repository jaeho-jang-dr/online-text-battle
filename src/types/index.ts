// 기본 사용자 인터페이스
export interface User {
  id: number;
  username: string;
  email: string;
  password: string;
  createdAt: Date;
  updatedAt: Date;
  lastLogin?: Date;
  is_admin: boolean;
  is_active: boolean;
}

// 캐릭터 인터페이스
export interface Character {
  id: number;
  user_id: number;
  name: string;
  level: number;
  health: number;
  max_health: number;
  mana: number;
  max_mana: number;
  strength: number;
  defense: number;
  speed: number;
  experience: number;
  created_at: Date;
  updated_at: Date;
  // JOIN된 데이터
  username?: string;
  wins?: number;
  losses?: number;
  draws?: number;
  points?: number;
  rank?: number;
  skills?: any[];
}

// 스킬 인터페이스
export interface Skill {
  id: number;
  name: string;
  description: string;
  mana_cost: number;
  damage?: number;
  heal_amount?: number;
  cooldown: number;
  skill_type: SkillType;
  created_at: Date;
  updated_at: Date;
  // 캐릭터 스킬 정보 (character_skills 테이블과 JOIN시)
  skill_level?: number;
}

// 스킬 타입
export enum SkillType {
  ATTACK = 'attack',
  DEFENSE = 'defense',
  HEAL = 'heal',
  BUFF = 'buff',
  DEBUFF = 'debuff'
}

// 배틀 인터페이스
export interface Battle {
  id: number;
  player1_id: number;
  player2_id: number;
  winner_id?: number;
  status: BattleStatus;
  turn_count: number;
  current_turn: number;
  battleLog?: BattleAction[];
  created_at: Date;
  updated_at: Date;
  finished_at?: Date;
  // 플레이어 정보 (JOIN된 데이터)
  player1_name?: string;
  player1_level?: number;
  player1_health?: number;
  player1_max_health?: number;
  player1_mana?: number;
  player1_max_mana?: number;
  player1_strength?: number;
  player1_defense?: number;
  player1_speed?: number;
  player2_name?: string;
  player2_level?: number;
  player2_health?: number;
  player2_max_health?: number;
  player2_mana?: number;
  player2_max_mana?: number;
  player2_strength?: number;
  player2_defense?: number;
  player2_speed?: number;
  winner_name?: string;
}

// 배틀 상태
export enum BattleStatus {
  WAITING = 'waiting',
  IN_PROGRESS = 'in_progress',
  FINISHED = 'finished',
  CANCELLED = 'cancelled'
}

// 배틀 액션
export interface BattleAction {
  id: number;
  battle_id: number;
  character_id: number;
  action_type: ActionType;
  skill_id?: number;
  target_id?: number;
  damage?: number;
  heal_amount?: number;
  turn_number: number;
  created_at: Date;
  // JOIN된 데이터
  character_name?: string;
  skill_name?: string;
}

// 액션 타입
export enum ActionType {
  ATTACK = 'attack',
  SKILL = 'skill',
  DEFEND = 'defend',
  ITEM = 'item'
}

// 랭킹 인터페이스
export interface Ranking {
  id: number;
  character_id: number;
  wins: number;
  losses: number;
  draws: number;
  points: number;
  rank: number;
  updated_at: Date;
}

// Socket 이벤트 타입들
export interface ClientToServerEvents {
  'battle:join': (data: { characterId: number }) => void;
  'battle:action': (data: { 
    battleId: number; 
    characterId: number; 
    actionType: ActionType; 
    skillId?: number; 
    targetId?: number; 
  }) => void;
  'battle:surrender': (data: { battleId: number; characterId: number }) => void;
  'battle:leave': (data: { battleId: number }) => void;
  'chat:send': (data: { 
    message: string; 
    channelType?: 'global' | 'battle' | 'private';
    battleId?: number; 
    recipientId?: number; 
  }) => void;
  'chat:private': (data: { recipientId: number; message: string }) => void;
  'chat:join': (data: { roomName: string }) => void;
  'chat:leave': (data: { roomName: string }) => void;
  'chat:typing': (data: { 
    channelType?: 'global' | 'battle' | 'private';
    battleId?: number; 
    recipientId?: number; 
  }) => void;
  'chat:stop-typing': (data: { 
    channelType?: 'global' | 'battle' | 'private';
    battleId?: number; 
    recipientId?: number; 
  }) => void;
  'message': (data: { username: string; message: string; timestamp: Date }) => void;
}

export interface ServerToClientEvents {
  'battle:matched': (data: { battle: Battle }) => void;
  'battle:start': (data: { battle: Battle }) => void;
  'battle:update': (data: { battle: Battle; action: BattleAction }) => void;
  'battle:end': (data: { battle: Battle; winner: string }) => void;
  'battle:error': (data: { message: string }) => void;
  'chat:message': (data: any) => void;
  'chat:private': (data: any) => void;
  'chat:error': (data: { message: string }) => void;
  'chat:online-users': (data: any[]) => void;
  'chat:typing': (data: any) => void;
  'chat:stop-typing': (data: any) => void;
  'message': (data: { username: string; message: string; timestamp: Date }) => void;
}

// API 응답 타입들
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

// 인증 관련 타입들
export interface LoginRequest {
  username: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  user: Omit<User, 'password'>;
}

// JWT 페이로드
export interface JwtPayload {
  userId: number;
  username: string;
  iat: number;
  exp: number;
}

// 매치메이킹 큐 타입
export interface MatchmakingQueue {
  characterId: number;
  character: Character;
  socketId: string;
  joinedAt: Date;
}

// 게임 설정
export interface GameConfig {
  maxHealth: number;
  maxMana: number;
  baseDamage: number;
  turnTimeLimit: number;
  maxBattleTime: number;
}