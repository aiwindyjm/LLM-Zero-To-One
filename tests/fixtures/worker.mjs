import { createInterface } from 'node:readline';

const mode = process.argv[2] || 'success';
const emit = (event) => process.stdout.write(`${JSON.stringify(event)}\n`);
if (process.argv.includes('--diagnose')) {
  emit({
    kind: 'diagnostic',
    ready: true,
    python: 'test-fixture',
    torch: 'test-fixture',
    gpuAvailable: false,
    gpuName: null,
    commit: '92d63d4e8bb4df75c3b71618f31ddde2378b2bcd',
    message: 'Browser test fixture; not real GPU evidence',
  });
  process.exit(0);
}
let timer;
createInterface({ input: process.stdin })
  .on('line', (line) => {
    const input = JSON.parse(line);
    if (input.kind === 'cancel') {
      clearTimeout(timer);
      emit({ kind: 'exit', code: -15, cancelled: true });
      process.exit(0);
    }
    if (input.kind !== 'run') return;
    emit({ kind: 'log', message: 'Test fixture running' });
    if (mode === 'hang') return;
    timer = setTimeout(() => {
      if (mode === 'failure') {
        emit({ kind: 'error', message: 'CUDA out of memory (test fixture)' });
        emit({ kind: 'exit', code: 1 });
        return;
      }
      const length = input.sequenceLength;
      emit({
        kind: 'result',
        result: {
          commit: '92d63d4e8bb4df75c3b71618f31ddde2378b2bcd',
          device: 'CPU (test fixture)',
          dtype: 'torch.float32',
          durationSeconds: 0.05,
          peakMemoryMb: 0,
          sequenceLength: length,
          batchSize: 2,
          shapes: {
            input: [2, length],
            embedding: [2, length, 128],
            block_0: [2, length, 128],
            block_1: [2, length, 128],
            logits: [2, length, 256],
            last_position: [2, 256],
            next_token: [2],
          },
          nextTokenIds: [7, 9],
          probabilitiesSum: [1, 1],
          modelParameters: 100,
          seed: 42,
          pythonVersion: 'test-fixture',
          torchVersion: 'test-fixture',
        },
      });
      emit({ kind: 'exit', code: 0 });
    }, 120);
  })
  .on('close', () => {
    clearTimeout(timer);
    process.exit(0);
  });
