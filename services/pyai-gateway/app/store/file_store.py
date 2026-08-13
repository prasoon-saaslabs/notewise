"""Backward-compatible import path — persistence is SQLite."""

from app.store.sqlite_store import SqliteStore, store

FileStore = SqliteStore

__all__ = ["FileStore", "store"]
