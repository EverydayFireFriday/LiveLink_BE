export const rainbowModeStyles = `
  /* 레인보우 모드 토글 버튼 */
  .rainbow-mode-toggle {
    position: fixed;
    top: 20px;
    right: 80px;
    z-index: 1001;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    border: none;
    border-radius: 50%;
    width: 50px;
    height: 50px;
    cursor: pointer;
    font-size: 18px;
    transition: all 0.3s ease;
    box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .rainbow-mode-toggle:hover {
    transform: scale(1.1);
    box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4);
  }

  /* 레인보우 모드 스타일 */
  html[data-theme="rainbow"],
  html[data-theme="rainbow"] body {
    background: linear-gradient(135deg, var(--rainbow-bg-start) 0%, var(--rainbow-bg-end) 100%) !important;
  }

  html[data-theme="rainbow"] .swagger-ui .topbar,
  html[data-theme="rainbow"] .swagger-ui .information-container {
    background: linear-gradient(135deg, var(--rainbow-primary) 0%, var(--rainbow-secondary) 100%) !important;
    border-bottom: 2px solid var(--rainbow-accent) !important;
  }

  html[data-theme="rainbow"] .swagger-ui .topbar .link {
    color: #FFFFFF !important;
    text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
  }

  /* 기본 배경 및 폰트 색상 */
  html[data-theme="rainbow"] .swagger-ui,
  html[data-theme="rainbow"] .swagger-ui .wrapper {
    background: transparent !important;
    color: var(--rainbow-text) !important;
  }

  html[data-theme="rainbow"] .swagger-ui .info h1 {
    color: var(--rainbow-heading) !important;
    text-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  }

  html[data-theme="rainbow"] .swagger-ui .info .title {
    color: var(--rainbow-heading) !important;
    text-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  }

  /* 설명 텍스트 */
  html[data-theme="rainbow"] .swagger-ui .info .description {
    color: var(--rainbow-text) !important;
  }

  html[data-theme="rainbow"] .swagger-ui .info .version {
    background: transparent !important;
    color: var(--rainbow-text) !important;
    border: 1px solid #e5e7eb !important;
    padding: 4px 10px !important;
    border-radius: 6px;
  }

  html[data-theme="rainbow"] .swagger-ui .scheme-container,
  html[data-theme="rainbow"] .swagger-ui .filter-container {
    background: rgba(255, 255, 255, 0.9) !important;
    border: 2px solid var(--rainbow-accent) !important;
    border-radius: 12px;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
  }

  html[data-theme="rainbow"] .swagger-ui .filter .operation-filter-input {
    background: rgba(255, 255, 255, 0.95) !important;
    border: 2px solid var(--rainbow-accent) !important;
    color: var(--rainbow-text) !important;
    border-radius: 8px;
  }

  html[data-theme="rainbow"] .swagger-ui .filter .operation-filter-input::placeholder {
    color: #999999 !important;
  }

  /* API 블록 스타일 */
  html[data-theme="rainbow"] .swagger-ui .opblock {
    background: rgba(255, 255, 255, 0.95) !important;
    border: 2px solid var(--rainbow-accent) !important;
    border-radius: 12px;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
  }

  html[data-theme="rainbow"] .swagger-ui .opblock .opblock-summary {
    background: linear-gradient(135deg, var(--rainbow-primary) 0%, var(--rainbow-secondary) 100%) !important;
    color: #FFFFFF !important;
    border: none !important;
    border-radius: 10px 10px 0 0;
  }

  html[data-theme="rainbow"] .swagger-ui .opblock-summary-path {
    color: #FFFFFF !important;
    font-weight: 700 !important;
    text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
  }

  html[data-theme="rainbow"] .swagger-ui .opblock-summary-description {
    color: rgba(255, 255, 255, 0.9) !important;
  }

  html[data-theme="rainbow"] .swagger-ui .opblock-summary-method {
    color: white !important;
    font-weight: bold !important;
    background: rgba(255, 255, 255, 0.2) !important;
    border-radius: 6px;
  }

  html[data-theme="rainbow"] .swagger-ui .opblock-body {
    background: rgba(255, 255, 255, 0.98) !important;
    color: var(--rainbow-text) !important;
  }

  html[data-theme="rainbow"] .swagger-ui .parameters,
  html[data-theme="rainbow"] .swagger-ui .responses-wrapper,
  html[data-theme="rainbow"] .swagger-ui .model-box-control {
    background: rgba(255, 255, 255, 0.95) !important;
    color: var(--rainbow-text) !important;
    border-color: var(--rainbow-accent) !important;
  }

  html[data-theme="rainbow"] .swagger-ui table,
  html[data-theme="rainbow"] .swagger-ui table thead tr td,
  html[data-theme="rainbow"] .swagger-ui table thead tr th {
    background: linear-gradient(135deg, var(--rainbow-primary-light) 0%, var(--rainbow-secondary-light) 100%) !important;
    color: #FFFFFF !important;
    border-color: var(--rainbow-accent) !important;
    font-weight: bold;
  }

  html[data-theme="rainbow"] .swagger-ui table tbody tr td {
    background: rgba(255, 255, 255, 0.95) !important;
    color: var(--rainbow-text) !important;
    border-color: var(--rainbow-accent) !important;
  }

  html[data-theme="rainbow"] .swagger-ui .model-box {
    background: rgba(255, 255, 255, 0.95) !important;
    border: 2px solid var(--rainbow-accent) !important;
    color: var(--rainbow-text) !important;
    border-radius: 8px;
  }

  /* 입력 필드 */
  html[data-theme="rainbow"] .swagger-ui input[type="text"],
  html[data-theme="rainbow"] .swagger-ui input[type="email"],
  html[data-theme="rainbow"] .swagger-ui input[type="password"],
  html[data-theme="rainbow"] .swagger-ui textarea,
  html[data-theme="rainbow"] .swagger-ui select {
    background: rgba(255, 255, 255, 0.95) !important;
    color: var(--rainbow-text) !important;
    border: 2px solid var(--rainbow-accent) !important;
    border-radius: 6px;
  }

  /* 코드 블록 */
  html[data-theme="rainbow"] .swagger-ui .highlight-code,
  html[data-theme="rainbow"] .swagger-ui .microlight,
  html[data-theme="rainbow"] .swagger-ui pre,
  html[data-theme="rainbow"] .swagger-ui code {
    background: rgba(40, 40, 40, 0.95) !important;
    color: #f8f8f2 !important;
    border: 2px solid var(--rainbow-accent) !important;
    border-radius: 8px;
  }

  html[data-theme="rainbow"] .swagger-ui .responses-inner h4,
  html[data-theme="rainbow"] .swagger-ui .response-col_status {
    color: var(--rainbow-heading) !important;
    font-weight: bold;
  }

  /* 버튼 */
  html[data-theme="rainbow"] .swagger-ui .btn {
    background: linear-gradient(135deg, var(--rainbow-primary) 0%, var(--rainbow-secondary) 100%) !important;
    color: white !important;
    border: none !important;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  }

  html[data-theme="rainbow"] .swagger-ui .btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 16px rgba(0, 0, 0, 0.3);
  }

  html[data-theme="rainbow"] .swagger-ui .btn.execute {
    background: linear-gradient(135deg, var(--rainbow-accent) 0%, var(--rainbow-secondary) 100%) !important;
  }

  /* 스크롤바 */
  html[data-theme="rainbow"] .swagger-ui ::-webkit-scrollbar-track {
    background: rgba(255, 255, 255, 0.3) !important;
    border-radius: 4px;
  }

  html[data-theme="rainbow"] .swagger-ui ::-webkit-scrollbar-thumb {
    background: linear-gradient(135deg, var(--rainbow-primary) 0%, var(--rainbow-secondary) 100%) !important;
    border-radius: 4px;
  }

  /* 인증 모달 */
  html[data-theme="rainbow"] .swagger-ui .dialog-ux .modal-ux {
    background: rgba(255, 255, 255, 0.98) !important;
    border: 3px solid var(--rainbow-accent) !important;
    border-radius: 12px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  }

  html[data-theme="rainbow"] .swagger-ui .dialog-ux .modal-ux-header {
    background: linear-gradient(135deg, var(--rainbow-primary) 0%, var(--rainbow-secondary) 100%) !important;
    color: #FFFFFF !important;
    border-bottom: none !important;
    border-radius: 9px 9px 0 0;
  }

  html[data-theme="rainbow"] .swagger-ui .dialog-ux .modal-ux-content {
    background: rgba(255, 255, 255, 0.98) !important;
    color: var(--rainbow-text) !important;
  }

  html[data-theme="rainbow"] .swagger-ui .auth-container {
    background: rgba(255, 255, 255, 0.95) !important;
    color: var(--rainbow-text) !important;
  }

  html[data-theme="rainbow"] .swagger-ui .auth-container h4,
  html[data-theme="rainbow"] .swagger-ui .auth-container h5,
  html[data-theme="rainbow"] .swagger-ui .auth-container label {
    color: var(--rainbow-heading) !important;
    font-weight: bold;
  }

  html[data-theme="rainbow"] .swagger-ui .auth-container .auth-btn-wrapper {
    background: rgba(240, 240, 240, 0.95) !important;
    border: 2px solid var(--rainbow-accent) !important;
    border-radius: 0 0 8px 8px;
  }

  html[data-theme="rainbow"] .swagger-ui .auth-container input[type="text"],
  html[data-theme="rainbow"] .swagger-ui .auth-container input[type="password"] {
    background: rgba(255, 255, 255, 0.98) !important;
    color: var(--rainbow-text) !important;
    border: 2px solid var(--rainbow-accent) !important;
    border-radius: 6px;
  }

  html[data-theme="rainbow"] .swagger-ui .auth-container textarea {
    background: rgba(255, 255, 255, 0.98) !important;
    color: var(--rainbow-text) !important;
    border: 2px solid var(--rainbow-accent) !important;
    border-radius: 6px;
  }

  html[data-theme="rainbow"] .swagger-ui .auth-container .close-modal {
    color: #FFFFFF !important;
  }

  html[data-theme="rainbow"] .swagger-ui .auth-container .close-modal:hover {
    color: var(--rainbow-accent) !important;
  }

  html[data-theme="rainbow"] .swagger-ui .dialog-ux .backdrop-ux {
    background: rgba(0, 0, 0, 0.6) !important;
  }

  /* 레인보우모드 태그 스타일 */
  html[data-theme="rainbow"] .swagger-ui .opblock-tag {
    background: linear-gradient(135deg, var(--rainbow-primary-light) 0%, var(--rainbow-secondary-light) 100%) !important;
    border: 2px solid var(--rainbow-accent) !important;
    color: #FFFFFF !important;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15) !important;
    border-radius: 8px;
    font-weight: bold;
    text-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  }

  /* 인증 모달 버튼 */
  html[data-theme="rainbow"] .swagger-ui .auth-container .renderedMarkdown p,
  html[data-theme="rainbow"] .swagger-ui .auth-container .wrapper p {
    color: var(--rainbow-text) !important;
  }

  html[data-theme="rainbow"] .swagger-ui .auth-btn-wrapper .btn.authorize {
    background: linear-gradient(135deg, var(--rainbow-primary) 0%, var(--rainbow-secondary) 100%) !important;
    color: #ffffff !important;
  }

  html[data-theme="rainbow"] .swagger-ui .auth-btn-wrapper .btn.btn-done {
    background: linear-gradient(135deg, var(--rainbow-secondary) 0%, var(--rainbow-accent) 100%) !important;
    color: #ffffff !important;
  }

  /* 작은 글씨 가독성 */
  html[data-theme="rainbow"] .swagger-ui small,
  html[data-theme="rainbow"] .swagger-ui .renderedMarkdown,
  html[data-theme="rainbow"] .swagger-ui .renderedMarkdown p,
  html[data-theme="rainbow"] .swagger-ui p,
  html[data-theme="rainbow"] .swagger-ui li,
  html[data-theme="rainbow"] .swagger-ui td,
  html[data-theme="rainbow"] .swagger-ui th {
    color: var(--rainbow-text) !important;
  }

  /* Authorize 버튼 색상 */
  html[data-theme="rainbow"] .swagger-ui .authorization__btn svg path {
    fill: var(--rainbow-accent) !important;
  }
`;
