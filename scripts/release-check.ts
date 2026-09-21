import { execFileSync } from 'node:child_process';
import { releaseImpact, isConventional } from './release-policy.js';

const argument = process.argv.indexOf('--message');
let messages: string[];
if (argument >= 0) {
  const message = process.argv[argument + 1] || '';
  if (!isConventional(message))
    throw new Error('Use a Conventional Commit title: feat(scope): description');
  messages = [message];
} else {
  let tag: string;
  try {
    tag = execFileSync('git', ['describe', '--tags', '--abbrev=0'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    tag = '';
  }
  try {
    messages = execFileSync('git', ['log', ...(tag ? [`${tag}..HEAD`] : []), '--format=%B%x00'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    })
      .split('\0')
      .map((message) => message.trim())
      .filter(Boolean);
  } catch {
    messages = [];
  }
}
const impact = releaseImpact(messages);
console.log(
  JSON.stringify(
    {
      impact,
      decision:
        impact === 'none'
          ? 'No standalone release; keep documentation/maintenance changes in the next release.'
          : `Update the release PR with a ${impact} increment. Publish only after that PR passes checks and is merged.`,
      commitsEvaluated: messages.length,
    },
    null,
    2,
  ),
);
