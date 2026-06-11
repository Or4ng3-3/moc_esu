import type { Candidate, DailyWinner } from './types';

// In dev, Vite proxy handles /api → localhost:8000
// In production, set VITE_API_URL to your backend URL, e.g. https://moc-esu.onrender.com/api
const API_BASE = import.meta.env.VITE_API_URL || '/api';

export async function fetchCandidates(): Promise<Candidate[]> {
  const res = await fetch(`${API_BASE}/candidates`);
  if (!res.ok) throw new Error('Failed to fetch candidates');
  return res.json();
}

export async function voteCandidate(candidateId: string): Promise<{ success: boolean; total_votes: number }> {
  const res = await fetch(`${API_BASE}/vote/${candidateId}`, { method: 'POST' });
  if (!res.ok) throw new Error('Failed to vote');
  return res.json();
}

export async function batchVote(votes: Record<string, number>): Promise<{ success: boolean }> {
  const res = await fetch(`${API_BASE}/vote/batch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ votes }),
  });
  if (!res.ok) throw new Error('Failed to batch vote');
  return res.json();
}

export async function fetchHistoryWinners(): Promise<DailyWinner[]> {
  const res = await fetch(`${API_BASE}/history/winners`);
  if (!res.ok) throw new Error('Failed to fetch history');
  return res.json();
}

export async function adminVerify(password: string): Promise<{ success: boolean; token: string }> {
  const res = await fetch(`${API_BASE}/admin/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password }),
  });
  if (!res.ok) throw new Error('Unauthorized');
  return res.json();
}

export async function adminGetCandidates(token: string): Promise<Candidate[]> {
  const res = await fetch(`${API_BASE}/admin/candidates`, {
    headers: { 'X-Admin-Token': token },
  });
  if (!res.ok) throw new Error('Failed to fetch');
  return res.json();
}

export async function adminCreateCandidate(token: string, data: { name: string; avatar_url: string; total_votes: number }): Promise<Candidate> {
  const res = await fetch(`${API_BASE}/admin/candidates`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Admin-Token': token },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to create');
  return res.json();
}

export async function adminUpdateCandidate(token: string, id: string, data: { name?: string; avatar_url?: string; total_votes?: number }): Promise<Candidate> {
  const res = await fetch(`${API_BASE}/admin/candidates/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'X-Admin-Token': token },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to update');
  return res.json();
}

export async function adminDeleteCandidate(token: string, id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/admin/candidates/${id}`, {
    method: 'DELETE',
    headers: { 'X-Admin-Token': token },
  });
  if (!res.ok) throw new Error('Failed to delete');
}
