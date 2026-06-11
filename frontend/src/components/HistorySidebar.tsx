import { useEffect, useState } from 'react';
import type { DailyWinner } from '../types';
import { fetchHistoryWinners } from '../api';

export default function HistorySidebar() {
  const [winners, setWinners] = useState<DailyWinner[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      const data = await fetchHistoryWinners();
      setWinners(data);
    } catch (err) {
      console.error('Failed to load history:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return '今天';
    if (days === 1) return '昨天';
    if (days === 2) return '前天';
    return `${d.getMonth() + 1}/${d.getDate()}`;
  };

  return (
    <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-4 sm:p-5 backdrop-blur-sm">
      <h2 className="text-base sm:text-lg font-bold text-gray-200 mb-4 flex items-center gap-2">
        <span>🏆</span> 近 7 天榜首
      </h2>

      {loading ? (
        <div className="space-y-3">
          {[...Array(7)].map((_, i) => (
            <div key={i} className="flex items-center gap-3 animate-pulse">
              <div className="w-8 h-8 rounded-full bg-gray-700" />
              <div className="flex-1 h-4 bg-gray-700 rounded" />
            </div>
          ))}
        </div>
      ) : winners.length === 0 ? (
        <p className="text-gray-500 text-sm">暂无历史数据</p>
      ) : (
        <div className="space-y-3">
          {winners.map((winner, index) => (
            <div
              key={winner.record_date}
              className="flex items-center gap-3 p-2 rounded-lg bg-gray-800/40 hover:bg-gray-800/60 transition-colors"
            >
              <span className="text-xs text-gray-500 w-10 flex-shrink-0">
                {formatDate(winner.record_date)}
              </span>
              <img
                src={winner.avatar_url}
                alt={winner.name}
                className="w-8 h-8 rounded-full border border-gray-600 flex-shrink-0"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(winner.name)}`;
                }}
              />
              <span className="text-sm text-gray-200 truncate flex-1">
                {winner.name}
              </span>
              <span className="text-xs font-bold text-orange-400 flex-shrink-0">
                {winner.votes}票
              </span>
              {index === 0 && <span className="text-xs">👑</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
