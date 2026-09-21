import { ObjectId } from 'mongodb';
import { toIdString, toIdStrings } from '../idUtils';

describe('idUtils', () => {
  describe('toIdString', () => {
    it('should return string ids as-is', () => {
      expect(toIdString('abc123')).toBe('abc123');
    });

    it('should convert ObjectId to hex string', () => {
      const id = new ObjectId();
      expect(toIdString(id)).toBe(id.toHexString());
    });

    it('should extract _id from populated documents', () => {
      const id = new ObjectId();
      expect(toIdString({ _id: id })).toBe(id.toHexString());
      expect(toIdString({ _id: 'str-id' })).toBe('str-id');
    });

    it('should extract id from documents that use id', () => {
      expect(toIdString({ id: 'article-1' })).toBe('article-1');
    });

    it('should return empty string when document has no id', () => {
      expect(toIdString({})).toBe('');
    });
  });

  describe('toIdStrings', () => {
    it('should convert mixed id lists', () => {
      const id = new ObjectId();
      expect(toIdStrings([id, 'plain', { _id: id }, { id: 'a-1' }])).toEqual([
        id.toHexString(),
        'plain',
        id.toHexString(),
        'a-1',
      ]);
    });

    it('should drop entries without ids', () => {
      expect(toIdStrings([{}, 'keep'])).toEqual(['keep']);
    });

    it('should return empty array for undefined', () => {
      expect(toIdStrings(undefined)).toEqual([]);
    });
  });
});
