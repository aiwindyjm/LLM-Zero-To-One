import json
import os
from pathlib import Path
import sys


environment = Path.home() / ".local/share/llm-zero-to-one/venv/bin/python"
if not environment.exists():
    print(json.dumps({"kind": "error", "message": "实验环境尚未准备。请先运行 pnpm experiment:setup。"}, ensure_ascii=False), flush=True)
    sys.exit(2)

worker = Path(__file__).resolve().with_name("worker.py")
os.execv(str(environment), [str(environment), "-u", str(worker), *sys.argv[1:]])

