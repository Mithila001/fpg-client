import type {
  DisplayAreaUnit,
  DisplayLengthUnit,
  ProjectArea,
  ProjectLength,
} from "../types/measurement";
import { projectAreaToDisplayValue } from "./area";
import { projectLengthToDisplayValue } from "./length";

export interface MeasurementFormatOptions {
  minimumFractionDigits?: number;
  maximumFractionDigits?: number;
  locale?: string;
}

const LENGTH_SYMBOLS: Record<DisplayLengthUnit, string> = {
  meter: "m",
  foot: "ft",
};

const AREA_SYMBOLS: Record<DisplayAreaUnit, string> = {
  "square-meter": "m²",
  "square-foot": "ft²",
};

const formatNumber = (
  value: number,
  options: MeasurementFormatOptions,
): string =>
  new Intl.NumberFormat(options.locale ?? "en-US", {
    minimumFractionDigits: options.minimumFractionDigits,
    maximumFractionDigits: options.maximumFractionDigits ?? 2,
  }).format(value);

export const formatProjectLength = (
  value: ProjectLength,
  unit: DisplayLengthUnit,
  options: MeasurementFormatOptions = {},
): string =>
  `${formatNumber(projectLengthToDisplayValue(value, unit), options)} ${LENGTH_SYMBOLS[unit]}`;

export const formatProjectArea = (
  value: ProjectArea,
  unit: DisplayAreaUnit,
  options: MeasurementFormatOptions = {},
): string =>
  `${formatNumber(projectAreaToDisplayValue(value, unit), options)} ${AREA_SYMBOLS[unit]}`;
