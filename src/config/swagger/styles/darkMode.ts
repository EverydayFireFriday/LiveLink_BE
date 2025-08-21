export const darkModeStyles = `
  /* 다크 모드 토글 버튼 */
  .dark-mode-toggle {
    position: fixed;
    top: 20px;
    right: 20px;
    z-index: 1001;
    background: #3b82f6;
    color: white;
    border: none;
    border-radius: 50%;
    width: 50px;
    height: 50px;
    cursor: pointer;
    font-size: 18px;
    transition: all 0.3s ease;
    box-shadow: 0 4px 15px rgba(59, 130, 246, 0.3);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .dark-mode-toggle:hover {
    transform: scale(1.1);
    box-shadow: 0 6px 20px rgba(59, 130, 246, 0.4);
  }

  /* 다크 모드 스타일 개선 v3 (Gemini) */

  /* 상단 흰색 배경 수정 (강화) */
  html[data-theme="dark"],
  html[data-theme="dark"] body {
    background-color: #121212 !important;
  }
  html[data-theme="dark"] .swagger-ui .topbar,
  html[data-theme="dark"] .swagger-ui .information-container {
    background-color: #1E1E1E !important;
    border-bottom: 1px solid #333333 !important;
  }
  html[data-theme="dark"] .swagger-ui .topbar .link {
    color: #DDDDDD !important;
  }

  /* 기본 배경 및 폰트 색상 */
  html[data-theme="dark"] .swagger-ui,
  html[data-theme="dark"] .swagger-ui .wrapper {
    background-color: #121212 !important;
    color: #CCCCCC !important;
  }

  html[data-theme="dark"] .swagger-ui .info h1 {
    color: #63b3ed !important;
  }

  html[data-theme="dark"] .swagger-ui .info .title {
    color: #90cdf4 !important;
  }

  /* 설명 텍스트 가독성 개선 */
  html[data-theme="dark"] .swagger-ui .info .description {
    color: #DDDDDD !important;
  }

  html[data-theme="dark"] .swagger-ui .info .version {
    background: transparent !important;
    color: white !important;
    border: none !important;
    padding: 2px 5px !important; /* Add some padding */
  }

  html[data-theme="dark"] .swagger-ui .scheme-container,
  html[data-theme="dark"] .swagger-ui .filter-container {
    background: #121212 !important;
    border-color: #333333 !important;
  }

  html[data-theme="dark"] .swagger-ui .filter .operation-filter-input {
    background: #252526 !important;
    border-color: #333333 !important;
    color: #CCCCCC !important;
  }

  html[data-theme="dark"] .swagger-ui .filter .operation-filter-input::placeholder {
    color: #999999 !important;
  }

  /* API 블록 스타일 */
  html[data-theme="dark"] .swagger-ui .opblock {
    background: #1E1E1E !important;
    border-color: #333333 !important;
  }

  html[data-theme="dark"] .swagger-ui .opblock .opblock-summary {
    background: #252526 !important;
    color: #CCCCCC !important;
    border-color: #333333 !important;
  }

  html[data-theme="dark"] .swagger-ui .opblock-summary-path {
    color: #63b3ed !important;
    font-weight: 600 !important;
  }

  /* API 요약 설명 텍스트 가독성 개선 */
  html[data-theme="dark"] .swagger-ui .opblock-summary-description {
    color: #BBBBBB !important;
  }

  html[data-theme="dark"] .swagger-ui .opblock-summary-method {
    color: white !important;
    font-weight: bold !important;
  }

  html[data-theme="dark"] .swagger-ui .opblock-body {
    background: #1E1E1E !important;
    color: #CCCCCC !important;
  }

  html[data-theme="dark"] .swagger-ui .parameters,
  html[data-theme="dark"] .swagger-ui .responses-wrapper,
  html[data-theme="dark"] .swagger-ui .model-box-control {
    background: #1E1E1E !important;
    color: #CCCCCC !important;
    border-color: #333333 !important;
  }

  html[data-theme="dark"] .swagger-ui table,
  html[data-theme="dark"] .swagger-ui table thead tr td,
  html[data-theme="dark"] .swagger-ui table thead tr th {
    background: #252526 !important;
    color: #CCCCCC !important;
    border-color: #333333 !important;
  }

  html[data-theme="dark"] .swagger-ui table tbody tr td {
    background: #1E1E1E !important;
    color: #CCCCCC !important;
    border-color: #333333 !important;
  }

  html[data-theme="dark"] .swagger-ui .model-box {
    background: #1E1E1E !important;
    border-color: #333333 !important;
    color: #CCCCCC !important;
  }

  /* 입력 필드 */
  html[data-theme="dark"] .swagger-ui input[type="text"],
  html[data-theme="dark"] .swagger-ui input[type="email"],
  html[data-theme="dark"] .swagger-ui input[type="password"],
  html[data-theme="dark"] .swagger-ui textarea,
  html[data-theme="dark"] .swagger-ui select {
    background: #252526 !important;
    color: white !important;
    border: 1px solid #333333 !important;
  }

  /* 코드 블록 */
  html[data-theme="dark"] .swagger-ui .highlight-code,
  html[data-theme="dark"] .swagger-ui .microlight,
  html[data-theme="dark"] .swagger-ui pre,
  html[data-theme="dark"] .swagger-ui code {
    background: #252526 !important;
    color: white !important;
    border: 1px solid #333333 !important;
  }

  html[data-theme="dark"] .swagger-ui .responses-inner h4,
  html[data-theme="dark"] .swagger-ui .response-col_status {
    color: #CCCCCC !important;
  }

  /* 버튼 */
  html[data-theme="dark"] .swagger-ui .btn {
    background: #4299e1 !important;
    color: white !important;
    border-color: #3182ce !important;
  }

  html[data-theme="dark"] .swagger-ui .btn:hover {
    background: #3182ce !important;
  }

  html[data-theme="dark"] .swagger-ui .btn.execute {
    background: #48bb78 !important;
    border-color: #38a169 !important;
  }

  html[data-theme="dark"] .swagger-ui .btn.execute:hover {
    background: #38a169 !important;
  }

  /* 스크롤바 */
  html[data-theme="dark"] .swagger-ui ::-webkit-scrollbar-track {
    background: #1E1E1E !important;
  }

  html[data-theme="dark"] .swagger-ui ::-webkit-scrollbar-thumb {
    background: #555555 !important;
  }

  /* 인증 모달 */
  html[data-theme="dark"] .swagger-ui .dialog-ux .modal-ux {
    background: #1E1E1E !important;
    border: 1px solid #333333 !important;
  }

  html[data-theme="dark"] .swagger-ui .dialog-ux .modal-ux-header {
    background: #252526 !important;
    color: #CCCCCC !important;
    border-bottom: 1px solid #333333 !important;
  }

  html[data-theme="dark"] .swagger-ui .dialog-ux .modal-ux-content {
    background: #1E1E1E !important;
    color: #CCCCCC !important;
  }

  html[data-theme="dark"] .swagger-ui .auth-container {
    background: #1E1E1E !important;
    color: #CCCCCC !important;
  }

  html[data-theme="dark"] .swagger-ui .auth-container h4,
  html[data-theme="dark"] .swagger-ui .auth-container h5,
  html[data-theme="dark"] .swagger-ui .auth-container label {
    color: #CCCCCC !important;
  }

  html[data-theme="dark"] .swagger-ui .auth-container .auth-btn-wrapper {
    background: #252526 !important;
    border: 1px solid #333333 !important;
  }

  html[data-theme="dark"] .swagger-ui .auth-container input[type="text"],
  html[data-theme="dark"] .swagger-ui .auth-container input[type="password"] {
    background: #252526 !important;
    color: #CCCCCC !important;
    border: 1px solid #333333 !important;
  }

  html[data-theme="dark"] .swagger-ui .auth-container textarea {
    background: #252526 !important;
    color: #CCCCCC !important;
    border: 1px solid #333333 !important;
  }

  html[data-theme="dark"] .swagger-ui .auth-container .close-modal {
    color: #CCCCCC !important;
  }

  html[data-theme="dark"] .swagger-ui .auth-container .close-modal:hover {
    color: #FFFFFF !important;
  }

  html[data-theme="dark"] .swagger-ui .dialog-ux .backdrop-ux {
    background: rgba(0, 0, 0, 0.8) !important;
  }

  /* 다크모드 태그 스타일 통일 */
  html[data-theme="dark"] .swagger-ui .opblock-tag {
    background-color: #222222 !important;
    border: 1px solid #444444 !important;
    color: #87CEEB !important;
    box-shadow: none !important;
  }

  /* 인증 모달 가독성 개선 (Gemini) */
  html[data-theme="dark"] .swagger-ui .auth-container {
    background: #2d2d2d !important; /* 어두운 배경색으로 변경 */
  }

  html[data-theme="dark"] .swagger-ui .auth-container h4 {
    color: #87ceeb !important; /* 밝은 하늘색으로 변경 */
  }

  html[data-theme="dark"] .swagger-ui .auth-container .renderedMarkdown p,
  html[data-theme="dark"] .swagger-ui .auth-container .wrapper p {
    color: #e0e0e0 !important; /* 밝은 회색으로 변경 */
  }

  html[data-theme="dark"] .swagger-ui .auth-container label {
    color: #f0f0f0 !important; /* 더 밝은 흰색으로 변경 */
  }

  html[data-theme="dark"] .swagger-ui .auth-container input[type="text"] {
    background: #3c3c3c !important;
    color: #ffffff !important;
    border: 1px solid #555555 !important;
  }

  html[data-theme="dark"] .swagger-ui .auth-btn-wrapper {
    background-color: #2d2d2d !important;
    border-top: 1px solid #444444 !important;
  }

  html[data-theme="dark"] .swagger-ui .auth-btn-wrapper .btn.authorize {
    background-color: #007bff !important;
    color: #ffffff !important;
  }

  html[data-theme="dark"] .swagger-ui .auth-btn-wrapper .btn.btn-done {
    background-color: #6c757d !important;
    color: #ffffff !important;
  }

  /* 다크 모드 작은 글씨 가독성 개선 */
  html[data-theme="dark"] .swagger-ui small,
  html[data-theme="dark"] .swagger-ui .renderedMarkdown,
  html[data-theme="dark"] .swagger-ui .renderedMarkdown p,
  html[data-theme="dark"] .swagger-ui p,
  html[data-theme="dark"] .swagger-ui li,
  html[data-theme="dark"] .swagger-ui td,
  html[data-theme="dark"] .swagger-ui th {
    color: #DDDDDD !important;
  }
`;
