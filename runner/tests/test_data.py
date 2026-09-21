import sqlite3
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from data import backup, restore


def test_backup_live_wal_and_preserve_existing_import(tmp_path):
    source = tmp_path / "source.db"
    with sqlite3.connect(source) as database:
        database.execute("PRAGMA journal_mode=WAL")
        for table in ["progress", "experiment_runs", "assessment_attempts"]:
            database.execute(f"CREATE TABLE {table} (value TEXT)")
        database.execute("INSERT INTO progress VALUES ('embedding')")
        database.commit()
        snapshot = tmp_path / "backup.db"
        backup(source, snapshot)
    target = tmp_path / "learning.db"
    restore(snapshot, target)
    restore(snapshot, target)
    with sqlite3.connect(target) as database:
        assert database.execute("SELECT value FROM progress").fetchone()[0] == "embedding"
    assert len(list(tmp_path.glob("learning-before-import-*.db"))) == 1
    with pytest.raises(FileExistsError):
        backup(source, snapshot)


def test_import_rejects_unrelated_database(tmp_path):
    source = tmp_path / "unrelated.db"
    sqlite3.connect(source).close()
    with pytest.raises(ValueError, match="Not a learning-platform"):
        restore(source, tmp_path / "learning.db")
