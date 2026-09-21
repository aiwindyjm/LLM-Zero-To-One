"""Small authored Parquet corpus through the unmodified pinned tokenizer and loader."""
import contextlib
import platform
from pathlib import Path
import sys
import tempfile
import time
from unittest.mock import patch

from experiment import emit, verify_sources


def execute(preset, sequence_length):
    if preset != "cpu" or sequence_length not in {8, 16, 32}:
        raise ValueError("Data lesson supports CPU and T=8/16/32")
    commit = verify_sources()
    sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "data/upstream/nanochat"))
    import torch
    import pyarrow as pa
    import pyarrow.parquet as pq
    from nanochat.tokenizer import RustBPETokenizer
    from nanochat import dataloader

    torch.set_num_threads(4)
    started = time.perf_counter()
    documents = ["Python reads text. A model predicts the next token. " * 3,
                 "Hello, 世界! Text becomes tokens, then a batch. " * 3]
    tokenizer = RustBPETokenizer.train_from_iterator(iter(documents), 280)
    encoded = tokenizer.encode(documents, num_threads=1)
    with tempfile.TemporaryDirectory(prefix="llm-data-lesson-") as directory:
        paths = [str(Path(directory) / name) for name in ("train.parquet", "val.parquet")]
        for path in paths:
            pq.write_table(pa.table({"text": documents}), path)
        # Only the shard discovery is replaced. Tokenization, packing, cropping and shifting
        # execute the original upstream implementation; no production dataset is downloaded.
        with patch.object(dataloader, "list_parquet_files", return_value=paths):
            loader = dataloader.tokenizing_distributed_data_loader_with_state_bos_bestfit(
                tokenizer, 2, sequence_length, "train", tokenizer_threads=1,
                tokenizer_batch_size=2, device="cpu", buffer_size=2,
            )
            inputs, targets, _state = next(loader)
            input_ids, target_ids = inputs.tolist(), targets.tolist()
            loader.close()
    assert inputs.shape == targets.shape == (2, sequence_length)
    assert all(row[0] == tokenizer.get_bos_token_id() for row in input_ids)
    assert all(row[1:] == target_ids[index][:-1] for index, row in enumerate(input_ids))
    assert all(tokenizer.decode(ids) == text for text, ids in zip(documents, encoded))
    return {
        "commit": commit, "device": "CPU", "dtype": str(inputs.dtype),
        "durationSeconds": round(time.perf_counter() - started, 4), "peakMemoryMb": 0,
        "sequenceLength": sequence_length, "batchSize": 2,
        "shapes": {"row_buffer": [2, sequence_length + 1], "inputs": list(inputs.shape), "targets": list(targets.shape)},
        "nextTokenIds": [], "probabilitiesSum": [], "modelParameters": 0, "seed": 0,
        "pythonVersion": platform.python_version(), "torchVersion": torch.__version__,
        "dataTrace": {
            "version": 1, "tokenizer": "nanochat.RustBPETokenizer",
            "vocabSize": tokenizer.get_vocab_size(), "bosId": tokenizer.get_bos_token_id(),
            "documents": [{"text": text, "ids": ids, "decoded": tokenizer.decode(ids)} for text, ids in zip(documents, encoded)],
            "inputs": input_ids, "targets": target_ids,
        },
    }


if __name__ == "__main__":
    try:
        emit("log", message="使用原创微型文本训练教学词表，调用真实 nanochat Tokenizer 与数据加载器；不训练语言模型。")
        with contextlib.redirect_stdout(sys.stderr):
            result = execute(sys.argv[1], int(sys.argv[2]))
        for name, shape in result["shapes"].items():
            emit("log", message=f"{name}: {shape}")
        emit("result", result=result)
    except Exception as error:
        emit("error", message=f"{type(error).__name__}: {error}")
        sys.exit(1)
