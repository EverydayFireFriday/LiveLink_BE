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

  /* 버전 및 OAS 스탬프 스타일 통일 (다크 모드 기반) */
  .swagger-ui .info .version,
  .swagger-ui .info .version-stamp {
    background: transparent !important;
    color: #333 !important; /* 라이트 모드에 맞게 텍스트 색상 조정 */
    border: none !important;
    padding: 2px 5px !important;
    font-weight: bold;
    text-shadow: none !important;
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

  /* 라이트 모드 태그 스타일 통일 */
  .swagger-ui .opblock-tag {
    background: #f0f0f0 !important;
    border: 1px solid #dddddd !important;
    color: #000000 !important;
    box-shadow: none !important;
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
