import { useSyncExternalStore } from "react";
import type { Mode, ModuleId } from "@/game/types";

export type HudState = {
  ready: boolean;
  started: boolean;
  error: string;
  coins: number;
  combo: number;
  houses: number;
  mode: Mode;
  module: ModuleId;
  rot: number;
  muted: boolean;
  line: string;
  syl: string;
  toast: string;
  emoteSeq: number;
};

const initial: HudState = {
  ready: false,
  started: false,
  error: "",
  coins: 12,
  combo: 0,
  houses: 0,
  mode: "dance",
  module: "floor",
  rot: 0,
  muted: false,
  line: "",
  syl: "",
  toast: "",
  emoteSeq: 0,
};

let state: HudState = initial;
const listeners = new Set<() => void>();

export function getHud(): HudState {
  return state;
}

export function patchHud(partial: Partial<HudState>) {
  state = { ...state, ...partial };
  for (const listener of listeners) listener();
}

export function subscribeHud(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useHud(): HudState {
  return useSyncExternalStore(subscribeHud, getHud, getHud);
}
