/**
 * API 태그를 논리적 순서로 정렬하고 한국어 설명 추가
 */

export interface TagInfo {
  name: string;
  description: string;
  order: number;
  category: 'core' | 'user' | 'content' | 'social' | 'admin' | 'system';
}

const tagOrder: TagInfo[] = [
  // 시스템 및 인증 (Core)
  { name: 'Health', description: '서버 상태 확인 및 헬스체크', order: 1, category: 'system' },
  { name: 'Auth', description: '로그인, 로그아웃, 토큰 관리', order: 2, category: 'core' },
  { name: 'Registration', description: '회원가입 및 계정 생성', order: 3, category: 'core' },
  { name: 'Password', description: '비밀번호 변경 및 재설정', order: 4, category: 'core' },
  { name: 'Verification', description: '이메일 인증 및 계정 확인', order: 5, category: 'core' },
  
  // 사용자 관리 (User)
  { name: 'Profile', description: '사용자 프로필 관리', order: 10, category: 'user' },
  { name: 'User', description: '사용자 정보 및 설정', order: 11, category: 'user' },
  { name: 'Follow', description: '팔로우 및 팔로워 관리', order: 12, category: 'social' },
  
  // 콘텐츠 관리 (Content)
  { name: 'Concert', description: '라이브 스트리밍 콘서트 관리', order: 20, category: 'content' },
  { name: 'Stream', description: '실시간 스트리밍 서비스', order: 21, category: 'content' },
  { name: 'Video', description: '비디오 콘텐츠 관리', order: 22, category: 'content' },
  { name: 'Article', description: '게시글 및 블로그 관리', order: 23, category: 'content' },
  { name: 'Comment', description: '댓글 시스템', order: 24, category: 'social' },
  
  // 소셜 기능 (Social)
  { name: 'Chat', description: '실시간 채팅 시스템', order: 30, category: 'social' },
  { name: 'Like', description: '좋아요 및 반응 시스템', order: 31, category: 'social' },
  { name: 'Bookmark', description: '북마크 및 즐겨찾기', order: 32, category: 'social' },
  { name: 'Notification', description: '알림 및 푸시 메시지', order: 33, category: 'social' },
  
  // 결제 및 구독 (Payment)
  { name: 'Payment', description: '결제 및 구독 관리', order: 40, category: 'user' },
  { name: 'Subscription', description: '구독 서비스 관리', order: 41, category: 'user' },
  
  // 관리자 기능 (Admin)
  { name: 'Admin', description: '관리자 전용 기능', order: 50, category: 'admin' },
  { name: 'Analytics', description: '통계 및 분석 데이터', order: 51, category: 'admin' },
  { name: 'Report', description: '신고 및 모더레이션', order: 52, category: 'admin' },
  
  // 파일 및 미디어 (System)
  { name: 'Upload', description: '파일 업로드 및 미디어', order: 60, category: 'system' },
  { name: 'Storage', description: '저장소 및 CDN 관리', order: 61, category: 'system' },
];

export const customTagSorter = (a: string, b: string): number => {
  const tagA = tagOrder.find(tag => tag.name.toLowerCase() === a.toLowerCase());
  const tagB = tagOrder.find(tag => tag.name.toLowerCase() === b.toLowerCase());
  
  // 정의된 태그들은 order에 따라 정렬
  if (tagA && tagB) {
    return tagA.order - tagB.order;
  }
  
  // 정의되지 않은 태그는 마지막에 알파벳 순으로
  if (tagA && !tagB) return -1;
  if (!tagA && tagB) return 1;
  
  // 둘 다 정의되지 않은 경우 알파벳 순
  return a.localeCompare(b);
};

export const getTagDescription = (tagName: string): string => {
  const tag = tagOrder.find(t => t.name.toLowerCase() === tagName.toLowerCase());
  return tag ? tag.description : `${tagName} 관련 API`;
};

export const getTagsByCategory = (category: TagInfo['category']): TagInfo[] => {
  return tagOrder.filter(tag => tag.category === category);
};

export const getAllTags = (): TagInfo[] => {
  return [...tagOrder].sort((a, b) => a.order - b.order);
};
