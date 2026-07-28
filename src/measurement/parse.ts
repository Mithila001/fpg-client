import type {
  DisplayAreaUnit,
  DisplayLengthUnit,
  ProjectArea,
  ProjectLength,
} from "../types/measurement";
import { displayAreaToProjectArea } from "./area";
import { displayLengthToProjectLength } from "./length";

const parseFiniteNumber = (value: string | number): number | null => {
  const parsed =
    typeof value === "number" ? value : Number.parseFloat(value.trim());

  return Number.isFinite(parsed) ? parsed : null;
};

export const parseDisplayLength = (
  value: string | number,
  unit: DisplayLengthUnit,
): ProjectLength | null => {
  const parsed = parseFiniteNumber(value);
  return parsed === null ? null : displayLengthToProjectLength(parsed, unit);
};

export const parseDisplayArea = (
  value: string | number,
  unit: DisplayAreaUnit,
): ProjectArea | null => {
  const parsed = parseFiniteNumber(value);
  return parsed === null ? null : displayAreaToProjectArea(parsed, unit);
};
