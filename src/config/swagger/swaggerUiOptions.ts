import { customStyles } from "./styles";
import { setupSearchFilter } from "./utils/searchFilter";
import { customTagSorter } from "./utils/tagSorter";

export const swaggerUiOptions = {
  explorer: true,
  customCss: customStyles,
  customSiteTitle: "LiveLink API Documentation - 라이브 스트리밍 플랫폼",
  customfavIcon: "/favicon.ico",
  swaggerOptions: {
    // 인증 및 보안
    persistAuthorization: true,
    withCredentials: true,
    
    // UI 표시 옵션
    displayRequestDuration: true,
    displayOperationId: false,
    showExtensions: true,
    showCommonExtensions: true,
    
    // 필터링 및 검색
    filter: true,
    deepLinking: true,
    
    // 인터랙션 설정
    tryItOutEnabled: true,
    requestInterceptor: (request: any) => {
      // JWT 토큰 자동 추가
      const token = localStorage.getItem('accessToken');
      if (token && !request.headers.Authorization) {
        request.headers.Authorization = `Bearer ${token}`;
      }
      return request;
    },
    
    // 문서 확장 및 표시
    docExpansion: "list", // "none", "list", "full"
    defaultModelsExpandDepth: 2,
    defaultModelExpandDepth: 3,
    defaultModelRendering: "model", // "example" or "model"
    
    // 정렬 및 그룹화
    tagsSorter: customTagSorter,
    operationsSorter: "method", // "alpha", "method"
    
    // 검색 및 필터 설정
    onComplete: setupSearchFilter,
    
    // 응답 설정
    showRequestHeaders: true,
    showResponseHeaders: true,
    
    // 유효성 검사
    validatorUrl: null, // 외부 유효성 검사 비활성화
    
    // OAuth 설정 (소셜 로그인용)
    oauth2RedirectUrl: `${window.location.origin}/api-docs/oauth2-redirect.html`,
    
    // 플러그인 설정
    plugins: [
      // 커스텀 플러그인들
      {
        name: "LiveLinkPlugin",
        components: {
          // 커스텀 컴포넌트들을 여기에 추가할 수 있음
        }
      }
    ],
    
    // 레이아웃 설정
    layout: "StandaloneLayout",
    
    // 언어 설정
    supportedSubmitMethods: ['get', 'post', 'put', 'delete', 'patch', 'head', 'options'],
    
    // CORS 설정
    presets: [
      // SwaggerUIBundle.presets.apis,
      // SwaggerUIStandalonePreset
    ],
  },
  
  // 추가 커스텀 옵션들
  customJsStr: `
    // 다국어 지원을 위한 스크립트
    window.onload = function() {
      // 한국어 인터페이스 텍스트 적용
      const style = document.createElement('style');
      style.textContent = \`
        .swagger-ui .info .title:after {
          content: " - 실시간 스트리밍 & 커뮤니티 플랫폼";
          font-size: 0.6em;
          color: #666;
          font-weight: normal;
        }
        
        .swagger-ui .scheme-container {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          padding: 10px;
          border-radius: 8px;
          margin-bottom: 20px;
        }
        
        .swagger-ui .auth-container {
          border: 2px solid #667eea;
          border-radius: 8px;
          padding: 15px;
          background: rgba(102, 126, 234, 0.1);
        }
        
        .swagger-ui .info .description p {
          font-size: 16px;
          line-height: 1.6;
        }
        
        /* 태그별 색상 구분 */
        .swagger-ui .opblock.opblock-get { border-color: #28a745; }
        .swagger-ui .opblock.opblock-post { border-color: #007bff; }
        .swagger-ui .opblock.opblock-put { border-color: #ffc107; }
        .swagger-ui .opblock.opblock-delete { border-color: #dc3545; }
        .swagger-ui .opblock.opblock-patch { border-color: #6f42c1; }
        
        /* 응답 코드별 색상 */
        .swagger-ui .response-col_status .response-col_links { color: #28a745; }
        .swagger-ui .response-col_status[data-code^="4"] { color: #dc3545; }
        .swagger-ui .response-col_status[data-code^="5"] { color: #dc3545; }
        
        /* 스크롤바 스타일링 */
        .swagger-ui ::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }
        
        .swagger-ui ::-webkit-scrollbar-track {
          background: #f1f1f1;
          border-radius: 4px;
        }
        
        .swagger-ui ::-webkit-scrollbar-thumb {
          background: linear-gradient(135deg, #667eea, #764ba2);
          border-radius: 4px;
        }
        
        .swagger-ui ::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(135deg, #5a67d8, #6b46c1);
        }
      \`;
      document.head.appendChild(style);
      
      // API 키 입력 도우미
      setTimeout(() => {
        const authButton = document.querySelector('.auth-wrapper .authorize');
        if (authButton) {
          authButton.title = 'API 인증 설정 - JWT 토큰 또는 API 키를 입력하세요';
        }
      }, 1000);
    };
  `,
};

// 개발 환경에서만 추가 디버깅 옵션
if (process.env.NODE_ENV === 'development') {
  swaggerUiOptions.swaggerOptions.showMutatedRequest = true;
  swaggerUiOptions.swaggerOptions.showRequestHeaders = true;
  swaggerUiOptions.swaggerOptions.showResponseHeaders = true;
}
