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

  /* 다크 모드 스타일 - CSS 문법 오류 완전 수정 */
  html[data-theme="dark"] .swagger-ui,
  html[data-theme="dark"] .swagger-ui .wrapper {
    background-color: #1a202c !important;
    color: #e2e8f0 !important;
  }

  html[data-theme="dark"] .swagger-ui .info h1 {
    color: #63b3ed !important;
  }

  html[data-theme="dark"] .swagger-ui .info .title {
    color: #90cdf4 !important;
  }

  html[data-theme="dark"] .swagger-ui .info .description {
    color: #cbd5e0 !important;
  }

  html[data-theme="dark"] .swagger-ui .info .version {
    background: #4a5568 !important;
    color: #e2e8f0 !important;
    border: 1px solid #718096 !important;
  }

  html[data-theme="dark"] .swagger-ui .scheme-container {
    background: #1a202c !important;
    border-color: #2d3748 !important;
    color: #e2e8f0 !important;
  }

  html[data-theme="dark"] .swagger-ui .filter-container {
    background: #1a202c !important;
    border-color: #2d3748 !important;
  }

  html[data-theme="dark"] .swagger-ui .filter .operation-filter-input {
    background: #2d3748 !important;
    border-color: #4a5568 !important;
    color: #e2e8f0 !important;
  }

  html[data-theme="dark"] .swagger-ui .filter .operation-filter-input::placeholder {
    color: #a0aec0 !important;
  }

  html[data-theme="dark"] .swagger-ui .opblock {
    background: #2d3748 !important;
    border-color: #4a5568 !important;
  }

  html[data-theme="dark"] .swagger-ui .opblock .opblock-summary {
    background: #4a5568 !important;
    color: #e2e8f0 !important;
    border-color: #718096 !important;
  }

  html[data-theme="dark"] .swagger-ui .opblock-summary-path {
    color: #f7fafc !important;
    font-weight: 600 !important;
  }

  html[data-theme="dark"] .swagger-ui .opblock-summary-description {
    color: #cbd5e0 !important;
  }

  html[data-theme="dark"] .swagger-ui .opblock-summary-method {
    color: white !important;
    font-weight: bold !important;
  }

  html[data-theme="dark"] .swagger-ui .opblock-body {
    background: #2d3748 !important;
    color: #e2e8f0 !important;
  }

  html[data-theme="dark"] .swagger-ui .parameters,
  html[data-theme="dark"] .swagger-ui .responses-wrapper,
  html[data-theme="dark"] .swagger-ui .model-box-control {
    background: #2d3748 !important;
    color: #e2e8f0 !important;
    border-color: #4a5568 !important;
  }

  html[data-theme="dark"] .swagger-ui table,
  html[data-theme="dark"] .swagger-ui table thead tr td,
  html[data-theme="dark"] .swagger-ui table thead tr th {
    background: #4a5568 !important;
    color: #e2e8f0 !important;
    border-color: #718096 !important;
  }

  html[data-theme="dark"] .swagger-ui table tbody tr td {
    background: #2d3748 !important;
    color: #e2e8f0 !important;
    border-color: #4a5568 !important;
  }

  html[data-theme="dark"] .swagger-ui .model-box {
    background: #2d3748 !important;
    border-color: #4a5568 !important;
    color: #e2e8f0 !important;
  }

  html[data-theme="dark"] .swagger-ui input[type="text"],
  html[data-theme="dark"] .swagger-ui input[type="email"],
  html[data-theme="dark"] .swagger-ui input[type="password"],
  html[data-theme="dark"] .swagger-ui textarea,
  html[data-theme="dark"] .swagger-ui select {
    background: #4a5568 !important;
    color: #e2e8f0 !important;
    border-color: #718096 !important;
  }

  html[data-theme="dark"] .swagger-ui .highlight-code,
  html[data-theme="dark"] .swagger-ui .microlight,
  html[data-theme="dark"] .swagger-ui pre,
  html[data-theme="dark"] .swagger-ui code {
    background: #4a5568 !important;
    color: #e2e8f0 !important;
    border: 1px solid #718096 !important;
  }

  html[data-theme="dark"] .swagger-ui .responses-inner h4,
  html[data-theme="dark"] .swagger-ui .response-col_status {
    color: #e2e8f0 !important;
  }

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

  html[data-theme="dark"] .swagger-ui ::-webkit-scrollbar-track {
    background: #2d3748 !important;
  }

  html[data-theme="dark"] .swagger-ui ::-webkit-scrollbar-thumb {
    background: linear-gradient(135deg, #4a5568 0%, #718096 100%) !important;
  }

  /* 다크 모드 인증 모달 스타일 */
  html[data-theme="dark"] .swagger-ui .dialog-ux .modal-ux {
    background: #1a202c !important;
    border: 1px solid #4a5568 !important;
  }

  html[data-theme="dark"] .swagger-ui .dialog-ux .modal-ux-header {
    background: #2d3748 !important;
    color: #e2e8f0 !important;
    border-bottom: 1px solid #4a5568 !important;
  }

  html[data-theme="dark"] .swagger-ui .dialog-ux .modal-ux-content {
    background: #1a202c !important;
    color: #e2e8f0 !important;
  }

  html[data-theme="dark"] .swagger-ui .auth-container {
    background: #1a202c !important;
    color: #e2e8f0 !important;
  }

  html[data-theme="dark"] .swagger-ui .auth-container h4,
  html[data-theme="dark"] .swagger-ui .auth-container h5,
  html[data-theme="dark"] .swagger-ui .auth-container label {
    color: #e2e8f0 !important;
  }

  html[data-theme="dark"] .swagger-ui .auth-container .auth-btn-wrapper {
    background: #2d3748 !important;
    border: 1px solid #4a5568 !important;
  }

  html[data-theme="dark"] .swagger-ui .auth-container input[type="text"],
  html[data-theme="dark"] .swagger-ui .auth-container input[type="password"] {
    background: #4a5568 !important;
    color: #e2e8f0 !important;
    border: 1px solid #718096 !important;
  }

  html[data-theme="dark"] .swagger-ui .auth-container textarea {
    background: #4a5568 !important;
    color: #e2e8f0 !important;
    border: 1px solid #718096 !important;
  }

  html[data-theme="dark"] .swagger-ui .auth-container .close-modal {
    color: #e2e8f0 !important;
  }

  html[data-theme="dark"] .swagger-ui .auth-container .close-modal:hover {
    color: #f7fafc !important;
  }

  html[data-theme="dark"] .swagger-ui .dialog-ux .backdrop-ux {
    background: rgba(0, 0, 0, 0.7) !important;
  }

  /* 다크 모드에서 그라디언트 태그들이 더 잘 보이도록 조정 */
  html[data-theme="dark"] .swagger-ui .opblock-tag[data-tag*="Health"] { 
    box-shadow: 0 4px 15px rgba(132, 250, 176, 0.4) !important;
  }

  html[data-theme="dark"] .swagger-ui .opblock-tag[data-tag*="Auth"] { 
    box-shadow: 0 4px 15px rgba(168, 237, 234, 0.4) !important;
  }

  html[data-theme="dark"] .swagger-ui .opblock-tag[data-tag*="Registration"] { 
    box-shadow: 0 4px 15px rgba(255, 236, 210, 0.4) !important;
  }

  html[data-theme="dark"] .swagger-ui .opblock-tag[data-tag*="Password"] { 
    box-shadow: 0 4px 15px rgba(255, 154, 158, 0.4) !important;
  }

  html[data-theme="dark"] .swagger-ui .opblock-tag[data-tag*="Profile"] { 
    box-shadow: 0 4px 15px rgba(168, 202, 186, 0.4) !important;
  }

  html[data-theme="dark"] .swagger-ui .opblock-tag[data-tag*="Verification"] { 
    box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4) !important;
  }

  html[data-theme="dark"] .swagger-ui .opblock-tag[data-tag*="Concerts - Basic"] { 
    box-shadow: 0 4px 15px rgba(116, 185, 255, 0.4) !important;
  }

  html[data-theme="dark"] .swagger-ui .opblock-tag[data-tag*="Concerts - Like"] { 
    box-shadow: 0 4px 15px rgba(253, 121, 168, 0.4) !important;
  }

  html[data-theme="dark"] .swagger-ui .opblock-tag[data-tag*="Concerts - Search"] { 
    box-shadow: 0 4px 15px rgba(0, 184, 148, 0.4) !important;
  }

  html[data-theme="dark"] .swagger-ui .opblock-tag[data-tag*="Concerts - Batch"] { 
    box-shadow: 0 4px 15px rgba(253, 203, 110, 0.4) !important;
  }

  html[data-theme="dark"] .swagger-ui .opblock-tag[data-tag*="Admin"] { 
    box-shadow: 0 4px 15px rgba(108, 92, 231, 0.4) !important;
  }
`;
