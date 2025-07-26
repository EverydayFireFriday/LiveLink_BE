import { darkModeStyles } from './darkMode';
import { themeStyles } from './themes';
import { animationStyles } from './animations';

export const customStyles = `
  /* LiveLink API Documentation 커스텀 스타일 */
  
  /* 기본 레이아웃 */
  .swagger-ui {
    font-family: 'Segoe UI', 'Noto Sans KR', -apple-system, BlinkMacSystemFont, sans-serif;
    line-height: 1.6;
  }
  
  /* 헤더 스타일링 */
  .swagger-ui .topbar {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    border-bottom: 3px solid #4c63d2;
    padding: 15px 0;
  }
  
  .swagger-ui .topbar .download-url-wrapper {
    display: none; /* URL 입력창 숨김 */
  }
  
  .swagger-ui .topbar-wrapper img {
    height: 40px;
    width: auto;
  }
  
  /* 정보 섹션 */
  .swagger-ui .info {
    margin: 30px 0;
    padding: 30px;
    background: linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%);
    border-radius: 12px;
    border: 1px solid rgba(102, 126, 234, 0.2);
  }
  
  .swagger-ui .info .title {
    color: #2d3748;
    font-size: 2.5rem;
    font-weight: 700;
    margin-bottom: 15px;
    background: linear-gradient(135deg, #667eea, #764ba2);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }
  
  .swagger-ui .info .description {
    font-size: 1.1rem;
    color: #4a5568;
    line-height: 1.8;
  }
  
  .swagger-ui .info .description p {
    margin-bottom: 15px;
  }
  
  /* 서버 정보 */
  .swagger-ui .scheme-container {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    padding: 20px;
    border-radius: 10px;
    margin: 20px 0;
    box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);
  }
  
  .swagger-ui .scheme-container .schemes-title {
    color: white;
    font-weight: 600;
    margin-bottom: 10px;
  }
  
  .swagger-ui .scheme-container select {
    background: white;
    border: 2px solid rgba(255, 255, 255, 0.3);
    border-radius: 6px;
    padding: 8px 12px;
    color: #2d3748;
    font-weight: 500;
  }
  
  /* 인증 섹션 */
  .swagger-ui .auth-wrapper {
    border: 2px solid #667eea;
    border-radius: 10px;
    overflow: hidden;
    box-shadow: 0 4px 15px rgba(102, 126, 234, 0.2);
  }
  
  .swagger-ui .auth-container {
    background: rgba(102, 126, 234, 0.05);
    padding: 20px;
  }
  
  .swagger-ui .auth-btn-wrapper .btn.authorize {
    background: linear-gradient(135deg, #667eea, #764ba2);
    border: none;
    border-radius: 8px;
    padding: 12px 24px;
    font-weight: 600;
    text-transform: none;
    font-size: 14px;
    transition: all 0.3s ease;
    box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);
  }
  
  .swagger-ui .auth-btn-wrapper .btn.authorize:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4);
  }
  
  /* 태그 섹션 */
  .swagger-ui .opblock-tag {
    margin-bottom: 30px;
    border-radius: 12px;
    overflow: hidden;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  }
  
  .swagger-ui .opblock-tag-section {
    background: linear-gradient(135deg, #f7fafc 0%, #edf2f7 100%);
    border-bottom: 3px solid #e2e8f0;
  }
  
  .swagger-ui .opblock-tag h4 {
    color: #2d3748;
    font-size: 1.3rem;
    font-weight: 700;
    margin: 0;
    padding: 20px 25px;
  }
  
  .swagger-ui .opblock-tag small {
    color: #718096;
    font-size: 0.9rem;
    font-weight: 400;
  }
  
  /* 오퍼레이션 블록 */
  .swagger-ui .opblock {
    border-radius: 8px;
    border: 2px solid transparent;
    margin: 8px 0;
    overflow: hidden;
    transition: all 0.3s ease;
  }
  
  .swagger-ui .opblock:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
  }
  
  /* HTTP 메서드별 색상 */
  .swagger-ui .opblock.opblock-get {
    border-color: #28a745;
    background: rgba(40, 167, 69, 0.05);
  }
  
  .swagger-ui .opblock.opblock-get .opblock-summary-method {
    background: #28a745;
    color: white;
    font-weight: 700;
  }
  
  .swagger-ui .opblock.opblock-post {
    border-color: #007bff;
    background: rgba(0, 123, 255, 0.05);
  }
  
  .swagger-ui .opblock.opblock-post .opblock-summary-method {
    background: #007bff;
    color: white;
    font-weight: 700;
  }
  
  .swagger-ui .opblock.opblock-put {
    border-color: #ffc107;
    background: rgba(255, 193, 7, 0.05);
  }
  
  .swagger-ui .opblock.opblock-put .opblock-summary-method {
    background: #ffc107;
    color: #212529;
    font-weight: 700;
  }
  
  .swagger-ui .opblock.opblock-delete {
    border-color: #dc3545;
    background: rgba(220, 53, 69, 0.05);
  }
  
  .swagger-ui .opblock.opblock-delete .opblock-summary-method {
    background: #dc3545;
    color: white;
    font-weight: 700;
  }
  
  .swagger-ui .opblock.opblock-patch {
    border-color: #6f42c1;
    background: rgba(111, 66, 193, 0.05);
  }
  
  .swagger-ui .opblock.opblock-patch .opblock-summary-method {
    background: #6f42c1;
    color: white;
    font-weight: 700;
  }
  
  /* 요약 섹션 */
  .swagger-ui .opblock-summary {
    padding: 15px 20px;
    cursor: pointer;
    transition: background-color 0.2s ease;
  }
  
  .swagger-ui .opblock-summary:hover {
    background-color: rgba(0, 0, 0, 0.02);
  }
  
  .swagger-ui .opblock-summary-method {
    border-radius: 6px;
    padding: 6px 12px;
    font-size: 12px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    min-width: 70px;
    text-align: center;
  }
  
  .swagger-ui .opblock-summary-path {
    font-family: 'Monaco', 'Consolas', monospace;
    font-size: 14px;
    font-weight: 600;
    color: #2d3748;
    margin-left: 15px;
  }
  
  .swagger-ui .opblock-summary-description {
    color: #4a5568;
    font-size: 14px;
    font-weight: 500;
    margin-left: auto;
    text-align: right;
    max-width: 300px;
  }
  
  /* 매개변수 섹션 */
  .swagger-ui .parameters-container {
    background: #f8f9fa;
    padding: 20px;
    border-radius: 8px;
    margin: 15px 0;
  }
  
  .swagger-ui .parameter__name {
    font-weight: 600;
    color: #2d3748;
  }
  
  .swagger-ui .parameter__type {
    color: #667eea;
    font-weight: 500;
  }
  
  .swagger-ui .parameter__in {
    background: #e2e8f0;
    color: #4a5568;
    padding: 2px 8px;
    border-radius: 4px;
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
  }
  
  /* 응답 섹션 */
  .swagger-ui .responses-wrapper {
    margin-top: 20px;
  }
  
  .swagger-ui .response {
    border-radius: 8px;
    border: 1px solid #e2e8f0;
    margin-bottom: 10px;
    overflow: hidden;
  }
  
  .swagger-ui .response-col_status {
    font-weight: 700;
    padding: 10px 15px;
  }
  
  .swagger-ui .response-col_description {
    padding: 10px 15px;
    color: #4a5568;
  }
  
  /* 상태 코드별 색상 */
  .swagger-ui .responses-table .response-col_status {
    background: #f8f9fa;
  }
  
  .swagger-ui .response-col_status[data-code^="2"] {
    background: rgba(40, 167, 69, 0.1);
    color: #28a745;
  }
  
  .swagger-ui .response-col_status[data-code^="4"] {
    background: rgba(255, 193, 7, 0.1);
    color: #ffc107;
  }
  
  .swagger-ui .response-col_status[data-code^="5"] {
    background: rgba(220, 53, 69, 0.1);
    color: #dc3545;
  }
  
  /* 스키마 섹션 */
  .swagger-ui .model-container {
    background: #f8f9fa;
    border-radius: 8px;
    padding: 15px;
    margin: 10px 0;
    border: 1px solid #e2e8f0;
  }
  
  .swagger-ui .model-title {
    color: #2d3748;
    font-weight: 600;
    margin-bottom: 10px;
  }
  
  .swagger-ui .property-row {
    padding: 8px 0;
    border-bottom: 1px solid #e2e8f0;
  }
  
  .swagger-ui .property-row:last-child {
    border-bottom: none;
  }
  
  /* 실행 버튼 */
  .swagger-ui .btn.execute {
    background: linear-gradient(135deg, #667eea, #764ba2);
    border: none;
    border-radius: 8px;
    padding: 12px 24px;
    color: white;
    font-weight: 600;
    font-size: 14px;
    transition: all 0.3s ease;
    box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);
  }
  
  .swagger-ui .btn.execute:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4);
  }
  
  /* Try it out 버튼 */
  .swagger-ui .btn.try-out__btn {
    background: #28a745;
    border: none;
    border-radius: 6px;
    padding: 8px 16px;
    color: white;
    font-weight: 500;
    transition: all 0.2s ease;
  }
  
  .swagger-ui .btn.try-out__btn:hover {
    background: #218838;
    transform: translateY(-1px);
  }
  
  /* 취소 버튼 */
  .swagger-ui .btn.cancel {
    background: #6c757d;
    border: none;
    border-radius: 6px;
    padding: 8px 16px;
    color: white;
    font-weight: 500;
  }
  
  .swagger-ui .btn.cancel:hover {
    background: #5a6268;
  }
  
  /* 입력 필드 */
  .swagger-ui input[type="text"],
  .swagger-ui input[type="email"],
  .swagger-ui input[type="password"],
  .swagger-ui textarea,
  .swagger-ui select {
    border: 2px solid #e2e8f0;
    border-radius: 6px;
    padding: 10px 12px;
    font-size: 14px;
    transition: border-color 0.2s ease;
  }
  
  .swagger-ui input:focus,
  .swagger-ui textarea:focus,
  .swagger-ui select:focus {
    border-color: #667eea;
    outline: none;
    box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
  }
  
  /* 코드 블록 */
  .swagger-ui .highlight-code {
    background: #2d3748;
    color: #e2e8f0;
    border-radius: 8px;
    padding: 15px;
    font-family: 'Monaco', 'Consolas', monospace;
    font-size: 13px;
    line-height: 1.5;
    overflow-x: auto;
  }
  
  .swagger-ui .curl-command {
    background: #1a202c;
    color: #a0aec0;
    padding: 15px;
    border-radius: 8px;
    font-family: 'Monaco', 'Consolas', monospace;
    font-size: 12px;
    line-height: 1.4;
    overflow-x: auto;
    border: 1px solid #2d3748;
  }
  
  /* 스크롤바 커스터마이징 */
  .swagger-ui ::-webkit-scrollbar {
    width: 10px;
    height: 10px;
  }
  
  .swagger-ui ::-webkit-scrollbar-track {
    background: #f1f1f1;
    border-radius: 6px;
  }
  
  .swagger-ui ::-webkit-scrollbar-thumb {
    background: linear-gradient(135deg, #667eea, #764ba2);
    border-radius: 6px;
    transition: background 0.3s ease;
  }
  
  .swagger-ui ::-webkit-scrollbar-thumb:hover {
    background: linear-gradient(135deg, #5a67d8, #6b46c1);
  }
  
  /* 로딩 애니메이션 */
  .swagger-ui .loading-container {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 40px;
  }
  
  .swagger-ui .loading {
    border: 3px solid #f3f3f3;
    border-top: 3px solid #667eea;
    border-radius: 50%;
    width: 30px;
    height: 30px;
    animation: spin 1s linear infinite;
  }
  
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
  
  /* 반응형 디자인 */
  @media (max-width: 768px) {
    .swagger-ui .info .title {
      font-size: 2rem;
    }
    
    .swagger-ui .opblock-summary {
      flex-direction: column;
      align-items: flex-start;
    }
    
    .swagger-ui .opblock-summary-description {
      margin-left: 0;
      margin-top: 10px;
      text-align: left;
      max-width: 100%;
    }
    
    .enhanced-search > div {
      flex-direction: column;
      gap: 10px;
    }
    
    .enhanced-search input {
      width: 100% !important;
    }
  }
  
  /* 다크 모드 지원 */
  ${darkModeStyles}
  
  /* 테마 스타일 */
  ${themeStyles}
  
  /* 애니메이션 */
  ${animationStyles}
  
  /* 커스텀 배지 */
  .swagger-ui .opblock-summary::after {
    content: "";
    position: absolute;
    top: 10px;
    right: 15px;
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #28a745;
  }
  
  .swagger-ui .opblock[data-status="deprecated"]::after {
    background: #dc3545;
  }
  
  .swagger-ui .opblock[data-status="beta"]::after {
    background: #ffc107;
  }
  
  .swagger-ui .opblock[data-status="new"]::after {
    background: #17a2b8;
    animation: pulse 1.5s infinite;
  }
  
  @keyframes pulse {
    0% { opacity: 1; }
    50% { opacity: 0.5; }
    100% { opacity: 1; }
  }
  
  /* 검색 하이라이트 */
  .swagger-ui .search-highlight {
    background: yellow;
    padding: 2px 4px;
    border-radius: 3px;
    font-weight: bold;
  }
  
  /* 인증 상태 표시 */
  .swagger-ui .auth-container.authorized {
    border-left: 4px solid #28a745;
    background: rgba(40, 167, 69, 0.1);
  }
  
  .swagger-ui .auth-container.authorized::before {
    content: "✓ 인증됨";
    color: #28a745;
    font-weight: 600;
    display: block;
    margin-bottom: 10px;
  }
  
  /* 에러 메시지 스타일링 */
  .swagger-ui .errors-wrapper {
    background: rgba(220, 53, 69, 0.1);
    border: 1px solid #dc3545;
    border-radius: 8px;
    padding: 15px;
    margin: 10px 0;
  }
  
  .swagger-ui .errors-wrapper .error-wrapper {
    color: #dc3545;
    font-weight: 500;
  }
`;

export { darkModeStyles, themeStyles, animationStyles };
