export const baseStyles = `
  /* 기본 스타일 초기화 */
  .swagger-ui .topbar { display: none }
  
  /* 헤더 스타일링 */
  .swagger-ui .info h1 { 
    color: #3b82f6; 
    font-size: 2rem; 
    font-weight: bold;
  }
  .swagger-ui .info .title { 
    color: #1e40af; 
  }
  
  /* 서버 선택 영역 */
  .swagger-ui .scheme-container { 
    background: #f8fafc; 
    padding: 20px; 
    border-radius: 8px; 
    border: 1px solid #e2e8f0;
  }
  
  /* HTTP 메소드별 컬러 */
  .swagger-ui .opblock.opblock-post { 
    border-color: #10b981; 
    background: rgba(16, 185, 129, 0.1);
  }
  .swagger-ui .opblock.opblock-get { 
    border-color: #3b82f6; 
    background: rgba(59, 130, 246, 0.1);
  }
  .swagger-ui .opblock.opblock-put { 
    border-color: #f59e0b; 
    background: rgba(245, 158, 11, 0.1);
  }
  .swagger-ui .opblock.opblock-delete { 
    border-color: #ef4444; 
    background: rgba(239, 68, 68, 0.1);
  }
  
  /* 태그별 화려한 스타일링 */
  .swagger-ui .opblock-tag { 
    border-radius: 8px;
    margin: 10px 0;
    transition: all 0.3s ease;
  }
  .swagger-ui .opblock-tag:hover { 
    transform: translateY(-2px);
    box-shadow: 0 8px 25px rgba(0,0,0,0.15);
  }
  
  /* Health Check */
  .swagger-ui .opblock-tag[data-tag*="Health"] { 
    background: linear-gradient(135deg, #84fab0 0%, #8fd3f4 100%);
    color: white;
    box-shadow: 0 4px 15px rgba(132, 250, 176, 0.3);
  }
  
  /* Auth 관련 태그들 */
  .swagger-ui .opblock-tag[data-tag*="Auth"] { 
    background: linear-gradient(135deg, #a8edea 0%, #fed6e3 100%);
    color: #2d3748;
    box-shadow: 0 4px 15px rgba(168, 237, 234, 0.3);
  }
  .swagger-ui .opblock-tag[data-tag*="Registration"] { 
    background: linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%);
    color: #2d3748;
    box-shadow: 0 4px 15px rgba(255, 236, 210, 0.3);
  }
  .swagger-ui .opblock-tag[data-tag*="Password"] { 
    background: linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%);
    color: #2d3748;
    box-shadow: 0 4px 15px rgba(255, 154, 158, 0.3);
  }
  .swagger-ui .opblock-tag[data-tag*="Profile"] { 
    background: linear-gradient(135deg, #a8caba 0%, #5d4e75 100%);
    color: white;
    box-shadow: 0 4px 15px rgba(168, 202, 186, 0.3);
  }
  .swagger-ui .opblock-tag[data-tag*="Verification"] { 
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);
  }
  
  /* Concert 관련 태그들 */
  .swagger-ui .opblock-tag[data-tag*="Concerts - Basic"] { 
    background: linear-gradient(135deg, #74b9ff 0%, #0984e3 100%);
    color: white;
    box-shadow: 0 4px 15px rgba(116, 185, 255, 0.3);
  }
  .swagger-ui .opblock-tag[data-tag*="Concerts - Like"] { 
    background: linear-gradient(135deg, #fd79a8 0%, #e84393 100%);
    color: white;
    box-shadow: 0 4px 15px rgba(253, 121, 168, 0.3);
  }
  .swagger-ui .opblock-tag[data-tag*="Concerts - Search"] { 
    background: linear-gradient(135deg, #00b894 0%, #00cec9 100%);
    color: white;
    box-shadow: 0 4px 15px rgba(0, 184, 148, 0.3);
  }
  .swagger-ui .opblock-tag[data-tag*="Concerts - Batch"] { 
    background: linear-gradient(135deg, #fdcb6e 0%, #e17055 100%);
    color: white;
    box-shadow: 0 4px 15px rgba(253, 203, 110, 0.3);
  }
  
  /* Article 관련 태그들 */
  .swagger-ui .opblock-tag[data-tag*="Article"] { 
    background: linear-gradient(135deg, #81C784 0%, #4CAF50 100%);
    color: white;
    box-shadow: 0 4px 15px rgba(129, 199, 132, 0.3);
  }
  .swagger-ui .opblock-tag[data-tag*="Article Bookmark"] { 
    background: linear-gradient(135deg, #4FC3F7 0%, #03A9F4 100%);
    color: white;
    box-shadow: 0 4px 15px rgba(79, 195, 247, 0.3);
  }
  .swagger-ui .opblock-tag[data-tag*="Article Comment"] { 
    background: linear-gradient(135deg, #FFB74D 0%, #FF9800 100%);
    color: white;
    box-shadow: 0 4px 15px rgba(255, 183, 77, 0.3);
  }
  .swagger-ui .opblock-tag[data-tag*="Article Like"] { 
    background: linear-gradient(135deg, #F06292 0%, #E91E63 100%);
    color: white;
    box-shadow: 0 4px 15px rgba(240, 98, 146, 0.3);
  }
  
  /* Admin 태그 */
  .swagger-ui .opblock-tag[data-tag*="Admin"] { 
    background: linear-gradient(135deg, #6c5ce7 0%, #a29bfe 100%);
    color: white;
    box-shadow: 0 4px 15px rgba(108, 92, 231, 0.3);
  }

  /* Chat 태그 */
  .swagger-ui .opblock-tag[data-tag*="Chat"] {
    background: linear-gradient(135deg, #5ee7df 0%, #b490ca 100%);
    color: white;
    box-shadow: 0 4px 15px rgba(94, 231, 223, 0.3);
  }
  
  /* 모든 태그 제목 스타일 */
  .swagger-ui .opblock-tag .opblock-tag-section h3 {
    font-weight: bold;
    text-shadow: 0 2px 4px rgba(0,0,0,0.2);
  }
  
  /* 검색 필터 스타일링 */
  .swagger-ui .filter-container { 
    background: #f8fafc;
    padding: 15px;
    border-radius: 8px;
    margin: 20px 0;
    border: 1px solid #e2e8f0;
  }
  .swagger-ui .filter .operation-filter-input { 
    background: white;
    border: 1px solid #d1d5db;
    border-radius: 6px;
    padding: 10px 15px;
    font-size: 14px;
  }
  
  /* 버튼 스타일링 */
  .swagger-ui .btn { 
    border-radius: 6px;
    font-weight: 500;
    transition: all 0.2s ease;
  }
  .swagger-ui .btn:hover { 
    transform: translateY(-1px);
  }
  
  /* 응답 코드 스타일링 */
  .swagger-ui .responses-inner h4 { 
    color: #374151;
    font-weight: bold;
  }
  
  /* 파라미터 테이블 스타일링 */
  .swagger-ui table thead tr td, .swagger-ui table thead tr th { 
    background: #f9fafb;
    color: #374151;
    font-weight: bold;
    border-bottom: 2px solid #e5e7eb;
  }
  
  /* 모델 섹션 스타일링 */
  .swagger-ui .model-box { 
    background: #f9fafb;
    border: 1px solid #e5e7eb;
    border-radius: 6px;
  }
  
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
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    border-radius: 4px;
  }
  .swagger-ui ::-webkit-scrollbar-thumb:hover { 
    background: linear-gradient(135deg, #5a6fd8 0%, #6a4190 100%);
  }

  /* 설명 텍스트 색상 개선 */
  .swagger-ui .description {
    color: #333;
  }
  /* 다크 모드에서의 설명 텍스트 색상 */
  [data-theme='dark'] .swagger-ui .description {
    color: #ccc;
  }
`;
