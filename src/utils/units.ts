export const CM_PER_METER = 100;
export const CM2_PER_M2 = CM_PER_METER * CM_PER_METER;

export const cmToM = (cm: number): number => cm / CM_PER_METER;
export const mToCm = (m: number): number => m * CM_PER_METER;

export const cm2ToM2 = (cm2: number): number => cm2 / CM2_PER_M2;
export const m2ToCm2 = (m2: number): number => m2 * CM2_PER_M2;

export const cmToPx = (cm: number, pxPerCm: number): number => cm * pxPerCm;
export const pxToCm = (px: number, pxPerCm: number): number => px / pxPerCm;

export const formatLengthFromCm = (cm: number, fractionDigits = 2): string =>
  `${cmToM(cm).toFixed(fractionDigits)} m`;

export const formatAreaFromCm2 = (cm2: number, fractionDigits = 2): string =>
  `${cm2ToM2(cm2).toFixed(fractionDigits)} m²`;

export const parseMetersInputToCm = (value: string): number | null => {
  const parsed = Number.parseFloat(value.trim());
  if (!Number.isFinite(parsed)) return null;
  return mToCm(parsed);
};

export const parseAreaM2InputToCm2 = (value: string): number | null => {
  const parsed = Number.parseFloat(value.trim());
  if (!Number.isFinite(parsed)) return null;
  return m2ToCm2(parsed);
};
