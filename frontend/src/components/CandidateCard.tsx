import { motion } from 'framer-motion';
import type { Candidate } from '../types';

interface CandidateCardProps {
  candidate: Candidate;
  rank: number;
  onVote: (candidateId: string, event: React.MouseEvent) => void;
  onAvatarClick: (candidateId: string) => void;
}

export default function CandidateCard({ candidate, rank, onVote, onAvatarClick }: CandidateCardProps) {
  const getRankColor = (rank: number) => {
    switch (rank) {
      case 1: return 'text-yellow-400';
      case 2: return 'text-gray-300';
      case 3: return 'text-amber-600';
      default: return 'text-gray-500';
    }
  };

  const getRankEmoji = (rank: number) => {
    switch (rank) {
      case 1: return '🥇';
      case 2: return '🥈';
      case 3: return '🥉';
      default: return `#${rank}`;
    }
  };

  const getCardBg = (rank: number) => {
    switch (rank) {
      case 1: return 'bg-gradient-to-r from-yellow-900/30 to-yellow-800/20 border-yellow-600/50';
      case 2: return 'bg-gradient-to-r from-gray-800/30 to-gray-700/20 border-gray-500/40';
      case 3: return 'bg-gradient-to-r from-amber-900/30 to-amber-800/20 border-amber-600/40';
      default: return 'bg-gray-800/40 border-gray-700/30';
    }
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      whileTap={{ scale: 0.97 }}
      onClick={(e) => onVote(candidate.id, e)}
      className={`
        flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-xl border cursor-pointer
        transition-colors duration-200 hover:border-gray-500/60
        ${getCardBg(candidate.total_votes > 0 ? rank : 99)}
        select-none
      `}
    >
      {/* Rank */}
      <div className={`w-10 sm:w-12 text-center text-lg sm:text-xl font-bold ${getRankColor(rank)}`}>
        {getRankEmoji(rank)}
      </div>

      {/* Avatar — click to view profile & comments */}
      <div
        className="flex-shrink-0 cursor-pointer hover:scale-110 transition-transform"
        onClick={(e) => {
          e.stopPropagation();
          onAvatarClick(candidate.id);
        }}
        title={`查看 ${candidate.name} 的详细页面`}
      >
        <img
          src={candidate.avatar_url}
          alt={candidate.name}
          className="w-10 h-10 sm:w-12 sm:h-12 rounded-full border-2 border-gray-600 object-cover hover:border-orange-500/60 transition-colors"
          onError={(e) => {
            (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(candidate.name)}`;
          }}
        />
      </div>

      {/* Name */}
      <div className="flex-1 min-w-0">
        <span className="text-sm sm:text-base font-medium text-gray-100 truncate block">
          {candidate.name}
        </span>
      </div>

      {/* Votes */}
      <motion.div
        key={candidate.total_votes}
        initial={{ scale: 1.3 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 15 }}
        className="flex-shrink-0 text-right"
      >
        <span className="text-lg sm:text-xl font-bold text-orange-400 tabular-nums">
          {candidate.total_votes}
        </span>
        <span className="text-xs text-gray-500 ml-1">票</span>
      </motion.div>
    </motion.div>
  );
}
