import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
import worker


def test_invalid_data_device_reports_failure_without_spawning(monkeypatch):
    events = []
    monkeypatch.setattr(worker, "emit", events.append)
    monkeypatch.setattr(worker.subprocess, "Popen", lambda *args, **kwargs: (_ for _ in ()).throw(AssertionError("must not spawn")))
    worker.supervised_run({"kind": "run", "experimentId": "data-trace", "preset": "cuda", "sequenceLength": 8})
    assert events[0]["kind"] == "error"
    assert events[0]["message"] == "ValueError: Unsupported experiment"
    assert events[1]["kind"] == "exit"
    assert events[1]["code"] == 1
