import { createContext, useContext } from 'react';
import type { Catalog } from '@llm/contracts';

export const LessonContext = createContext<Catalog | null>(null);
export function useLesson() {
  const catalog = useContext(LessonContext);
  if (!catalog) throw new Error('Lesson context missing');
  return catalog;
}
export function lessonQuery(id: string, version: string) {
  return new URLSearchParams({ lessonId: id, lessonVersion: version }).toString();
}
