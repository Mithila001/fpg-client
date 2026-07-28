import type {
  DisplayAreaUnit,
  ProjectArea,
  SquareFoot,
  SquareMeter,
} from "../types/measurement";
import {
  PROJECT_AREA_UNITS_PER_SQUARE_METER,
  SQUARE_FEET_PER_SQUARE_METER,
  SQUARE_METERS_PER_PROJECT_AREA_UNIT,
} from "./constants";

export const projectAreaToSquareMeters = (value: ProjectArea): SquareMeter =>
  value * SQUARE_METERS_PER_PROJECT_AREA_UNIT;

export const squareMetersToProjectArea = (value: SquareMeter): ProjectArea =>
  value * PROJECT_AREA_UNITS_PER_SQUARE_METER;

export const projectAreaToSquareFeet = (value: ProjectArea): SquareFoot =>
  projectAreaToSquareMeters(value) * SQUARE_FEET_PER_SQUARE_METER;

export const squareFeetToProjectArea = (value: SquareFoot): ProjectArea =>
  squareMetersToProjectArea(value / SQUARE_FEET_PER_SQUARE_METER);

export const projectAreaToDisplayValue = (
  value: ProjectArea,
  unit: DisplayAreaUnit,
): number =>
  unit === "square-meter"
    ? projectAreaToSquareMeters(value)
    : projectAreaToSquareFeet(value);

export const displayAreaToProjectArea = (
  value: number,
  unit: DisplayAreaUnit,
): ProjectArea =>
  unit === "square-meter"
    ? squareMetersToProjectArea(value)
    : squareFeetToProjectArea(value);
