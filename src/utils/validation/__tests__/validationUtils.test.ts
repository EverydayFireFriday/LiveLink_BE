import Joi from 'joi';
import {
  createValidator,
  validateArray,
  mapAndValidate,
  ValidationResult,
} from '../validationUtils';

const numberValidator = createValidator<number>(Joi.number().min(0).required());

describe('validationUtils', () => {
  describe('createValidator', () => {
    it('should return the validated value for valid data', () => {
      expect(numberValidator(5)).toEqual({ isValid: true, value: 5 });
    });

    it('should apply Joi conversions', () => {
      expect(numberValidator('7')).toEqual({ isValid: true, value: 7 });
    });

    it('should return an error and message for invalid data', () => {
      const result = numberValidator(-1);

      expect(result.isValid).toBe(false);
      expect(result.error).toBeInstanceOf(Joi.ValidationError);
      expect(result.message).toContain('greater than or equal to 0');
    });

    it('should collect every violation (abortEarly: false)', () => {
      const validator = createValidator(
        Joi.object({ a: Joi.string().required(), b: Joi.number().required() }),
      );

      const result = validator({});

      expect(result.isValid).toBe(false);
      expect(result.message).toContain('"a" is required');
      expect(result.message).toContain('"b" is required');
    });
  });

  const arrayFns: Record<
    string,
    (input: unknown) => ValidationResult<number[]>
  > = {
    validateArray: (input) =>
      validateArray(input as unknown[], numberValidator),
    mapAndValidate: (input) =>
      mapAndValidate(input as unknown[], numberValidator),
  };

  describe.each(Object.keys(arrayFns))('%s', (name) => {
    const fn = arrayFns[name];

    it('should return all values when every item is valid', () => {
      expect(fn([1, 2, 3])).toEqual({ isValid: true, value: [1, 2, 3] });
    });

    it('should report the index of each invalid item', () => {
      const result = fn([1, -1, 3, -2]);

      expect(result.isValid).toBe(false);
      expect(result.message).toContain('Item at index 1');
      expect(result.message).toContain('Item at index 3');
      expect(result.message).not.toContain('Item at index 0');
    });

    it('should reject non-array input', () => {
      expect(fn('nope')).toEqual({
        isValid: false,
        message: 'Input is not an array.',
      });
    });

    it('should accept an empty array', () => {
      expect(fn([])).toEqual({ isValid: true, value: [] });
    });
  });
});
