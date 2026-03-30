export const CM_PER_METER = 100;
export const CM2_PER_M2 = CM_PER_METER * CM_PER_METER;

// Backend raw values are scaled by 10 to become centimeters.
export const apiRawToCm = (value: number): number => value * 10;

export const cmToM = (cm: number): number => cm / CM_PER_METER;
export const mToCm = (m: number): number => m * CM_PER_METER;

export const cm2ToM2 = (cm2: number): number => cm2 / CM2_PER_M2;
export const m2ToCm2 = (m2: number): number => m2 * CM2_PER_M2;

export const cmToPx = (cm: number, pxPerCm: number): number => cm * pxPerCm;
export const pxToCm = (px: number, pxPerCm: number): number => px / pxPerCm;

// UI display helper: system centimeters -> formatted meters.
export const unitConverter_systemCmToMetersDisplay = (cm: number, fractionDigits = 2): string =>
  `${cmToM(cm).toFixed(fractionDigits)} m`;

// UI display helper: system square-centimeters -> formatted square-meters.
export const unitConverter_systemCm2ToSqMetersDisplay = (cm2: number, fractionDigits = 2): string =>
  `${cm2ToM2(cm2).toFixed(fractionDigits)} m²`;

// UI display helper: system dimensions in cm -> "W m x H m" string.
export const unitConverter_systemDimensionsCmToMetersDisplay = (
  widthCm: number,
  heightCm: number,
  fractionDigits = 2,
): string => {
  const width = cmToM(widthCm).toFixed(fractionDigits);
  const height = cmToM(heightCm).toFixed(fractionDigits);
  return `${width} m x ${height} m`;
};

// User input helper: meters input -> system centimeters.
export const unitConverter_userInputMetersToSystemCm = (value: string): number | null => {
  const parsed = Number.parseFloat(value.trim());
  if (!Number.isFinite(parsed)) return null;
  return mToCm(parsed);
};

// User input helper: square-meters input -> system square-centimeters.
export const unitConverter_userInputSqMetersToSystemCm2 = (value: string): number | null => {
  const parsed = Number.parseFloat(value.trim());
  if (!Number.isFinite(parsed)) return null;
  return m2ToCm2(parsed);
};

// Label helper for meter-only annotation.
export const unitConverter_updateLabelMeters = (
  labelText: string,
  lengthCm: number,
  fractionDigits = 2,
): string => `${labelText}: ${cmToM(lengthCm).toFixed(fractionDigits)} m`;

export const formatLengthFromCm = (cm: number, fractionDigits = 2): string =>
  unitConverter_systemCmToMetersDisplay(cm, fractionDigits);

export const formatAreaFromCm2 = (cm2: number, fractionDigits = 2): string =>
  unitConverter_systemCm2ToSqMetersDisplay(cm2, fractionDigits);

export const parseMetersInputToCm = (value: string): number | null => {
  return unitConverter_userInputMetersToSystemCm(value);
};

export const parseAreaM2InputToCm2 = (value: string): number | null => {
  return unitConverter_userInputSqMetersToSystemCm2(value);
};
