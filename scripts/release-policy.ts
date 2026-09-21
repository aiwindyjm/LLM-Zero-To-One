export function releaseImpact(messages: string[]): 'none' | 'patch' | 'minor' {
  if (
    messages.some(
      (message) =>
        /^\w+(?:\([^)]+\))?!:/.test(message) ||
        message.includes('BREAKING CHANGE:') ||
        /^feat(?:\([^)]+\))?:/.test(message),
    )
  )
    return 'minor';
  if (messages.some((message) => /^fix(?:\([^)]+\))?:/.test(message))) return 'patch';
  return 'none';
}

export function isConventional(message: string): boolean {
  return /^(feat|fix|docs|chore|test|refactor|perf|ci|build|style|revert)(\([a-z0-9-]+\))?!?: .+/.test(
    message,
  );
}
