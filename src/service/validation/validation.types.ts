export type ValidationTarget = "request" | "response";

export type UnknownRecord = Record<string, unknown>;

export type ValidationFailure = (
  target: ValidationTarget,
  path: string,
  reason: string,
) => never;

export interface PrimitiveValidators {
  fail: ValidationFailure;

  asRecord(
    value: unknown,
    path: string,
    target: ValidationTarget,
  ): UnknownRecord;

  asArray(
    value: unknown,
    path: string,
    target: ValidationTarget,
  ): unknown[];

  asBoolean(
    value: unknown,
    path: string,
    target: ValidationTarget,
  ): boolean;

  asString(
    value: unknown,
    path: string,
    target: ValidationTarget,
  ): string;

  asFiniteNumber(
    value: unknown,
    path: string,
    target: ValidationTarget,
  ): number;

  asNonNegativeNumber(
    value: unknown,
    path: string,
    target: ValidationTarget,
  ): number;

  asPositiveNumber(
    value: unknown,
    path: string,
    target: ValidationTarget,
  ): number;

  asInteger(
    value: unknown,
    path: string,
    target: ValidationTarget,
  ): number;

  asNonNegativeInteger(
    value: unknown,
    path: string,
    target: ValidationTarget,
  ): number;

  asPositiveInteger(
    value: unknown,
    path: string,
    target: ValidationTarget,
  ): number;

  asEnumValue<T extends string>(
    value: unknown,
    allowedValues: readonly T[],
    path: string,
    target: ValidationTarget,
  ): T;

  asNullable<T>(
    value: unknown,
    parser: (value: unknown) => T,
  ): T | null;

  assertExactKeys(
    record: UnknownRecord,
    allowedKeys: readonly string[],
    path: string,
    target: ValidationTarget,
  ): void;

  assertArrayLength(
    values: readonly unknown[],
    path: string,
    target: ValidationTarget,
    options: {
      exact?: number;
      min?: number;
      max?: number;
    },
  ): void;
}
