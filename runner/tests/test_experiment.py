import os
from pathlib import Path
import sys

os.environ["NANOCHAT_DTYPE"] = "float32"
os.environ["TORCHDYNAMO_DISABLE"] = "1"
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import pytest
from experiment import execute, verify_sources, UPSTREAM_SHA


def test_pinned_sources():
    assert verify_sources() == UPSTREAM_SHA


@pytest.mark.parametrize("length", [8, 16, 32])
def test_real_gpt_forward(length):
    result = execute("cpu", length)
    assert result["shapes"]["input"] == [2, length]
    assert result["shapes"]["embedding"] == [2, length, 128]
    assert result["shapes"]["block_1"] == [2, length, 128]
    assert result["shapes"]["logits"] == [2, length, 256]
    assert all(abs(value - 1) < 1e-5 for value in result["probabilitiesSum"])
    assert all(0 <= token < 256 for token in result["nextTokenIds"])
    trace = result["trace"]
    assert trace["version"] == 1
    assert trace["inputIds"] == [list(range(length)), list(range(length, 2 * length))]
    assert len(trace["samples"]) == 6
    assert trace["dimensionIndices"] == list(range(8))
    for sample in trace["samples"]:
        assert sample["position"] in [0, 1, length - 1]
        assert sample["tokenId"] == trace["inputIds"][sample["batch"]][sample["position"]]
        assert all(len(vector) == 8 for vector in sample["vectors"].values())
    for batch, candidates in enumerate(trace["candidates"]):
        assert len(candidates) == 5
        assert candidates[0]["tokenId"] == result["nextTokenIds"][batch]
        assert 0 < sum(candidate["probability"] for candidate in candidates) < 1


def test_invalid_length_is_rejected():
    with pytest.raises(ValueError):
        execute("cpu", 999)


@pytest.mark.parametrize("length", [8, 16, 32])
def test_real_tokenizer_and_training_batch(length):
    from data_experiment import execute as data_execute
    result = data_execute("cpu", length)
    trace = result["dataTrace"]
    assert result["shapes"]["row_buffer"] == [2, length + 1]
    assert result["shapes"]["inputs"] == result["shapes"]["targets"] == [2, length]
    assert all(doc["text"] == doc["decoded"] for doc in trace["documents"])
    for inputs, targets in zip(trace["inputs"], trace["targets"]):
        assert inputs[0] == trace["bosId"]
        assert inputs[1:] == targets[:-1]
        assert all(0 <= token < trace["vocabSize"] for token in inputs + targets)
    assert result["modelParameters"] == 0


def test_data_rejects_unavailable_device():
    from data_experiment import execute as data_execute
    with pytest.raises(ValueError):
        data_execute("cuda", 8)
