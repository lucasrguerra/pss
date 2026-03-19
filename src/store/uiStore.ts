import { create } from "zustand";
import { persist } from "zustand/middleware";

// ============================================================
// Speed options
// ============================================================

export const SPEED_OPTIONS = [0.25, 0.5, 1, 2, 4] as const;
export type SpeedOption = (typeof SPEED_OPTIONS)[number];

// ============================================================
// Store
// ============================================================

interface UiStore {
  speed: number;
  setSpeed: (speed: number) => void;
}

export const useUiStore = create<UiStore>()(
  persist(
    (set) => ({
      speed: 1,
      setSpeed: (speed) => set({ speed }),
    }),
    { name: "pss:ui" },
  ),
);
