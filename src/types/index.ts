export interface User {
  id: number;
  username: string;
  elo_rating: number;
  total_battles: number;
  wins: number;
  losses: number;
  is_online: boolean;
}

export interface Character {
  id: number;
  user_id: number;
  name: string;
  type: 'normal' | 'legendary' | 'fictional' | 'historical';
  battle_chat: string;
  is_active: boolean;
}

export interface BattleQueue {
  id: number;
  user_id: number;
  character_id: number;
  joined_at: string;
  status: 'waiting' | 'matched' | 'cancelled';
}

export interface Battle {
  id: number;
  player1_id: number;
  player1_character_id: number;
  player1_chat: string;
  player2_id: number;
  player2_character_id: number;
  player2_chat: string;
  winner_id: number | null;
  started_at: string;
  ended_at: string | null;
  player1_elo_before: number;
  player1_elo_after: number;
  player2_elo_before: number;
  player2_elo_after: number;
  is_ai_battle: boolean;
}

export interface LeaderboardEntry {
  id: number;
  username: string;
  elo_rating: number;
  total_battles: number;
  wins: number;
  losses: number;
  is_online: boolean;
  active_character_id: number | null;
  character_name: string | null;
  character_type: string | null;
  win_rate: number;
  is_ai?: number;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  user?: User;
  token?: string;
}

export interface MatchmakingResult {
  success: boolean;
  opponent?: {
    user_id: number;
    username: string;
    character: Character;
    is_ai: boolean;
  };
  queue_id?: number;
}