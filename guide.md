---

# MOC 社团恶俗榜（Leaderboard）工程构建指南

## 1. 项目概述与核心逻辑
*   **项目名称**：MOC 社团恶俗榜
*   **用户权限**：普通用户无需登录即可访问、查看和无限次投票。管理员（Admin）需凭简单凭证管理名单。
*   **核心玩法**：
    *   用户点击某位成员的卡片，即时为该成员增加票数。
    *   支持实时排序：票数多的人在前端列表实时、平滑地向上移动。
    *   记录历史：系统需保存并展示最近 7 天内每天的榜首（第一名）数据。
    *   单条格式：名次 - 头像 - 名字 - 当前票数。
    排行榜永远不会自动清零！每天的数据持续累加！

---

## 2. 技术栈规格 (Tech Stack)

- **前端**：React (Vite 模板), TypeScript, Tailwind CSS, Framer Motion (用于列表重排与点击动画)
- **后端**：FastAPI (Python 3.10+),
- **数据库 & 服务**：Supabase (PostgreSQL, 数据库存储与实时监听能力)

---

## 3. 数据库设计 (Supabase / PostgreSQL)

请在 Supabase 中创建以下三张表，并建立必要的外键约束：

### 表 1：`candidates` (候选人名单)

| 字段名        | 类型               | 说明                     |
| :------------ | :----------------- | :----------------------- |
| `id`          | UUID (Primary Key) | 默认 `gen_random_uuid()` |
| `name`        | VARCHAR            | 候选人姓名               |
| `avatar_url`  | TEXT               | 头像 URL                 |
| `total_votes` | INTEGER            | 总票数（默认 0）         |
| `created_at`  | TIMESTAMPTZ        | 创建时间                 |

### 表 2：`vote_records` (投票流水日志 - 用于统计每日榜首)

| 字段名         | 类型                 | 说明                                      |
| :------------- | :------------------- | :---------------------------------------- |
| `id`           | BIGINT (Primary Key) | 自增 ID                                   |
| `candidate_id` | UUID (Foreign Key)   | 关联 `candidates.id`                      |
| `voted_at`     | DATE                 | 投票日期（默认 `CURRENT_DATE`），用于统计 |
| `vote_count`   | INTEGER              | 该候选人当日票数累加                      |

_(注：为提高写入性能，建议在 `(candidate_id, voted_at)` 上建立联合唯一索引，投票时执行 UPSERT 操作：`vote_count = vote_count + 1`)_

### 表 3：`daily_winners` (每日榜首归档表)

_用于记录最近 7 天的每日最终获胜者，可由后端定时任务写入，或通过视图动态计算。_
| 字段名 | 类型 | 说明 |
| :--- | :--- | :--- |
| `record_date`| DATE (Primary Key) | 归档日期 |
| `candidate_id`| UUID (Foreign Key) | 获胜者 ID |
| `votes` | INTEGER | 当日票数 |

---

## 4. 后端接口设计 (FastAPI)

后端需提供以下 API 路由：

### 4.1 用户端接口 (Public)

- `GET /api/candidates`
  - **功能**：获取所有候选人列表，按 `total_votes` 降序排列。
- `POST /api/vote/{candidate_id}`
  - **功能**：对指定候选人进行投票。
  - **内部逻辑**：
    1. 更新 `candidates` 表中的 `total_votes = total_votes + 1`。
    2. 并在 `vote_records` 中对 `vote_count` 进行加 1 的 UPSERT 操作。
- `GET /api/history/winners`
  - **功能**：获取最近 7 天每天的榜首数据（包括日期、名字、头像、当天得票数）。

### 4.2 管理员端接口 (Protected)

- `POST /api/admin/candidates` (新增候选人)
- `DELETE /api/admin/candidates/{id}` (删除候选人)
- `PUT /api/admin/candidates/{id}` (更新候选人信息/重置票数)
  为了安全性与界面的整洁，管理员功能需采用隐藏 URL 方案，不暴露在主界面中。

1. **隐藏路由**：
   - 严禁在主页（`/`）中放置任何前往管理页面的链接或按钮。
   - 配置专用路由 `/moc-nyysesbbs`指向管理员面板。
2. **访问看门狗 (Access Gate)**：
   - 进入 `/moc-nyysesbbs` 后，默认不显示数据管理界面，只显示一个密码输入框。
   - 输入密码并提交后，调用后端 `/api/admin/verify` 接口。
   - 验证成功后，将 Token 存入内存，并解锁管理面板（展示“添加候选人”、“删除”、“自定义票数”等按钮）。
   - 验证失败提示“无权访问”。

---

## 5. 前端架构与交互要求 (React)

### 5.1 页面布局布局 (Layout)

- **Header**：MOC 社团恶俗榜（醒目标题，带有一点幽默或恶搞风格）。
- **主面板（中）**：排行榜列表（Leaderboard）。
  - 格式：`[ 名次 ]  [ 圆形头像 ]  [ 名字 ]  [ 票数数值 ]`。（点击卡片就能为相应的人投票！不要专门搞一个投票按钮）
- **侧边栏（右/下）**：最近 7 天历史榜首看板。
  - 展示最近 7 天每天的冠军头像和姓名。

### 5.2 核心动画效果要求 (Using Framer Motion)

- **列表平滑重排 (Layout Reordering)**：
  - 使用 Framer Motion 的 `<motion.div layout>` 包裹每一个列表项。
  - 当某人票数增加导致名次变化时，列表项应当平滑地向上或向下滑动，避免生硬的瞬间位移。
- **投票点击动效 (Click Feedback)**：
  - **卡片缩放**：点击投票时，整行卡片或投票按钮产生轻微的按下缩放反馈（如 `whileTap={{ scale: 0.95 }}`）。
  - **粒子漂浮 (Floating +1)**：点击时，在鼠标点击位置或头像上方动态生成一个淡出的 `+1` 漂浮动画，向上移动 30px 并逐渐透明。

### 5.3 实时性支持

- 前端通过定时轮询（如每 2-3 秒请求一次 `GET /api/candidates`）或通过 Supabase Realtime 订阅 `candidates` 表的变化，以确保多端同时点击时，排行榜票数能够近乎实时地更新并触发重排。

---

## 6. 开发实施步骤说明（供 Claude Code 执行）

请按照以下步骤逐步完成开发，并在每一步完成后进行本地测试：

1.  **第一步：初始化 Supabase 数据库**
    - 使用 SQL Editor 创建上文定义的 3 张表。
    - 编写一条 PostgreSQL 函数或触发器，用于在每天结束时计算当日得票最多的人，并存入 `daily_winners`（或在查询历史时用 SQL 窗口函数动态计算前 7 天每日最大值）。
2.  **第二步：构建 FastAPI 后端**
    - 配置 CORS 以允许 React 对应端口的跨域访问。
    - 使用 `supabase-py` 客户端连接数据库。
    - 编写路由并测试 `POST /api/vote/{candidate_id}` 接口的并发更新安全性。
3.  **第三步：构建 React 基础前端**
    - 使用 Vite 创建 TypeScript 模板。
    - 使用 Tailwind CSS 搭建基础的榜单结构。
4.  **第四步：实现动画与实时更新**
    - 引入 `framer-motion` 实现列表的位置平滑过渡。
    - 编写 `+1` 粒子漂浮动画组件。
5.  **第五步：实现简易管理员界面**
    - 在前端提供一个入口，输入约定好的 Admin Token 后，可展示增删候选人的表单。
