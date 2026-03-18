"""In-memory session storage and TTL management."""

import uuid
import time
import asyncio
from typing import Optional

# Global session store: {session_id: {data: [...], created_at: timestamp}}
_store: dict[str, dict] = {}


def create_session(data: list[dict]) -> str:
    """Create a new session with data. Returns session_id."""
    session_id = str(uuid.uuid4())
    _store[session_id] = {
        'data': data,
        'created_at': time.time(),
    }
    return session_id


def get_session(session_id: str) -> Optional[list[dict]]:
    """Retrieve session data by id. Returns None if not found."""
    entry = _store.get(session_id)
    if entry is None:
        return None
    return entry['data']


def delete_session(session_id: str) -> bool:
    """Delete a session. Returns True if deleted, False if not found."""
    return _store.pop(session_id, None) is not None


def session_exists(session_id: str) -> bool:
    """Check if a session exists."""
    return session_id in _store


async def cleanup_expired_sessions(ttl_seconds: int = 3600) -> int:
    """
    Remove sessions older than ttl_seconds.
    Returns count of deleted sessions.
    """
    now = time.time()
    expired_ids = [
        sid for sid, entry in _store.items()
        if now - entry['created_at'] > ttl_seconds
    ]

    for sid in expired_ids:
        del _store[sid]

    return len(expired_ids)


async def cleanup_loop(ttl_seconds: int = 3600, check_interval_seconds: int = 300):
    """
    Background task to periodically clean up expired sessions.
    Runs until task is cancelled.
    """
    while True:
        try:
            await asyncio.sleep(check_interval_seconds)
            count = await cleanup_expired_sessions(ttl_seconds)
            if count > 0:
                print(f"Cleaned up {count} expired sessions")
        except asyncio.CancelledError:
            break
        except Exception as e:
            print(f"Error in cleanup loop: {e}")


def get_session_count() -> int:
    """Get current number of active sessions."""
    return len(_store)
