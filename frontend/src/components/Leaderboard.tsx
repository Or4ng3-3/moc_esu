import { useState, useCallback } from 'react';
import { AnimatePresence } from 'framer-motion';
import CandidateCard from './CandidateCard';
import FloatingVote from './FloatingVote';
import type { Candidate } from '../types';

interface LeaderboardProps {
  candidates: Candidate[];
  onVote: (candidateId: string) => void;
}

interface FloatingVoteData {
  id: string;
  x: number;
  y: number;
}

export default function Leaderboard({ candidates, onVote }: LeaderboardProps) {
  const [floatingVotes, setFloatingVotes] = useState<FloatingVoteData[]>([]);

  const handleVote = useCallback((candidateId: string, event: React.MouseEvent) => {
    // Spawn floating +1 at click position
    const voteId = `vote-${Date.now()}-${Math.random()}`;
    setFloatingVotes((prev) => [...prev, { id: voteId, x: event.clientX, y: event.clientY }]);

    // Remove after animation
    setTimeout(() => {
      setFloatingVotes((prev) => prev.filter((v) => v.id !== voteId));
    }, 900);

    // Trigger optimistic vote — UI updates instantly, API happens in background
    onVote(candidateId);
  }, [onVote]);

  return (
    <div className="relative space-y-2">
      {/* Leaderboard Header */}
      <div className="flex items-center gap-3 sm:gap-4 px-4 py-2 text-xs text-gray-500 uppercase tracking-wider">
        <span className="w-10 sm:w-12 text-center">排名</span>
        <span className="w-10 sm:w-12" />
        <span className="flex-1">姓名</span>
        <span className="text-right">票数</span>
      </div>

      {/* Candidate Cards */}
      <AnimatePresence mode="popLayout">
        {candidates.map((candidate, index) => (
          <CandidateCard
            key={candidate.id}
            candidate={candidate}
            rank={index + 1}
            onVote={handleVote}
          />
        ))}
      </AnimatePresence>

      {candidates.length === 0 && (
        <div className="text-center text-gray-500 py-12">
          暂无候选人，请联系管理员添加
        </div>
      )}

      {/* Floating +1 particles */}
      {floatingVotes.map((fv) => (
        <FloatingVote key={fv.id} id={fv.id} x={fv.x} y={fv.y} />
      ))}
    </div>
  );
}
