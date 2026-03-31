export const KONVA_SCALE = {
  pxPerCm: 1,
  wallThicknessPx: 6,
} as const;

export const KONVA_VIEWPORT = {
  minContainerSizePx: 320,
  defaultWidthPx: 900,
  defaultHeightPx: 620,
  pointPaddingPx: 24,
  fitPaddingPx: 36,
  contentMarginPx: 100,
} as const;

export const KONVA_ZOOM = {
  minScale: 0.2,
  maxScale: 3,
  buttonStep: 0.2,
  wheelStep: 0.1,
} as const;

export const KONVA_GRID = {
  baseStepCm: 10,
  targetCells: 20,
  minScaleFactor: 0.05,
  maxScaleFactor: 5,
} as const;

export const STEP_A_ROAD = {
  width: 30,
  length: 1000,
  gap: 6,
  snapThreshold: 36,
  minEdgeLength: 24,
} as const;

export const OPENING_STYLE = {
  windowGapPx: 3,
  arcSteps: 14,
} as const;
