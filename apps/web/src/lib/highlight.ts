import { createHighlighterCore } from 'shiki/core';
import { createJavaScriptRegexEngine } from 'shiki/engine/javascript';
import python from 'shiki/langs/python.mjs';
import light from 'shiki/themes/github-light.mjs';
import dark from 'shiki/themes/github-dark.mjs';

const highlighter = createHighlighterCore({
  themes: [light, dark],
  langs: [python],
  engine: createJavaScriptRegexEngine(),
});

export async function highlightPython(code: string): Promise<string> {
  return (await highlighter).codeToHtml(code, {
    lang: 'python',
    themes: { light: 'github-light', dark: 'github-dark' },
    defaultColor: false,
  });
}
