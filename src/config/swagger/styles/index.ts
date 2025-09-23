import { baseStyles } from './themes';
import { darkModeStyles } from './darkMode';
import { animationStyles } from './animations';

export const customStyles = `
  
  ${baseStyles}
  ${darkModeStyles}
  ${animationStyles}

  /* Vertically align version and OAS info next to title */
  h2.title {
    display: flex;
    align-items: center; /* Vertically align items */
    gap: 10px; /* Add some space between title and version info */
  }

  h2.title span {
    display: flex;
    align-items: center; /* Ensure content within span is also aligned */
    font-size: 0.8em; /* Adjust font size if needed */
  }

  h2.title small {
    display: inline-block; /* Keep small tags inline for horizontal arrangement */
    margin-left: 5px; /* Space between version and OAS */
  }

  /* Custom styles for session authorization modal */
  
  /* 모달 배경 */
  html[data-theme="dark"] .swagger-ui .dialog-ux .backdrop-ux {
    background: rgba(0, 0, 0, 0.85) !important;
  }

  /* 모달 전체 컨테이너 - 모든 하위 요소 강제 통일 */
  html[data-theme="dark"] .swagger-ui .dialog-ux .modal-ux,
  html[data-theme="dark"] .swagger-ui .modal-ux-inner,
  html[data-theme="dark"] .swagger-ui .modal-ux-content,
  html[data-theme="dark"] .swagger-ui .auth-container,
  html[data-theme="dark"] .swagger-ui .auth-container form,
  html[data-theme="dark"] .swagger-ui .auth-container .wrapper,
  html[data-theme="dark"] .swagger-ui .auth-container .renderedMarkdown,
  html[data-theme="dark"] .swagger-ui .auth-container section {
    background-color: #2c2c2c !important;
  }

  /* 헤더 영역 - 강제 배경색 통일 */
  html[data-theme="dark"] .swagger-ui .modal-ux-header,
  html[data-theme="dark"] .swagger-ui .dialog-ux .modal-ux-header,
  html[data-theme="dark"] .swagger-ui .modal-ux-inner .modal-ux-header {
    background-color: #2c2c2c !important;
    background: #2c2c2c !important;
    border-bottom: 1px solid #404040 !important;
    padding: 16px 20px !important;
  }

  /* 헤더 제목 */
  html[data-theme="dark"] .swagger-ui .modal-ux-header h3 {
    background-color: #2c2c2c !important;
    background: #2c2c2c !important;
    color: #ffffff !important;
    font-weight: 600 !important;
    margin: 0 !important;
  }

  /* 닫기 버튼 */
  html[data-theme="dark"] .swagger-ui .modal-ux-header .close-modal,
  html[data-theme="dark"] .swagger-ui .modal-ux-header button.close-modal {
    background-color: #2c2c2c !important;
    background: #2c2c2c !important;
    border: none !important;
    cursor: pointer !important;
  }

  html[data-theme="dark"] .swagger-ui .modal-ux-header .close-modal svg path {
    fill: #999999 !important;
  }

  html[data-theme="dark"] .swagger-ui .modal-ux-header .close-modal:hover svg path {
    fill: #ffffff !important;
  }

  /* 버튼 영역 - 강제 배경색 통일 */
  html[data-theme="dark"] .swagger-ui .auth-btn-wrapper,
  html[data-theme="dark"] .swagger-ui .auth-container .auth-btn-wrapper,
  html[data-theme="dark"] .swagger-ui .modal-ux-content .auth-btn-wrapper {
    background-color: #2c2c2c !important;
    background: #2c2c2c !important;
    border: none !important;
    border-top: none !important;
    padding: 24px 0 0 0 !important;
    display: flex !important;
    gap: 12px !important;
    justify-content: center !important;
  }

  /* 콘텐츠 영역 */
  html[data-theme="dark"] .swagger-ui .modal-ux-content {
    background-color: #2c2c2c !important;
    padding: 20px !important;
  }

  /* 제목 */
  html[data-theme="dark"] .swagger-ui .auth-container h4 {
    background-color: #2c2c2c !important;
    color: #ffffff !important;
    font-weight: 600 !important;
    margin-bottom: 16px !important;
  }

  /* 설명 텍스트 */
  html[data-theme="dark"] .swagger-ui .auth-container .renderedMarkdown p,
  html[data-theme="dark"] .swagger-ui .auth-container p {
    background-color: #2c2c2c !important;
    color: #e5e5e5 !important;
    margin-bottom: 12px !important;
  }

  /* 코드 태그 (sessionAuth, app.session.id, cookie) */
  html[data-theme="dark"] .swagger-ui .auth-container code {
    background-color: #2c2c2c !important;
    color: #7dd3fc !important;
    border: none !important;
    padding: 0 !important;
    font-family: 'Monaco', 'Menlo', monospace !important;
    font-weight: 500 !important;
  }

  /* wrapper 영역 (Value 라벨 포함) */
  html[data-theme="dark"] .swagger-ui .auth-container .wrapper {
    background-color: #2c2c2c !important;
    padding: 0 !important;
    margin: 12px 0 !important;
  }

  /* 라벨 - Value: 부분 */
  html[data-theme="dark"] .swagger-ui .auth-container .wrapper label,
  html[data-theme="dark"] .swagger-ui .auth-container label {
    background-color: #2c2c2c !important;
    color: #e5e5e5 !important;
    font-weight: 500 !important;
    display: block !important;
    margin-bottom: 8px !important;
  }

  /* section 요소 */
  html[data-theme="dark"] .swagger-ui .auth-container .wrapper section,
  html[data-theme="dark"] .swagger-ui .auth-container section {
    background-color: #2c2c2c !important;
    padding: 0 !important;
    margin: 0 !important;
  }

  /* 입력 필드 */
  html[data-theme="dark"] .swagger-ui .auth-container input[type="text"],
  html[data-theme="dark"] .swagger-ui .auth-container input[type="password"],
  html[data-theme="dark"] .swagger-ui .auth-container #api_key_value {
    background-color: #1a1a1a !important;
    color: #ffffff !important;
    border: 2px solid #404040 !important;
    border-radius: 8px !important;
    padding: 12px 16px !important;
    width: 100% !important;
    font-size: 14px !important;
  }

  html[data-theme="dark"] .swagger-ui .auth-container input[type="text"]:focus,
  html[data-theme="dark"] .swagger-ui .auth-container input[type="password"]:focus,
  html[data-theme="dark"] .swagger-ui .auth-container #api_key_value:focus {
    border-color: #007bff !important;
    outline: none !important;
    box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.1) !important;
  }

  /* Authorize 버튼 */
  html[data-theme="dark"] .swagger-ui .auth-btn-wrapper .btn.authorize {
    background-color: #007bff !important;
    color: #ffffff !important;
    border: none !important;
    padding: 12px 24px !important;
    border-radius: 8px !important;
    font-weight: 600 !important;
    cursor: pointer !important;
    transition: all 0.2s ease !important;
  }

  html[data-theme="dark"] .swagger-ui .auth-btn-wrapper .btn.authorize:hover {
    background-color: #0056b3 !important;
  }

  /* Close 버튼 */
  html[data-theme="dark"] .swagger-ui .auth-btn-wrapper .btn.btn-done {
    background-color: #6c757d !important;
    color: #ffffff !important;
    border: none !important;
    padding: 12px 24px !important;
    border-radius: 8px !important;
    font-weight: 600 !important;
    cursor: pointer !important;
    transition: all 0.2s ease !important;
  }

  html[data-theme="dark"] .swagger-ui .auth-btn-wrapper .btn.btn-done:hover {
    background-color: #545b62 !important;
  }

  /* 최종 강제 적용 - 헤더의 모든 요소 통일 */
  html[data-theme="dark"] .swagger-ui .modal-ux-header *:not(svg):not(path) {
    background-color: #2c2c2c !important;
  }

  /* 최종 강제 적용 - 콘텐츠의 모든 요소 통일 */
  html[data-theme="dark"] .swagger-ui .auth-container > *:not(input):not(button),
  html[data-theme="dark"] .swagger-ui .auth-container div:not(.auth-btn-wrapper) > *:not(input):not(button) {
    background-color: #2c2c2c !important;
  }
`;
