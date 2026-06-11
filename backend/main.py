import os
from datetime import date, timedelta
from typing import Optional
from fastapi import FastAPI, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
from database import fetch_all, fetch_one, execute

load_dotenv()

ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "mocadmin123")

app = FastAPI(title="MOC 社团恶俗榜 API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============ Pydantic Models ============

class CandidateCreate(BaseModel):
    name: str
    avatar_url: str = "https://api.dicebear.com/7.x/bottts/svg?seed=default"
    total_votes: int = 0


class CandidateUpdate(BaseModel):
    name: Optional[str] = None
    avatar_url: Optional[str] = None
    total_votes: Optional[int] = None


class BatchVote(BaseModel):
    votes: dict[str, int]  # {candidate_id: count}


class AdminVerify(BaseModel):
    password: str


# ============ Public API ============

@app.get("/api/candidates")
async def get_candidates():
    """Get all candidates sorted by total_votes descending."""
    rows = fetch_all(
        "SELECT id, name, avatar_url, total_votes, created_at FROM candidates "
        "ORDER BY total_votes DESC"
    )
    return rows


@app.post("/api/vote/batch")
async def batch_vote(body: BatchVote):
    """Batch vote: accept {candidate_id: count} pairs, write atomically in one call.

    MUST be defined before /api/vote/{candidate_id} so FastAPI matches the
    literal 'batch' path before treating it as a candidate_id parameter."""
    today = date.today()

    for candidate_id, count in body.votes.items():
        if count <= 0:
            continue

        # Atomic increment for each candidate
        execute(
            "UPDATE candidates SET total_votes = total_votes + %s WHERE id = %s",
            (count, candidate_id),
        )

        # Atomic UPSERT for daily log
        execute(
            "INSERT INTO vote_records (candidate_id, voted_at, vote_count) "
            "VALUES (%s, %s, %s) "
            "ON CONFLICT (candidate_id, voted_at) "
            "DO UPDATE SET vote_count = vote_records.vote_count + %s",
            (candidate_id, today, count, count),
        )

    return {"success": True}


@app.post("/api/vote/{candidate_id}")
async def vote_candidate(candidate_id: str):
    """Vote for a candidate (single). Atomic increment, no read-then-write."""
    today = date.today()

    # Atomic UPDATE — PostgreSQL row-level lock guarantees correctness under concurrency
    rows = execute(
        "UPDATE candidates SET total_votes = total_votes + 1 WHERE id = %s",
        (candidate_id,),
    )
    if rows == 0:
        raise HTTPException(status_code=404, detail="Candidate not found")

    # Atomic UPSERT for daily vote log
    execute(
        "INSERT INTO vote_records (candidate_id, voted_at, vote_count) "
        "VALUES (%s, %s, 1) "
        "ON CONFLICT (candidate_id, voted_at) "
        "DO UPDATE SET vote_count = vote_records.vote_count + 1",
        (candidate_id, today),
    )

    # Return updated total
    updated = fetch_one(
        "SELECT total_votes FROM candidates WHERE id = %s",
        (candidate_id,),
    )
    return {"success": True, "total_votes": updated["total_votes"] if updated else 0}


@app.get("/api/history/winners")
async def get_history_winners():
    """Get last 7 days daily winners with candidate details."""
    rows = fetch_all(
        "SELECT * FROM get_daily_winners(7)"
    )
    return rows


# ============ Admin API ============

@app.post("/api/admin/verify")
async def admin_verify(body: AdminVerify):
    """Verify admin password. Returns a simple token on success."""
    if body.password == ADMIN_PASSWORD:
        return {"success": True, "token": "moc-admin-token-2024"}
    raise HTTPException(status_code=403, detail="无权访问")


def _check_admin(x_admin_token: str | None):
    if x_admin_token != "moc-admin-token-2024":
        raise HTTPException(status_code=403, detail="无权访问")


@app.post("/api/admin/candidates")
async def admin_create_candidate(body: CandidateCreate, x_admin_token: str = Header(None)):
    """Create a new candidate (admin only)."""
    _check_admin(x_admin_token)
    row = fetch_one(
        "INSERT INTO candidates (name, avatar_url, total_votes) "
        "VALUES (%s, %s, %s) "
        "RETURNING id, name, avatar_url, total_votes, created_at",
        (body.name, body.avatar_url, body.total_votes),
    )
    return row


@app.delete("/api/admin/candidates/{candidate_id}")
async def admin_delete_candidate(candidate_id: str, x_admin_token: str = Header(None)):
    """Delete a candidate (admin only)."""
    _check_admin(x_admin_token)
    execute("DELETE FROM vote_records WHERE candidate_id = %s", (candidate_id,))
    execute("DELETE FROM candidates WHERE id = %s", (candidate_id,))
    return {"success": True}


@app.put("/api/admin/candidates/{candidate_id}")
async def admin_update_candidate(candidate_id: str, body: CandidateUpdate, x_admin_token: str = Header(None)):
    """Update candidate info or reset votes (admin only)."""
    _check_admin(x_admin_token)
    set_clauses = []
    params = []

    if body.name is not None:
        set_clauses.append("name = %s")
        params.append(body.name)
    if body.avatar_url is not None:
        set_clauses.append("avatar_url = %s")
        params.append(body.avatar_url)
    if body.total_votes is not None:
        set_clauses.append("total_votes = %s")
        params.append(body.total_votes)

    if not set_clauses:
        raise HTTPException(status_code=400, detail="No fields to update")

    params.append(candidate_id)
    row = fetch_one(
        f"UPDATE candidates SET {', '.join(set_clauses)} WHERE id = %s "
        f"RETURNING id, name, avatar_url, total_votes, created_at",
        tuple(params),
    )
    return row if row else {}


@app.get("/api/admin/candidates")
async def admin_get_all_candidates(x_admin_token: str = Header(None)):
    """Get all candidates for admin panel management."""
    _check_admin(x_admin_token)
    rows = fetch_all(
        "SELECT id, name, avatar_url, total_votes, created_at FROM candidates "
        "ORDER BY total_votes DESC"
    )
    return rows


if __name__ == "__main__":
    import uvicorn
    from database import pool
    try:
        uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
    finally:
        pool.closeall()
