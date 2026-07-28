/**
 * Application-level measurement types.
 *
 * These aliases document intent while keeping the existing numeric data model.
 * The application's canonical scale is defined in src/measurement/constants.ts.
 */
export type ProjectLength = number;
export type ProjectArea = number;

export type Meter = number;
export type SquareMeter = number;
export type Foot = number;
export type SquareFoot = number;

export const DISPLAY_LENGTH_UNITS = ["meter", "foot"] as const;
export type DisplayLengthUnit = (typeof DISPLAY_LENGTH_UNITS)[number];

export const DISPLAY_AREA_UNITS = ["square-meter", "square-foot"] as const;
export type DisplayAreaUnit = (typeof DISPLAY_AREA_UNITS)[number];

export interface MeasurementDisplayPreferences {
  lengthUnit: DisplayLengthUnit;
  areaUnit: DisplayAreaUnit;
  lengthFractionDigits?: number;
  areaFractionDigits?: number;
}
