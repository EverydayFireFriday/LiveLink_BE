const PORT = process.env.PORT || 3000;

export const getServerUrl = () => {
  // 배포 환경에서는 환경변수 우선 사용
  if (process.env.NODE_ENV === "production" && process.env.PRODUCTION_URL) {
    return process.env.PRODUCTION_URL;
  }

  // 런타임에서 현재 호스트 기반으로 URL 생성
  if (typeof window !== "undefined" && window.location) {
    return `${window.location.protocol}//${window.location.host}`;
  }

  // 개발 환경 fallback
  return `http://localhost:${PORT}`;
};