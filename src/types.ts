export interface Match {
  id: string;
  sport: "football" | "basketball" | "tennis" | "formula1" | "baseball" | "cricket";
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  status: "live" | "scheduled" | "finished";
  time: string;
  events: MatchEvent[];
  prediction?: string;
  finishedAt?: number;
}

export interface MatchEvent {
  id: string;
  time: string;
  type: string;
  description: string;
  aiCommentary?: string;
}

export interface ChatMessage {
  id: string;
  matchId: string;
  userId: string;
  userName: string;
  userPhoto?: string;
  text: string;
  timestamp: number;
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  bio?: string;
  points: number;
  favorites: string[]; // Array of match IDs
  notificationSettings: NotificationSettings;
  role: "admin" | "user";
}

export interface NotificationSettings {
  goals: boolean;
  cards: boolean;
  matchStart: boolean;
  matchEnd: boolean;
}

export interface PredictionRecord {
  id: string;
  userId: string;
  matchId: string;
  predictedScore: string;
  actualScore?: string;
  pointsEarned?: number;
  timestamp: number;
}

export interface SocialEvent {
  id: string;
  type: "match_event" | "chat_message";
  matchId: string;
  matchName?: string;
  content: string;
  userName?: string;
  userPhoto?: string;
  timestamp: number;
}
