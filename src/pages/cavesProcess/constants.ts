import type { CornerKey, RoomPoints } from "../../components/Konva/InputPlanCanvas";

export const CAVES_KEYS: CornerKey[] = ["A", "B", "C", "D", "E", "F"];

export const CAVES_BORDER_LIMITS = {
  min: 4,
  max: 6,
} as const;

export const CAVES_BUILDABLE_MIN_SIZE_CM = {
  width: 100,
  height: 100,
} as const;

export const CAVES_INITIAL_POINTS: RoomPoints = {
  A: { x: 140, y: 140 },
  B: { x: 460, y: 140 },
  C: { x: 460, y: 380 },
  D: { x: 140, y: 380 },
  E: { x: 300, y: 500 },
  F: { x: 520, y: 300 },
};
