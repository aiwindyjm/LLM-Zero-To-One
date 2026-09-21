import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface Preferences {
  theme: 'light' | 'dark';
  leftWidth: number;
  rightWidth: number;
  leftHidden: boolean;
  rightHidden: boolean;
  set: (value: Partial<Omit<Preferences, 'set'>>) => void;
}

export const usePreferences = create<Preferences>()(
  persist(
    (set) => ({
      theme: 'light',
      leftWidth: 260,
      rightWidth: 360,
      leftHidden: false,
      rightHidden: false,
      set: (value) => set(value),
    }),
    { name: 'llm-zero-to-one-ui', version: 1 },
  ),
);
