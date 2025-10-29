/**
 * Profanity Filter Utility
 * 욕설 및 부적절한 단어 필터링
 */

/**
 * 욕설 및 부적절한 단어 목록
 * 실제 운영 시에는 더 포괄적인 목록 사용 권장
 */
const PROFANITY_LIST = [
  // 한글 욕설
  '씨발',
  '시발',
  '개새',
  '개세',
  '병신',
  '븅신',
  '미친',
  '또라이',
  '지랄',
  'ㅈㄹ',
  '엠창',
  '좆',
  '좃',
  '존나',
  'ㅈㄴ',
  '꺼져',
  '닥쳐',
  '죽어',
  '새끼',
  '쌔끼',
  '색히',
  '섹스',
  'ㅅㅅ',
  '애미',
  '애비',
  '호로',
  '창녀',
  '매춘',
  '강간',
  '성폭행',
  '자살',
  '목매',

  // 영문 욕설
  'fuck',
  'shit',
  'bitch',
  'asshole',
  'bastard',
  'damn',
  'hell',
  'cock',
  'dick',
  'pussy',
  'cunt',
  'slut',
  'whore',
  'nigger',
  'nigga',
  'fag',
  'faggot',
  'retard',

  // 변형/우회 표현
  '시1발',
  '시@발',
  'ㅅㅂ',
  'ㅆㅂ',
  '개-새',
  '개.새',
];

/**
 * 욕설 단어를 정규식 패턴으로 변환
 * 띄어쓰기, 특수문자 삽입 우회 방지
 */
const createProfanityPattern = (word: string): RegExp => {
  // 각 문자 사이에 선택적 구분자(공백, 특수문자) 허용
  const pattern = word.split('').join('[\\s\\-\\.\\@\\*\\_]*');
  return new RegExp(pattern, 'gi');
};

/**
 * 텍스트에 욕설이 포함되어 있는지 확인
 */
export const containsProfanity = (text: string): boolean => {
  if (!text) return false;

  const normalizedText = text.toLowerCase().trim();

  // 각 욕설 단어에 대해 검사
  for (const word of PROFANITY_LIST) {
    const pattern = createProfanityPattern(word);
    if (pattern.test(normalizedText)) {
      return true;
    }
  }

  return false;
};

/**
 * 텍스트에서 발견된 욕설 단어 목록 반환
 */
export const findProfanity = (text: string): string[] => {
  if (!text) return [];

  const normalizedText = text.toLowerCase().trim();
  const found: string[] = [];

  for (const word of PROFANITY_LIST) {
    const pattern = createProfanityPattern(word);
    if (pattern.test(normalizedText)) {
      found.push(word);
    }
  }

  return found;
};

/**
 * 텍스트의 욕설을 마스킹 처리
 */
export const maskProfanity = (text: string, maskChar: string = '*'): string => {
  if (!text) return text;

  let maskedText = text;

  for (const word of PROFANITY_LIST) {
    const pattern = createProfanityPattern(word);
    maskedText = maskedText.replace(pattern, (match) => {
      return maskChar.repeat(match.length);
    });
  }

  return maskedText;
};

/**
 * 관리자용: 욕설 단어 목록 반환
 */
export const getProfanityList = (): readonly string[] => {
  return Object.freeze([...PROFANITY_LIST]);
};
