export const animationStyles = `
  /* 애니메이션 효과 */
  .swagger-ui .opblock { 
    transition: all 0.2s ease;
    border-radius: 6px;
    margin: 5px 0;
  }
  
  .swagger-ui .opblock:hover { 
    transform: translateX(2px);
  }
  
  .swagger-ui .opblock-tag:hover { 
    transform: translateY(-2px);
    box-shadow: 0 8px 25px rgba(0,0,0,0.15);
  }
  
  /* 부드러운 전환 효과 */
  .swagger-ui .opblock-summary {
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }
  
  .swagger-ui .opblock-summary:hover {
    background-color: rgba(59, 130, 246, 0.05);
  }
  
  /* 버튼 호버 애니메이션 */
  .swagger-ui .btn {
    transition: all 0.2s ease;
    position: relative;
    overflow: hidden;
  }
  
  .swagger-ui .btn::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
    transition: left 0.5s;
  }
  
  .swagger-ui .btn:hover::before {
    left: 100%;
  }
  
  /* 입력 필드 포커스 애니메이션 */
  .swagger-ui input[type="text"],
  .swagger-ui input[type="email"],
  .swagger-ui input[type="password"],
  .swagger-ui textarea {
    transition: border-color 0.3s ease, box-shadow 0.3s ease;
  }
  
  .swagger-ui input[type="text"]:focus,
  .swagger-ui input[type="email"]:focus,
  .swagger-ui input[type="password"]:focus,
  .swagger-ui textarea:focus {
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }
  
  /* 태그 펄스 애니메이션 */
  @keyframes tagPulse {
    0% { box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1); }
    50% { box-shadow: 0 6px 20px rgba(0, 0, 0, 0.15); }
    100% { box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1); }
  }
  
  .swagger-ui .opblock-tag:hover {
    animation: tagPulse 2s infinite;
  }
  
  /* 스크롤 애니메이션 */
  .swagger-ui {
    scroll-behavior: smooth;
  }
  
  /* 로딩 스피너 애니메이션 */
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
  
  .swagger-ui .loading::after {
    content: '';
    width: 20px;
    height: 20px;
    border: 2px solid #f3f3f3;
    border-top: 2px solid #3b82f6;
    border-radius: 50%;
    animation: spin 1s linear infinite;
    display: inline-block;
    margin-left: 10px;
  }
  
  /* 페이드인 애니메이션 */
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(20px); }
    to { opacity: 1; transform: translateY(0); }
  }
  
  .swagger-ui .opblock {
    animation: fadeIn 0.3s ease-out;
  }
  
  /* 다크 모드 토글 애니메이션 */
  .dark-mode-toggle {
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }
  
  .dark-mode-toggle:active {
    transform: scale(0.95);
  }
`;
