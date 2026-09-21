import { ObjectId } from 'mongodb';

type IdLike = string | ObjectId | { _id?: ObjectId | string } | { id: string };

/**
 * ObjectId, 문자열 ID, populate된 문서를 ID 문자열로 변환
 * (populate된 문서에 toString()을 쓰면 "[object Object]"가 되는 문제 방지)
 */
export const toIdString = (value: IdLike): string => {
  if (typeof value === 'string') return value;
  if (value instanceof ObjectId) return value.toHexString();
  if ('id' in value) return value.id;
  return value._id ? toIdString(value._id) : '';
};

/**
 * ID 목록을 문자열 배열로 변환 (ID가 없는 항목은 제외)
 */
export const toIdStrings = (values: IdLike[] | undefined): string[] =>
  (values || []).map(toIdString).filter((id) => id !== '');
