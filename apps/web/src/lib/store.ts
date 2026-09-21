import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface Preferences {
  theme: 'light' | 'dark';
  leftWidth: number;
  rightWidth: number;
  leftHidden: boolean;
  rightHidden: boolean;
  location: string;
  set: (value: Partial<Omit<Preferences, 'set'>>) => void;
}

export const usePreferences = create<Preferences>()(
  persist(
    (set) => ({
      theme: 'light',
      leftWidth: 220,
      rightWidth: 300,
      leftHidden: false,
      rightHidden: false,
      location: '',
      set: (value) => set(value),
    }),
    {
      name: 'llm-zero-to-one-ui',
      version: 2,
      migrate: (saved) => ({ ...(saved as Partial<Preferences>), leftWidth: 220, rightWidth: 300 }),
    },
  ),
);
