/** Canonical application scale: 10 project units represent 1 meter. */
export const PROJECT_UNITS_PER_METER = 10;

/** Area scales by the square of the length scale. */
export const PROJECT_AREA_UNITS_PER_SQUARE_METER =
  PROJECT_UNITS_PER_METER ** 2;

export const METERS_PER_PROJECT_UNIT = 1 / PROJECT_UNITS_PER_METER;
export const SQUARE_METERS_PER_PROJECT_AREA_UNIT =
  1 / PROJECT_AREA_UNITS_PER_SQUARE_METER;

export const FEET_PER_METER = 3.280839895013123;
export const SQUARE_FEET_PER_SQUARE_METER = FEET_PER_METER ** 2;
