import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { submitNomination } from '../api';

interface NominationModalProps {
  open: boolean;
  onClose: () => void;
}

export default function NominationModal({ open, onClose }: NominationModalProps) {
  const [name, setName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!name.trim()) return;
    setSubmitting(true);
    setError('');
    try {
      await submitNomination(name.trim(), avatarUrl.trim(), reason.trim());
      setDone(true);
      // Auto-close after 2s
      setTimeout(() => {
        setDone(false);
        setName('');
        setAvatarUrl('');
        setReason('');
        onClose();
      }, 2000);
    } catch {
      setError('提交失败，请稍后再试');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!submitting) {
      setDone(false);
      setName('');
      setAvatarUrl('');
      setReason('');
      setError('');
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
            onClick={handleClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-sm shadow-2xl">
              {done ? (
                // Success state
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-center py-4"
                >
                  <div className="text-4xl mb-3">✅</div>
                  <h3 className="text-lg font-bold text-gray-200 mb-1">已提交</h3>
                  <p className="text-sm text-gray-400">等待管理员审批后将加入榜单</p>
                </motion.div>
              ) : (
                <>
                  {/* Header */}
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-gray-200">📝 提名新人</h3>
                    <button
                      onClick={handleClose}
                      className="text-gray-500 hover:text-gray-300 transition-colors text-xl leading-none"
                    >
                      ×
                    </button>
                  </div>

                  {/* Form */}
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">姓名 *</label>
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                        placeholder="被提名人的姓名"
                        autoFocus
                        className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-600 text-gray-100 placeholder-gray-500 focus:outline-none focus:border-orange-500 transition-colors"
                      />
                    </div>

                    <div>
                      <label className="block text-xs text-gray-500 mb-1">
                        头像 URL <span className="text-gray-600">(可选)</span>
                      </label>
                      <input
                        type="text"
                        value={avatarUrl}
                        onChange={(e) => setAvatarUrl(e.target.value)}
                        placeholder="留空将自动生成头像"
                        className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-600 text-gray-100 placeholder-gray-500 focus:outline-none focus:border-orange-500 transition-colors"
                      />
                    </div>

                    <div>
                      <label className="block text-xs text-gray-500 mb-1">
                        提名理由 *
                      </label>
                      <textarea
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        placeholder="为什么应该把 TA 加入榜单？"
                        rows={3}
                        className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-600 text-gray-100 placeholder-gray-500 focus:outline-none focus:border-orange-500 transition-colors resize-none"
                      />
                    </div>

                    {error && (
                      <p className="text-red-400 text-sm text-center">{error}</p>
                    )}

                    <button
                      onClick={handleSubmit}
                      disabled={!name.trim() || !reason.trim() || submitting}
                      className="w-full py-2.5 rounded-lg bg-orange-600 hover:bg-orange-500 disabled:bg-gray-700 disabled:text-gray-500 text-white font-medium transition-colors"
                    >
                      {submitting ? '提交中...' : '提交提名'}
                    </button>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
