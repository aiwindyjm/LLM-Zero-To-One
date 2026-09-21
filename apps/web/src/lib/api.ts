let tokenPromise: Promise<string> | null = null;

async function session(): Promise<string> {
  tokenPromise ??= fetch('/api/session')
    .then(async (response) => {
      if (!response.ok) throw new Error('本地服务不可用');
      return ((await response.json()) as { token: string }).token;
    })
    .catch((error: unknown) => {
      tokenPromise = null;
      throw error;
    });
  return tokenPromise;
}

export async function api<T>(path: string, body?: unknown, retry = true): Promise<T> {
  const response = await fetch(
    `/api${path}`,
    body === undefined
      ? undefined
      : {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-Local-Token': await session() },
          body: JSON.stringify(body),
        },
  );
  if (response.status === 403 && body !== undefined && retry) {
    tokenPromise = null;
    return api(path, body, false);
  }
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.message || `请求失败 (${response.status})`);
  return payload as T;
}

export async function tutorStream(
  body: unknown,
  receive: (event: { kind: string; text?: string; message?: unknown }) => void,
  signal: AbortSignal,
) {
  const response = await fetch('/api/tutor', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Local-Token': await session() },
    body: JSON.stringify(body),
    signal,
  });
  if (!response.ok) throw new Error(((await response.json()) as { message: string }).message);
  if (!response.body) throw new Error('响应为空');
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let pending = '';
  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      pending += decoder.decode(chunk.value, { stream: true });
      const lines = pending.split('\n');
      pending = lines.pop() || '';
      for (const line of lines) if (line.startsWith('data: ')) receive(JSON.parse(line.slice(6)));
    }
  } finally {
    await reader.cancel();
  }
}
