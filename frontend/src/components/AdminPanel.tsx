import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Candidate, SubmissionRequest } from '../types';
import {
  adminVerify, adminCreateCandidate, adminUpdateCandidate, adminDeleteCandidate,
  adminGetSubmissions, adminApproveSubmission, adminRejectSubmission,
} from '../api';

interface AdminPanelProps {
  candidates: Candidate[];
  onUpdate: () => void;
}

export default function AdminPanel({ candidates, onUpdate }: AdminPanelProps) {
  const [token, setToken] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [submissions, setSubmissions] = useState<SubmissionRequest[]>([]);

  // Add form
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState('');
  const [newAvatar, setNewAvatar] = useState('');
  const [newVotes, setNewVotes] = useState(0);

  // Edit form
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editAvatar, setEditAvatar] = useState('');
  const [editVotes, setEditVotes] = useState(0);

  const loadSubmissions = useCallback(async (t: string) => {
    try {
      const data = await adminGetSubmissions(t);
      setSubmissions(data);
    } catch {
      // not critical
    }
  }, []);

  const handleLogin = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await adminVerify(password);
      setToken(res.token);
      loadSubmissions(res.token);
    } catch {
      setError('无权访问');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    setToken(null);
    setPassword('');
    setError('');
    setSubmissions([]);
  };

  const handleApprove = async (id: string) => {
    if (!token) return;
    try {
      await adminApproveSubmission(token, id);
      setSubmissions((prev) => prev.filter((s) => s.id !== id));
      onUpdate(); // refresh candidate list
    } catch (err) {
      console.error('Approve failed:', err);
    }
  };

  const handleReject = async (id: string) => {
    if (!token) return;
    try {
      await adminRejectSubmission(token, id);
      setSubmissions((prev) => prev.filter((s) => s.id !== id));
    } catch (err) {
      console.error('Reject failed:', err);
    }
  };

  const handleAdd = async () => {
    if (!token || !newName.trim()) return;
    try {
      await adminCreateCandidate(token, {
        name: newName.trim(),
        avatar_url: newAvatar.trim() || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(newName.trim())}`,
        total_votes: newVotes,
      });
      setNewName('');
      setNewAvatar('');
      setNewVotes(0);
      setShowAdd(false);
      onUpdate();
    } catch (err) {
      console.error('Failed to create:', err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!token || !confirm('确认删除该候选人？此操作不可撤销！')) return;
    try {
      await adminDeleteCandidate(token, id);
      onUpdate();
    } catch (err) {
      console.error('Failed to delete:', err);
    }
  };

  const handleEdit = (c: Candidate) => {
    setEditingId(c.id);
    setEditName(c.name);
    setEditAvatar(c.avatar_url);
    setEditVotes(c.total_votes);
  };

  const handleSaveEdit = async () => {
    if (!token || !editingId) return;
    try {
      await adminUpdateCandidate(token, editingId, {
        name: editName.trim(),
        avatar_url: editAvatar.trim(),
        total_votes: editVotes,
      });
      setEditingId(null);
      onUpdate();
    } catch (err) {
      console.error('Failed to update:', err);
    }
  };

  // ---- Password Gate ----
  if (!token) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-sm mx-auto mt-10"
      >
        <div className="bg-gray-900/70 border border-gray-700 rounded-2xl p-6 backdrop-blur-sm">
          <h2 className="text-lg font-bold text-gray-200 mb-4 text-center">
            🔐 管理员验证
          </h2>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
            placeholder="请输入管理密码"
            className="w-full px-4 py-2.5 rounded-lg bg-gray-800 border border-gray-600 text-gray-100 placeholder-gray-500 focus:outline-none focus:border-orange-500 transition-colors mb-3"
          />
          {error && (
            <p className="text-red-400 text-sm mb-3 text-center">{error}</p>
          )}
          <button
            onClick={handleLogin}
            disabled={loading || !password}
            className="w-full py-2.5 rounded-lg bg-orange-600 hover:bg-orange-500 disabled:bg-gray-700 disabled:text-gray-500 text-white font-medium transition-colors"
          >
            {loading ? '验证中...' : '验证'}
          </button>
        </div>
      </motion.div>
    );
  }

  // ---- Admin Dashboard ----
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
      {/* Admin Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-200">⚙️ 管理面板</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setShowAdd(!showAdd)}
            className="px-4 py-2 rounded-lg bg-green-700 hover:bg-green-600 text-white text-sm font-medium transition-colors"
          >
            + 添加候选人
          </button>
          <button
            onClick={handleLogout}
            className="px-4 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-300 text-sm transition-colors"
          >
            退出
          </button>
        </div>
      </div>

      {/* Add Form */}
      <AnimatePresence>
        {showAdd && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-gray-800/60 border border-gray-700 rounded-xl p-4 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="姓名"
                  className="px-3 py-2 rounded-lg bg-gray-900 border border-gray-600 text-gray-100 placeholder-gray-500 focus:outline-none focus:border-green-500"
                />
                <input
                  value={newAvatar}
                  onChange={(e) => setNewAvatar(e.target.value)}
                  placeholder="头像 URL (可选)"
                  className="px-3 py-2 rounded-lg bg-gray-900 border border-gray-600 text-gray-100 placeholder-gray-500 focus:outline-none focus:border-green-500"
                />
                <input
                  type="number"
                  value={newVotes}
                  onChange={(e) => setNewVotes(parseInt(e.target.value) || 0)}
                  placeholder="初始票数"
                  className="px-3 py-2 rounded-lg bg-gray-900 border border-gray-600 text-gray-100 placeholder-gray-500 focus:outline-none focus:border-green-500"
                />
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => setShowAdd(false)}
                  className="px-4 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-300 text-sm transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={handleAdd}
                  disabled={!newName.trim()}
                  className="px-4 py-2 rounded-lg bg-green-600 hover:bg-green-500 disabled:bg-gray-700 disabled:text-gray-500 text-white text-sm font-medium transition-colors"
                >
                  确认添加
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Submission Review Section */}
      {submissions.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-base font-bold text-yellow-400 flex items-center gap-2">
            📋 待审批提名 ({submissions.length})
          </h3>
          {submissions.map((s) => (
            <div
              key={s.id}
              className="bg-gray-800/60 border border-yellow-700/30 rounded-xl p-4"
            >
              <div className="flex items-start gap-3">
                {/* Preview avatar */}
                {s.avatar_url && (
                  <img
                    src={s.avatar_url}
                    alt={s.name}
                    className="w-10 h-10 rounded-full border border-gray-600 flex-shrink-0"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-gray-200">{s.name}</span>
                    <span className="text-xs text-gray-500">
                      {new Date(s.created_at).toLocaleDateString('zh-CN')}
                    </span>
                  </div>
                  <p className="text-sm text-gray-400 whitespace-pre-wrap">
                    {s.reason || '无理由'}
                  </p>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <button
                    onClick={() => handleApprove(s.id)}
                    className="px-3 py-1.5 rounded-lg bg-green-700 hover:bg-green-600 text-white text-xs font-medium transition-colors"
                  >
                    ✅ 通过
                  </button>
                  <button
                    onClick={() => handleReject(s.id)}
                    className="px-3 py-1.5 rounded-lg bg-red-700 hover:bg-red-600 text-white text-xs font-medium transition-colors"
                  >
                    ❌ 拒绝
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Candidate Management List */}
      <div className="space-y-2">
        {candidates.map((c) => (
          <div key={c.id} className="bg-gray-800/40 border border-gray-700/50 rounded-xl">
            {editingId === c.id ? (
              // Edit mode
              <div className="p-3 space-y-2">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="px-3 py-1.5 rounded bg-gray-900 border border-gray-600 text-gray-100 text-sm focus:outline-none focus:border-orange-500"
                  />
                  <input
                    value={editAvatar}
                    onChange={(e) => setEditAvatar(e.target.value)}
                    className="px-3 py-1.5 rounded bg-gray-900 border border-gray-600 text-gray-100 text-sm focus:outline-none focus:border-orange-500"
                  />
                  <input
                    type="number"
                    value={editVotes}
                    onChange={(e) => setEditVotes(parseInt(e.target.value) || 0)}
                    className="px-3 py-1.5 rounded bg-gray-900 border border-gray-600 text-gray-100 text-sm focus:outline-none focus:border-orange-500"
                  />
                </div>
                <div className="flex gap-2 justify-end">
                  <button onClick={() => setEditingId(null)} className="px-3 py-1 rounded bg-gray-700 hover:bg-gray-600 text-gray-300 text-xs transition-colors">取消</button>
                  <button onClick={handleSaveEdit} className="px-3 py-1 rounded bg-orange-600 hover:bg-orange-500 text-white text-xs transition-colors">保存</button>
                </div>
              </div>
            ) : (
              // Display mode
              <div className="flex items-center gap-3 p-3">
                <img
                  src={c.avatar_url}
                  alt={c.name}
                  className="w-8 h-8 rounded-full border border-gray-600"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(c.name)}`;
                  }}
                />
                <span className="flex-1 text-sm text-gray-200 truncate">{c.name}</span>
                <span className="text-sm font-bold text-orange-400">{c.total_votes}票</span>
                <button onClick={() => handleEdit(c)} className="px-3 py-1 rounded bg-blue-700 hover:bg-blue-600 text-white text-xs transition-colors">编辑</button>
                <button onClick={() => handleDelete(c.id)} className="px-3 py-1 rounded bg-red-700 hover:bg-red-600 text-white text-xs transition-colors">删除</button>
              </div>
            )}
          </div>
        ))}
      </div>
    </motion.div>
  );
}
