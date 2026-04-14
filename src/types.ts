export interface Match {
  id: string;
  sport: "football" | "basketball";
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  status: "live" | "scheduled" | "finished";
  time: string;
  events: MatchEvent[];
  prediction?: string;
}

export interface MatchEvent {
  id: string;
  time: string;
  type: string;
  description: string;
  aiCommentary?: string;
}
