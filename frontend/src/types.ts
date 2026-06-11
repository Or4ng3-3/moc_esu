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

export interface SubmissionRequest {
  id: string;
  name: string;
  avatar_url: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
}

export interface Comment {
  id: string;
  candidate_id: string;
  author_name: string;
  content: string;
  likes: number;
  created_at: string;
}
