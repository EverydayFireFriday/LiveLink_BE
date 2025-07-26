export const darkModeStyles = `
  /* 다크 모드 지원 */
  @media (prefers-color-scheme: dark) {
    .swagger-ui {
      background-color: #1a1a1a;
      color: #e0e0e0;
    }
    
    .swagger-ui .info {
      background: linear-gradient(135deg, #2d3436 0%, #636e72 100%);
    }
    
    .swagger-ui .opblock {
      background: #2d3436;
      border-color: #636e72;
    }
    
    .swagger-ui .opblock .opblock-summary {
      border-color: #636e72;
    }
    
    .swagger-ui input[type=text],
    .swagger-ui input[type=password],
    .swagger-ui input[type=email],
    .swagger-ui textarea {
      background-color: #2d3436;
      color: #e0e0e0;
      border-color: #636e72;
    }
    
    .swagger-ui .btn.execute {
      background: linear-gradient(135deg, #74b9ff 0%, #0984e3 100%);
    }
  }
  
  /* 다크 모드 토글 버튼 */
  .dark-mode-toggle {
    position: fixed;
    top: 20px;
    right: 20px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    border: none;
    border-radius: 50%;
    width: 50px;
    height: 50px;
    color: white;
    font-size: 20px;
    cursor: pointer;
    z-index: 1000;
    box-shadow: 0 4px 15px rgba(0,0,0,0.2);
    transition: all 0.3s ease;
  }
  
  .dark-mode-toggle:hover {
    transform: scale(1.1);
    box-shadow: 0 6px 20px rgba(0,0,0,0.3);
  }
`;
