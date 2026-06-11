import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Candidate, Comment } from '../types';
import { fetchCandidates, fetchComments, addComment, likeComment } from '../api';

interface CandidateDetailProps {
  candidateId: string;
  onBack: () => void;
}

export default function CandidateDetail({ candidateId, onBack }: CandidateDetailProps) {
  const [candidate, setCandidate] = useState<Candidate | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [authorName, setAuthorName] = useState('');
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [candidates, cmts] = await Promise.all([
        fetchCandidates(),
        fetchComments(candidateId),
      ]);
      const found = candidates.find((c) => c.id === candidateId);
      setCandidate(found || null);
      setComments(cmts);
    } catch (err) {
      console.error('Failed to load:', err);
    } finally {
      setLoading(false);
    }
  }, [candidateId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSubmit = async () => {
    if (!content.trim()) return;
    setSubmitting(true);
    try {
      const newComment = await addComment(candidateId, content.trim(), authorName.trim());
      setComments((prev) => [newComment, ...prev]);
      setContent('');
    } catch (err) {
      console.error('Failed to submit comment:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleLike = async (commentId: string) => {
    // Optimistic update
    setComments((prev) =>
      prev.map((c) =>
        c.id === commentId ? { ...c, likes: c.likes + 1 } : c
      )
    );
    try {
      await likeComment(commentId);
    } catch {
      // Rollback
      setComments((prev) =>
        prev.map((c) =>
          c.id === commentId ? { ...c, likes: c.likes - 1 } : c
        )
      );
    }
  };

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return '刚刚';
    if (mins < 60) return `${mins}分钟前`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}小时前`;
    return d.toLocaleDateString('zh-CN');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="animate-pulse text-gray-500">加载中...</div>
      </div>
    );
  }

  if (!candidate) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 mb-4">候选人不存在</p>
          <button onClick={onBack} className="text-orange-400 hover:underline">← 返回排行榜</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950">
      <div className="max-w-2xl mx-auto px-4 py-6 sm:py-10">
        {/* Back button */}
        <button
          onClick={onBack}
          className="mb-6 px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm transition-colors"
        >
          ← 返回排行榜
        </button>

        {/* Candidate Info Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gray-900/60 border border-gray-800 rounded-2xl p-6 mb-6 text-center"
        >
          <img
            src={candidate.avatar_url}
            alt={candidate.name}
            className="w-20 h-20 rounded-full border-2 border-orange-500/50 mx-auto mb-3"
            onError={(e) => {
              (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(candidate.name)}`;
            }}
          />
          <h1 className="text-xl font-bold text-gray-200">{candidate.name}</h1>
          <p className="text-orange-400 text-lg font-bold mt-1">{candidate.total_votes} 票</p>
        </motion.div>

        {/* Comment Form */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-gray-900/60 border border-gray-800 rounded-2xl p-4 sm:p-5 mb-6"
        >
          <h3 className="text-sm font-bold text-gray-400 mb-3">💬 写评论</h3>
          <div className="space-y-3">
            <input
              type="text"
              value={authorName}
              onChange={(e) => setAuthorName(e.target.value)}
              placeholder="你的昵称 (留空为匿名)"
              maxLength={30}
              className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-600 text-gray-100 placeholder-gray-500 focus:outline-none focus:border-orange-500 transition-colors text-sm"
            />
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="写点什么..."
              rows={3}
              className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-600 text-gray-100 placeholder-gray-500 focus:outline-none focus:border-orange-500 transition-colors resize-none text-sm"
            />
            <button
              onClick={handleSubmit}
              disabled={!content.trim() || submitting}
              className="w-full py-2 rounded-lg bg-orange-600 hover:bg-orange-500 disabled:bg-gray-700 disabled:text-gray-500 text-white font-medium text-sm transition-colors"
            >
              {submitting ? '提交中...' : '发布评论'}
            </button>
          </div>
        </motion.div>

        {/* Comment List */}
        <AnimatePresence>
          {comments.length === 0 ? (
            <p className="text-center text-gray-600 text-sm py-8">暂无评论，来写第一条吧</p>
          ) : (
            <div className="space-y-3">
              {comments.map((comment) => (
                <motion.div
                  key={comment.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-gray-900/40 border border-gray-800 rounded-xl p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium text-gray-300">
                          {comment.author_name}
                        </span>
                        <span className="text-xs text-gray-600">
                          {formatTime(comment.created_at)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-400 whitespace-pre-wrap">
                        {comment.content}
                      </p>
                    </div>
                    <button
                      onClick={() => handleLike(comment.id)}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-gray-800/60 hover:bg-gray-700/60 border border-gray-700/40 text-gray-400 hover:text-pink-400 transition-colors flex-shrink-0"
                    >
                      <motion.span
                        key={comment.likes}
                        initial={{ scale: 1.3 }}
                        animate={{ scale: 1 }}
                        className="text-sm"
                      >
                        ❤️
                      </motion.span>
                      <span className="text-xs tabular-nums min-w-[1rem]">
                        {comment.likes}
                      </span>
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
