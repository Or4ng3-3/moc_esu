-- MOC 社团恶俗榜 - 数据库建表脚本
-- 请在 Supabase SQL Editor 中执行此脚本

-- 开启 UUID 扩展
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- 表 1: candidates (候选人名单)
-- ============================================================
CREATE TABLE IF NOT EXISTS candidates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    avatar_url TEXT DEFAULT 'https://api.dicebear.com/7.x/bottts/svg?seed=default',
    total_votes INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 表 2: vote_records (投票流水日志)
-- ============================================================
CREATE TABLE IF NOT EXISTS vote_records (
    id BIGSERIAL PRIMARY KEY,
    candidate_id UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
    voted_at DATE DEFAULT CURRENT_DATE,
    vote_count INTEGER DEFAULT 0
);

-- 联合唯一索引，用于 UPSERT 操作
CREATE UNIQUE INDEX IF NOT EXISTS idx_vote_records_candidate_date
    ON vote_records (candidate_id, voted_at);

-- ============================================================
-- 表 3: daily_winners (每日榜首归档表)
-- ============================================================
CREATE TABLE IF NOT EXISTS daily_winners (
    record_date DATE PRIMARY KEY,
    candidate_id UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
    votes INTEGER DEFAULT 0
);

-- ============================================================
-- 函数: 获取近 N 天的每日榜首
-- ============================================================
CREATE OR REPLACE FUNCTION get_daily_winners(days INT DEFAULT 7)
RETURNS TABLE (
    record_date DATE,
    candidate_id UUID,
    name VARCHAR,
    avatar_url TEXT,
    votes INTEGER
) AS $$
BEGIN
    RETURN QUERY
    WITH daily_max AS (
        SELECT
            vr.voted_at,
            vr.candidate_id,
            vr.vote_count,
            ROW_NUMBER() OVER (
                PARTITION BY vr.voted_at
                ORDER BY vr.vote_count DESC
            ) AS rank
        FROM vote_records vr
        WHERE vr.voted_at >= CURRENT_DATE - days
    )
    SELECT
        dm.voted_at::DATE AS record_date,
        dm.candidate_id,
        c.name,
        c.avatar_url,
        dm.vote_count::INTEGER AS votes
    FROM daily_max dm
    JOIN candidates c ON c.id = dm.candidate_id
    WHERE dm.rank = 1
    ORDER BY dm.voted_at DESC;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 插入示例数据 (可选)
-- ============================================================
INSERT INTO candidates (name, avatar_url, total_votes) VALUES
    ('张三', 'https://api.dicebear.com/7.x/bottts/svg?seed=zhangsan', 150),
    ('李四', 'https://api.dicebear.com/7.x/bottts/svg?seed=lisi', 120),
    ('王五', 'https://api.dicebear.com/7.x/bottts/svg?seed=wangwu', 90),
    ('赵六', 'https://api.dicebear.com/7.x/bottts/svg?seed=zhaoliu', 60),
    ('刘七', 'https://api.dicebear.com/7.x/bottts/svg?seed=liuqi', 30)
ON CONFLICT DO NOTHING;
