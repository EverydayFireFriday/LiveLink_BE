import Joi from 'joi';

export interface ValidationResult<T> {
  isValid: boolean;
  value?: T;
  error?: Joi.ValidationError;
  message?: string;
}

// 3/10: Generic factory function to create validators using Joi
export function createValidator<T>(
  schema: Joi.Schema<T>,
): (data: unknown) => ValidationResult<T> {
  return (data: unknown): ValidationResult<T> => {
    const { error, value } = schema.validate(data, { abortEarly: false });
    if (error) {
      return {
        isValid: false,
        error,
        message: error.details.map((d) => d.message).join('; '),
      };
    }
    return { isValid: true, value };
  };
}

// 4/10: Generic function to validate an array of items
export function validateArray<T>(
  arr: unknown[],
  validator: (item: unknown) => ValidationResult<T>,
): ValidationResult<T[]> {
  const validatedValues: T[] = [];
  const errors: string[] = [];

  if (!Array.isArray(arr)) {
    return { isValid: false, message: 'Input is not an array.' };
  }

  arr.forEach((item, index) => {
    const result = validator(item);
    if (result.isValid) {
      if (result.value !== undefined) {
        validatedValues.push(result.value);
      }
    } else {
      errors.push(
        `Item at index ${index}: ${result.message || 'Validation failed'}`,
      );
    }
  });

  if (errors.length > 0) {
    return { isValid: false, message: errors.join('; ') };
  }
  return { isValid: true, value: validatedValues };
}

// 5/10: Generic function to map and validate an array
export function mapAndValidate<T, U>(
  arr: T[],
  validator: (item: T) => ValidationResult<U>,
): ValidationResult<U[]> {
  const validatedValues: U[] = [];
  const errors: string[] = [];

  if (!Array.isArray(arr)) {
    return { isValid: false, message: 'Input is not an array.' };
  }

  for (let i = 0; i < arr.length; i++) {
    const item = arr[i];
    const result = validator(item);
    if (result.isValid) {
      if (result.value !== undefined) {
        validatedValues.push(result.value);
      }
    } else {
      errors.push(
        `Item at index ${i}: ${result.message || 'Validation failed'}`,
      );
    }
  }

  if (errors.length > 0) {
    return { isValid: false, message: errors.join('; ') };
  }
  return { isValid: true, value: validatedValues };
}
