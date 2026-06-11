import { useState, useEffect, useCallback, useRef } from "react";
import Leaderboard from "./components/Leaderboard";
import HistorySidebar from "./components/HistorySidebar";
import AdminPanel from "./components/AdminPanel";
import type { Candidate } from "./types";
import { fetchCandidates, batchVote } from "./api";

function App() {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdmin, setShowAdmin] = useState(false);

  // Vote buffer: accumulate clicks, flush as batch every 1s
  const voteBufferRef = useRef<Map<string, number>>(new Map());
  const flushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingCountRef = useRef(0); // total buffered votes not yet flushed

  // Check if we're on the admin route
  useEffect(() => {
    if (window.location.pathname === "/moc-nyysesbbs") {
      setShowAdmin(true);
    }
  }, []);

  const loadCandidates = useCallback(async () => {
    try {
      const data = await fetchCandidates();
      // Only apply server data if no votes are buffered/unflushed
      // Prevents polling from overwriting optimistic local state
      if (pendingCountRef.current === 0) {
        setCandidates(data);
      }
    } catch (err) {
      console.error("Failed to load candidates:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Flush buffered votes to server
  const flushVotes = useCallback(async () => {
    const buffer = new Map(voteBufferRef.current);
    if (buffer.size === 0) return;

    voteBufferRef.current.clear();
    flushTimerRef.current = null;

    const votes: Record<string, number> = Object.fromEntries(buffer);
    const totalInBatch = Object.values(votes).reduce((a, b) => a + b, 0);

    try {
      await batchVote(votes);
    } catch (err) {
      console.error("Batch vote failed, rolling back:", err);
      // Rollback all buffered votes
      setCandidates((prev) => {
        const rolled = prev.map((c) => {
          const count = votes[c.id] || 0;
          return count > 0
            ? { ...c, total_votes: Math.max(0, c.total_votes - count) }
            : c;
        });
        return rolled.sort((a, b) => b.total_votes - a.total_votes);
      });
    } finally {
      pendingCountRef.current -= totalInBatch;
    }
  }, []);

  // Optimistic vote with batching: UI instant, buffer clicks, flush batch every 1s
  const optimisticVote = useCallback(
    (candidateId: string) => {
      // 1. Immediately increment votes and re-sort locally (instant feedback)
      setCandidates((prev) => {
        const updated = prev.map((c) =>
          c.id === candidateId ? { ...c, total_votes: c.total_votes + 1 } : c,
        );
        return updated.sort((a, b) => b.total_votes - a.total_votes);
      });

      // 2. Buffer the vote
      const current = voteBufferRef.current.get(candidateId) || 0;
      voteBufferRef.current.set(candidateId, current + 1);
      pendingCountRef.current++;

      // 3. Schedule flush — reset timer on each click to batch rapid clicks together
      if (flushTimerRef.current !== null) {
        clearTimeout(flushTimerRef.current);
      }
      flushTimerRef.current = setTimeout(flushVotes, 1000);
    },
    [flushVotes],
  );

  // Initial load
  useEffect(() => {
    loadCandidates();
  }, [loadCandidates]);

  // Poll every 2.5 seconds for reconciliation (other clients' votes)
  useEffect(() => {
    const interval = setInterval(() => {
      loadCandidates();
    }, 2500);
    return () => clearInterval(interval);
  }, [loadCandidates]);

  // ---- Admin Route ----
  if (showAdmin) {
    return (
      <div className="min-h-screen bg-gray-950 text-white">
        <div className="max-w-3xl mx-auto px-4 py-8">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-xl font-bold text-gray-200">
              ⚙️ MOC 恶俗榜 - 管理
            </h1>
            <a
              href="/"
              className="px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm transition-colors"
            >
              ← 返回排行榜
            </a>
          </div>
          <AdminPanel candidates={candidates} onUpdate={loadCandidates} />
        </div>
      </div>
    );
  }

  // ---- Public Leaderboard Route ----
  return (
    <div className="min-h-screen bg-gray-950">
      {/* Background decoration */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-orange-600/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-yellow-600/10 rounded-full blur-3xl" />
      </div>

      <div className="relative max-w-4xl mx-auto px-4 py-6 sm:py-10">
        {/* Header */}
        <header className="text-center mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-4xl font-extrabold bg-gradient-to-r from-orange-400 via-red-400 to-yellow-400 text-transparent bg-clip-text">
            🔥 MOC 恶俗榜 🔥
          </h1>
          <p className="text-gray-500 text-xs sm:text-sm mt-2">
            点击卡片即可投票 · 排行榜实时更新 · 票多者居上
          </p>
        </header>

        {/* Main Content: Leaderboard + Sidebar */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          {/* Leaderboard */}
          <div className="lg:col-span-2">
            {loading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <div
                    key={i}
                    className="bg-gray-800/30 border border-gray-800 rounded-xl p-4 animate-pulse"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-4 bg-gray-700 rounded" />
                      <div className="w-10 h-10 rounded-full bg-gray-700" />
                      <div className="flex-1 h-4 bg-gray-700 rounded" />
                      <div className="w-16 h-6 bg-gray-700 rounded" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <Leaderboard candidates={candidates} onVote={optimisticVote} />
            )}
          </div>

          {/* Sidebar: History + no admin link */}
          <div className="space-y-4">
            <HistorySidebar />

            {/* Fun info card */}
            <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-4 backdrop-blur-sm">
              <h3 className="text-sm font-bold text-gray-400 mb-2">
                📋 玩法说明
              </h3>
              <ul className="text-xs text-gray-500 space-y-1">
                <li>👆 点击任意卡片即为该成员投票</li>
                <li>📊 票数实时更新，排名自动变化</li>
                <li>🏆 右侧展示近 7 天榜首</li>
                <li>🔥 排行榜永不自动清零</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="text-center mt-8 text-xs text-gray-600">
          MOC 社团恶俗榜 · 仅供娱乐
        </footer>
      </div>
    </div>
  );
}

export default App;
