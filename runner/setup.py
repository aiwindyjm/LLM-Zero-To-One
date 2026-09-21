import os
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile


def main():
    project = Path(__file__).resolve().parent
    uv = shutil.which("uv") or str(Path.home() / ".local/bin/uv")
    if not Path(uv).exists():
        print("Installing uv from https://astral.sh/uv/install.sh", flush=True)
        with tempfile.TemporaryDirectory(prefix="llm-uv-") as temporary:
            installer = Path(temporary) / "install.sh"
            subprocess.run(["curl", "--fail", "--location", "--retry", "3", "--output", str(installer), "https://astral.sh/uv/install.sh"], check=True)
            subprocess.run(["sh", str(installer)], check=True)
    environment = Path.home() / ".local/share/llm-zero-to-one/venv"
    variables = {**os.environ, "UV_PROJECT_ENVIRONMENT": str(environment)}
    profile = "cpu" if "--cpu" in sys.argv else "gpu"
    command = [uv, "sync", "--project", str(project), "--python", "3.12", "--extra", profile]
    if "--refresh-lock" in sys.argv:
        subprocess.run([uv, "lock", "--upgrade", "--project", str(project), "--python", "3.12"], env=variables, check=True)
    if (project / "uv.lock").exists():
        command.append("--frozen")
    subprocess.run(command, env=variables, check=True)
    print(f"Runner ready: {environment}/bin/python ({profile})", flush=True)


if __name__ == "__main__":
    main()
