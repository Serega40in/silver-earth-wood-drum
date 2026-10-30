export type Mode = "dance" | "run" | "build";

export type ModuleId =
  | "floor"
  | "wall"
  | "window"
  | "door"
  | "roof"
  | "chimney"
  | "flower"
  | "erase";

export type Piece = "none" | "wall" | "window" | "door";

export type ModuleInfo = {
  id: ModuleId;
  name: string;
  cost: number;
};

export const MODULES: ModuleInfo[] = [
  { id: "floor", name: "Пол", cost: 1 },
  { id: "wall", name: "Стена", cost: 2 },
  { id: "window", name: "Окно", cost: 3 },
  { id: "door", name: "Дверь", cost: 3 },
  { id: "roof", name: "Крыша", cost: 3 },
  { id: "chimney", name: "Труба", cost: 2 },
  { id: "flower", name: "Цветы", cost: 1 },
  { id: "erase", name: "Снять", cost: 0 },
];

export function moduleInfo(id: ModuleId): ModuleInfo {
  return MODULES.find((m) => m.id === id) ?? MODULES[0];
}
