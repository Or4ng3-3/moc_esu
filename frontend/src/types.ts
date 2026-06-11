export interface Candidate {
  id: string;
  name: string;
  avatar_url: string;
  total_votes: number;
  created_at: string;
}

export interface DailyWinner {
  record_date: string;
  candidate_id: string;
  name: string;
  avatar_url: string;
  votes: number;
}
