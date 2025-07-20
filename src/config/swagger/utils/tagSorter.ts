export const swaggerTags = [
  // Health Check (가장 위로)
  { name: "Health Check", description: "서버 상태 및 모니터링" },

  // Auth 관련 tags
  { name: "Auth", description: "로그인/로그아웃 관리" },
  { name: "Registration", description: "회원가입 관리" },
  { name: "Password", description: "비밀번호 관리" },
  { name: "Profile", description: "프로필 관리" },
  { name: "Verification", description: "이메일 인증 관리" },

  // Concert 관련 tags
  { name: "Concerts - Basic", description: "콘서트 기본 CRUD 관리" },
  { name: "Concerts - Like", description: "콘서트 좋아요 관리" },
  { name: "Concerts - Search", description: "콘서트 검색 및 필터링" },
  { name: "Concerts - Batch", description: "콘서트 배치 작업" },

  // Article 관련 tags
  { name: "Article", description: "게시글 관리" },
  { name: "Article Bookmark", description: "게시글 북마크 관리" },
  { name: "Article Comment", description: "게시글 댓글 관리" },
  { name: "Article Like", description: "게시글 좋아요 관리" },

  // Admin 관련
  { name: "Admin", description: "관리자 전용 기능" },
];
