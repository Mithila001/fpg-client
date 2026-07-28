import { PROJECT_UNITS_PER_METER } from "../../measurement";
import type { ProjectArea, ProjectLength } from "../../types";

/**
 * Current API scale. Change this only when an API without unit metadata changes
 * its contract. Boundary responses provide their own scale and override this.
 */
export const API_PROJECT_UNITS_PER_METER = 10;

const assertUnitsPerMeter = (
  unitsPerMeter: number,
  label: string,
): number => {
  if (!Number.isFinite(unitsPerMeter) || unitsPerMeter <= 0) {
    throw new RangeError(`${label} must be a finite number greater than zero.`);
  }

  return unitsPerMeter;
};

/** Converts a length between two project-unit scales. */
const convertLengthScale = (
  value: number,
  sourceUnitsPerMeter: number,
  targetUnitsPerMeter: number,
): number => {
  const source = assertUnitsPerMeter(
    sourceUnitsPerMeter,
    "sourceUnitsPerMeter",
  );
  const target = assertUnitsPerMeter(
    targetUnitsPerMeter,
    "targetUnitsPerMeter",
  );

  return (value / source) * target;
};

/** Converts an area between two project-unit scales using squared factors. */
const convertAreaScale = (
  value: number,
  sourceUnitsPerMeter: number,
  targetUnitsPerMeter: number,
): number => {
  const source = assertUnitsPerMeter(
    sourceUnitsPerMeter,
    "sourceUnitsPerMeter",
  );
  const target = assertUnitsPerMeter(
    targetUnitsPerMeter,
    "targetUnitsPerMeter",
  );

  return (value / source ** 2) * target ** 2;
};

export const apiLengthToProjectLength = (
  value: number,
  apiUnitsPerMeter = API_PROJECT_UNITS_PER_METER,
): ProjectLength =>
  convertLengthScale(value, apiUnitsPerMeter, PROJECT_UNITS_PER_METER);

export const projectLengthToApiLength = (
  value: ProjectLength,
  apiUnitsPerMeter = API_PROJECT_UNITS_PER_METER,
): number =>
  convertLengthScale(value, PROJECT_UNITS_PER_METER, apiUnitsPerMeter);

export const apiAreaToProjectArea = (
  value: number,
  apiUnitsPerMeter = API_PROJECT_UNITS_PER_METER,
): ProjectArea =>
  convertAreaScale(value, apiUnitsPerMeter, PROJECT_UNITS_PER_METER);

export const projectAreaToApiArea = (
  value: ProjectArea,
  apiUnitsPerMeter = API_PROJECT_UNITS_PER_METER,
): number =>
  convertAreaScale(value, PROJECT_UNITS_PER_METER, apiUnitsPerMeter);
