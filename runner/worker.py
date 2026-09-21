import json
import os
from pathlib import Path
import signal
import subprocess
import sys
import threading


active_process = None
cancelled = False
lock = threading.Lock()
output_lock = threading.Lock()


def emit(payload):
    with output_lock:
        print(json.dumps(payload, ensure_ascii=False), flush=True)


def stop_process():
    global cancelled
    cancelled = True
    with lock:
        process = active_process
    if process is not None and process.poll() is None:
        try:
            os.killpg(process.pid, signal.SIGTERM)
            process.wait(timeout=3)
        except subprocess.TimeoutExpired:
            os.killpg(process.pid, signal.SIGKILL)
            process.wait()
        except ProcessLookupError:
            pass


def run_experiment(request):
    global active_process
    if set(request) not in ({"kind", "preset", "sequenceLength"}, {"kind", "preset", "sequenceLength", "experimentId"}) or request["kind"] != "run":
        raise ValueError("Invalid runner request")
    if request["preset"] not in {"cpu", "cuda"} or request["sequenceLength"] not in {8, 16, 32}:
        raise ValueError("Unsupported experiment preset")
    variables = {
        **os.environ,
        "NANOCHAT_DTYPE": "bfloat16" if request["preset"] == "cuda" else "float32",
        "TORCHDYNAMO_DISABLE": "1",
        "OMP_NUM_THREADS": "4",
        "HF_HUB_OFFLINE": "1",
    }
    experiment = request.get("experimentId", "forward-trace")
    if experiment not in {"forward-trace", "data-trace"} or (experiment == "data-trace" and request["preset"] != "cpu"):
        raise ValueError("Unsupported experiment")
    script = "experiment.py" if experiment == "forward-trace" else "data_experiment.py"
    command = [sys.executable, "-u", str(Path(__file__).with_name(script)), request["preset"], str(request["sequenceLength"])]
    with lock:
        if cancelled:
            return
        active_process = subprocess.Popen(command, env=variables, start_new_session=True)
        process = active_process
    code = process.wait()
    emit({"kind": "exit", "code": code, "cancelled": cancelled})


def diagnose():
    import platform
    import importlib
    import torch

    for dependency in ("rustbpe", "tiktoken", "pyarrow", "requests"):
        importlib.import_module(dependency)

    from experiment import verify_sources

    commit = verify_sources()
    emit({"kind": "diagnostic", "ready": True, "python": platform.python_version(), "torch": torch.__version__, "gpuAvailable": torch.cuda.is_available(), "gpuName": torch.cuda.get_device_name(0) if torch.cuda.is_available() else None, "commit": commit, "message": "实验环境已就绪"})


def supervised_run(request):
    try:
        run_experiment(request)
    except Exception as error:
        emit({"kind": "error", "message": f"{type(error).__name__}: {error}"})
        emit({"kind": "exit", "code": 1, "cancelled": cancelled})


def main():
    signal.signal(signal.SIGTERM, lambda *_args: (stop_process(), sys.exit(143)))
    if "--diagnose" in sys.argv:
        diagnose()
        return
    task = None
    try:
        for line in sys.stdin:
            request = json.loads(line)
            if request.get("kind") == "cancel":
                stop_process()
            elif task is None:
                task = threading.Thread(target=supervised_run, args=(request,), daemon=True)
                task.start()
            else:
                raise ValueError("Only one experiment per worker is allowed")
    finally:
        stop_process()
        if task is not None:
            task.join(timeout=5)


if __name__ == "__main__":
    try:
        main()
    except Exception as error:
        emit({"kind": "error", "message": str(error)})
        sys.exit(1)
