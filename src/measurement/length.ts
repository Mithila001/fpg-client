import type {
  DisplayLengthUnit,
  Foot,
  Meter,
  ProjectLength,
} from "../types/measurement";
import {
  FEET_PER_METER,
  METERS_PER_PROJECT_UNIT,
  PROJECT_UNITS_PER_METER,
} from "./constants";

export const projectLengthToMeters = (value: ProjectLength): Meter =>
  value * METERS_PER_PROJECT_UNIT;

export const metersToProjectLength = (value: Meter): ProjectLength =>
  value * PROJECT_UNITS_PER_METER;

export const projectLengthToFeet = (value: ProjectLength): Foot =>
  projectLengthToMeters(value) * FEET_PER_METER;

export const feetToProjectLength = (value: Foot): ProjectLength =>
  metersToProjectLength(value / FEET_PER_METER);

export const projectLengthToDisplayValue = (
  value: ProjectLength,
  unit: DisplayLengthUnit,
): number =>
  unit === "meter"
    ? projectLengthToMeters(value)
    : projectLengthToFeet(value);

export const displayLengthToProjectLength = (
  value: number,
  unit: DisplayLengthUnit,
): ProjectLength =>
  unit === "meter"
    ? metersToProjectLength(value)
    : feetToProjectLength(value);
