import argparse
import sqlite3
from datetime import datetime, timezone
from pathlib import Path


def backup(source: Path, destination: Path):
    if not source.is_file():
        raise ValueError(f"Database does not exist: {source}")
    destination.parent.mkdir(parents=True, exist_ok=True)
    with destination.open("xb"):
        pass
    try:
        with sqlite3.connect(source.resolve().as_uri() + "?mode=ro", uri=True) as original:
            with sqlite3.connect(destination) as snapshot:
                original.backup(snapshot)
                if snapshot.execute("PRAGMA quick_check").fetchone()[0] != "ok":
                    raise ValueError("Database integrity check failed")
    except Exception:
        destination.unlink(missing_ok=True)
        raise


def restore(source: Path, destination: Path):
    with sqlite3.connect(source.resolve().as_uri() + "?mode=ro", uri=True) as snapshot:
        if snapshot.execute("PRAGMA quick_check").fetchone()[0] != "ok":
            raise ValueError("Invalid backup")
        tables = {row[0] for row in snapshot.execute("SELECT name FROM sqlite_master WHERE type='table'")}
        if not {"progress", "experiment_runs", "assessment_attempts"}.issubset(tables):
            raise ValueError("Not a learning-platform database")
        if destination.exists():
            stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%S%fZ")
            preserved = destination.with_name(f"learning-before-import-{stamp}.db")
            backup(destination, preserved)
            print(f"Previous database preserved: {preserved}")
        destination.parent.mkdir(parents=True, exist_ok=True)
        with sqlite3.connect(destination) as target:
            snapshot.backup(target)


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("operation", choices=["backup", "import"])
    parser.add_argument("source", type=Path)
    parser.add_argument("destination", type=Path)
    arguments = parser.parse_args()
    (backup if arguments.operation == "backup" else restore)(arguments.source, arguments.destination)
    print(f"Completed {arguments.operation}: {arguments.destination}")
