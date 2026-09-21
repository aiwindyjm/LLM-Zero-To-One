import contextlib
import hashlib
import json
from pathlib import Path
import platform
import sys
import time


UPSTREAM_SHA = "92d63d4e8bb4df75c3b71618f31ddde2378b2bcd"


def emit(kind, **payload):
    print(json.dumps({"kind": kind, **payload}, ensure_ascii=False), flush=True)


def verify_sources():
    root = Path(__file__).resolve().parent.parent
    manifest = json.loads((root / "data/upstream/manifest.json").read_text())
    if manifest["commit"] != UPSTREAM_SHA:
        raise ValueError("Upstream commit mismatch")
    for source in manifest["files"]:
        contents = (root / "data/upstream/nanochat" / source["path"]).read_bytes()
        if hashlib.sha256(contents).hexdigest() != source["sha256"]:
            raise ValueError(f"Source checksum mismatch: {source['path']}")
    return manifest["commit"]


def execute(preset, sequence_length):
    commit = verify_sources()
    sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "data/upstream/nanochat"))
    import torch
    from nanochat.gpt import GPT, GPTConfig

    if preset not in {"cpu", "cuda"} or sequence_length not in {8, 16, 32}:
        raise ValueError("Unsupported preset")
    if preset == "cuda" and not torch.cuda.is_available():
        raise RuntimeError("CUDA 不可用，请检查 WSL GPU 支持或选择 CPU。")
    torch.set_num_threads(4)
    torch.manual_seed(42)
    if preset == "cuda":
        torch.cuda.manual_seed_all(42)
        torch.cuda.reset_peak_memory_stats()
    started = time.perf_counter()
    config = GPTConfig(sequence_len=64, vocab_size=256, n_layer=2, n_head=4, n_kv_head=4, n_embd=128, window_pattern="L")
    with torch.device("meta"):
        model = GPT(config)
    model.to_empty(device=preset)
    model.init_weights()
    model.eval()
    shapes = {}

    def capture(name):
        def hook(_module, _inputs, output):
            shapes[name] = list(output.shape)
        return hook

    handles = [model.transformer.wte.register_forward_hook(capture("embedding"))]
    for index, block in enumerate(model.transformer.h):
        handles.append(block.register_forward_hook(capture(f"block_{index}")))
    tokens = torch.arange(2 * sequence_length, device=preset, dtype=torch.long).reshape(2, sequence_length) % config.vocab_size
    shapes["input"] = list(tokens.shape)
    with torch.inference_mode():
        logits = model(tokens)
        last_position = logits[:, -1, :]
        probabilities = torch.softmax(last_position, dim=-1)
        next_tokens = torch.argmax(last_position, dim=-1)
    shapes["logits"] = list(logits.shape)
    shapes["last_position"] = list(last_position.shape)
    shapes["next_token"] = list(next_tokens.shape)
    for handle in handles:
        handle.remove()
    if preset == "cuda":
        torch.cuda.synchronize()
    if shapes["logits"] != [2, sequence_length, 256]:
        raise AssertionError("Unexpected logits shape")
    if not torch.allclose(probabilities.sum(-1), torch.ones(2, device=preset), atol=1e-5):
        raise AssertionError("Invalid probability normalization")
    return {
        "commit": commit,
        "device": torch.cuda.get_device_name(0) if preset == "cuda" else "CPU",
        "dtype": str(model.transformer.wte.weight.dtype),
        "durationSeconds": round(time.perf_counter() - started, 4),
        "peakMemoryMb": round(torch.cuda.max_memory_allocated() / 1024**2, 2) if preset == "cuda" else 0,
        "sequenceLength": sequence_length, "batchSize": 2,
        "shapes": shapes, "nextTokenIds": next_tokens.cpu().tolist(),
        "probabilitiesSum": probabilities.sum(-1).cpu().tolist(),
        "modelParameters": sum(parameter.numel() for parameter in model.parameters()),
        "seed": 42, "pythonVersion": platform.python_version(), "torchVersion": torch.__version__,
    }


if __name__ == "__main__":
    try:
        emit("log", message="正在验证源码并初始化真实 nanochat.GPT；模型权重为随机初始化。")
        with contextlib.redirect_stdout(sys.stderr):
            result = execute(sys.argv[1], int(sys.argv[2]))
        for name, shape in result["shapes"].items():
            emit("log", message=f"{name}: {shape}")
        emit("result", result=result)
    except Exception as error:
        emit("error", message=f"{type(error).__name__}: {error}")
        sys.exit(1)

