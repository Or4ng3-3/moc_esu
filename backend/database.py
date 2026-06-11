import os
from contextlib import contextmanager
from dotenv import load_dotenv
import psycopg2
import psycopg2.pool

load_dotenv()

DATABASE_URL: str = os.environ.get("SUPABASE_URL", "")
if not DATABASE_URL:
    raise RuntimeError("SUPABASE_URL (PostgreSQL connection string) must be set in .env")

# Create a connection pool
pool = psycopg2.pool.ThreadedConnectionPool(
    minconn=2,
    maxconn=10,
    dsn=DATABASE_URL,
)


@contextmanager
def get_db():
    """Context manager for database connections."""
    conn = pool.getconn()
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        pool.putconn(conn)


def fetch_all(query: str, params: tuple = ()):
    """Execute a query and return all results as a list of dicts."""
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute(query, params)
            columns = [desc[0] for desc in cur.description] if cur.description else []
            rows = cur.fetchall()
            return [dict(zip(columns, row)) for row in rows]


def fetch_one(query: str, params: tuple = ()):
    """Execute a query and return a single result as a dict."""
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute(query, params)
            columns = [desc[0] for desc in cur.description] if cur.description else []
            row = cur.fetchone()
            return dict(zip(columns, row)) if row else None


def execute(query: str, params: tuple = ()):
    """Execute a write query (INSERT/UPDATE/DELETE)."""
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute(query, params)
            return cur.rowcount
