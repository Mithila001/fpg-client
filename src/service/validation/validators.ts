import type {
  PrimitiveValidators,
  UnknownRecord,
  ValidationFailure,
  ValidationTarget,
} from "./validation.types";

export const createPrimitiveValidators = (
  fail: ValidationFailure,
): PrimitiveValidators => {
  const asRecord = (
    value: unknown,
    path: string,
    target: ValidationTarget,
  ): UnknownRecord => {
    if (typeof value !== "object" || value === null || Array.isArray(value)) {
      return fail(target, path, "expected an object");
    }

    return value as UnknownRecord;
  };

  const asArray = (
    value: unknown,
    path: string,
    target: ValidationTarget,
  ): unknown[] => {
    if (!Array.isArray(value)) {
      return fail(target, path, "expected an array");
    }

    return value;
  };

  const asBoolean = (
    value: unknown,
    path: string,
    target: ValidationTarget,
  ): boolean => {
    if (typeof value !== "boolean") {
      return fail(target, path, "expected a boolean");
    }

    return value;
  };

  const asString = (
    value: unknown,
    path: string,
    target: ValidationTarget,
  ): string => {
    if (typeof value !== "string" || value.length === 0) {
      return fail(target, path, "expected a non-empty string");
    }

    return value;
  };

  const asFiniteNumber = (
    value: unknown,
    path: string,
    target: ValidationTarget,
  ): number => {
    if (typeof value !== "number" || !Number.isFinite(value)) {
      return fail(target, path, "expected a finite number");
    }

    return value;
  };

  const asNonNegativeNumber = (
    value: unknown,
    path: string,
    target: ValidationTarget,
  ): number => {
    const numberValue = asFiniteNumber(value, path, target);

    if (numberValue < 0) {
      return fail(target, path, "expected a non-negative number");
    }

    return numberValue;
  };

  const asPositiveNumber = (
    value: unknown,
    path: string,
    target: ValidationTarget,
  ): number => {
    const numberValue = asFiniteNumber(value, path, target);

    if (numberValue <= 0) {
      return fail(target, path, "expected a positive number");
    }

    return numberValue;
  };

  const asInteger = (
    value: unknown,
    path: string,
    target: ValidationTarget,
  ): number => {
    const numberValue = asFiniteNumber(value, path, target);

    if (!Number.isInteger(numberValue)) {
      return fail(target, path, "expected an integer");
    }

    return numberValue;
  };

  const asNonNegativeInteger = (
    value: unknown,
    path: string,
    target: ValidationTarget,
  ): number => {
    const numberValue = asInteger(value, path, target);

    if (numberValue < 0) {
      return fail(target, path, "expected a non-negative integer");
    }

    return numberValue;
  };

  const asPositiveInteger = (
    value: unknown,
    path: string,
    target: ValidationTarget,
  ): number => {
    const numberValue = asInteger(value, path, target);

    if (numberValue <= 0) {
      return fail(target, path, "expected a positive integer");
    }

    return numberValue;
  };

  const asEnumValue = <T extends string>(
    value: unknown,
    allowedValues: readonly T[],
    path: string,
    target: ValidationTarget,
  ): T => {
    if (
      typeof value !== "string" ||
      !allowedValues.includes(value as T)
    ) {
      return fail(
        target,
        path,
        `expected one of: ${allowedValues.join(", ")}`,
      );
    }

    return value as T;
  };

  const asNullable = <T>(
    value: unknown,
    parser: (value: unknown) => T,
  ): T | null => {
    if (value === null) {
      return null;
    }

    return parser(value);
  };

  const assertExactKeys = (
    record: UnknownRecord,
    allowedKeys: readonly string[],
    path: string,
    target: ValidationTarget,
  ): void => {
    const unexpectedKey = Object.keys(record).find(
      (key) => !allowedKeys.includes(key),
    );

    if (unexpectedKey !== undefined) {
      fail(target, `${path}.${unexpectedKey}`, "unknown field");
    }
  };

  const assertArrayLength = (
    values: readonly unknown[],
    path: string,
    target: ValidationTarget,
    options: {
      exact?: number;
      min?: number;
      max?: number;
    },
  ): void => {
    if (options.exact !== undefined && values.length !== options.exact) {
      fail(target, path, `expected exactly ${options.exact} items`);
    }

    if (options.min !== undefined && values.length < options.min) {
      fail(target, path, `expected at least ${options.min} items`);
    }

    if (options.max !== undefined && values.length > options.max) {
      fail(target, path, `expected at most ${options.max} items`);
    }
  };

  return {
    fail,
    asRecord,
    asArray,
    asBoolean,
    asString,
    asFiniteNumber,
    asNonNegativeNumber,
    asPositiveNumber,
    asInteger,
    asNonNegativeInteger,
    asPositiveInteger,
    asEnumValue,
    asNullable,
    assertExactKeys,
    assertArrayLength,
  };
};
