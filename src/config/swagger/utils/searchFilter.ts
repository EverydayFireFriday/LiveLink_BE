/**
 * Swagger UI용 고급 검색 및 필터 기능
 * 한국어 검색 및 다양한 필터 옵션 지원
 */

export const setupSearchFilter = (): void => {
  // DOM이 완전히 로드된 후 실행
  setTimeout(() => {
    addEnhancedSearch();
    addCategoryFilters();
    addMethodFilters();
    addQuickActions();
  }, 1500);
};

const addEnhancedSearch = (): void => {
  const topbar = document.querySelector('.swagger-ui .topbar');
  if (!topbar || document.querySelector('.enhanced-search')) return;

  const searchContainer = document.createElement('div');
  searchContainer.className = 'enhanced-search';
  searchContainer.innerHTML = `
    <div style="display: flex; gap: 10px; align-items: center; margin: 10px 0;">
      <input 
        type="text" 
        id="api-search" 
        placeholder="API 검색 (한국어/영어 지원)..." 
        style="
          padding: 8px 12px;
          border: 2px solid #667eea;
          border-radius: 6px;
          font-size: 14px;
          width: 300px;
          outline: none;
        "
      />
      <button 
        id="clear-search" 
        style="
          padding: 8px 12px;
          background: #dc3545;
          color: white;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-size: 12px;
        "
      >
        지우기
      </button>
      <select 
        id="status-filter"
        style="
          padding: 8px;
          border: 2px solid #667eea;
          border-radius: 6px;
          font-size: 14px;
        "
      >
        <option value="">모든 상태</option>
        <option value="deprecated">사용 중단</option>
        <option value="beta">베타</option>
        <option value="new">신규</option>
      </select>
    </div>
  `;

  topbar.appendChild(searchContainer);

  // 검색 기능 구현
  const searchInput = document.getElementById('api-search') as HTMLInputElement;
  const clearButton = document.getElementById('clear-search');
  const statusFilter = document.getElementById('status-filter') as HTMLSelectElement;

  const performSearch = (): void => {
    const searchTerm = searchInput.value.toLowerCase();
    const statusTerm = statusFilter.value.toLowerCase();
    
    const operations = document.querySelectorAll('.swagger-ui .opblock');
    
    operations.forEach((operation) => {
      const summary = operation.querySelector('.opblock-summary-description')?.textContent?.toLowerCase() || '';
      const path = operation.querySelector('.opblock-summary-path')?.textContent?.toLowerCase() || '';
      const tag = operation.closest('.opblock-tag')?.querySelector('.opblock-tag-section h4')?.textContent?.toLowerCase() || '';
      
      // 한국어 키워드 매핑
      const koreanKeywords: { [key: string]: string[] } = {
        '로그인': ['auth', 'login', 'signin'],
        '회원가입': ['registration', 'register', 'signup'],
        '콘서트': ['concert', 'live', 'stream'],
        '채팅': ['chat', 'message'],
        '게시글': ['article', 'post', 'blog'],
        '프로필': ['profile', 'user'],
        '관리자': ['admin', 'administrator'],
        '업로드': ['upload', 'file'],
        '알림': ['notification', 'alert'],
        '좋아요': ['like', 'favorite'],
        '북마크': ['bookmark', 'save'],
      };

      let matchesSearch = true;
      if (searchTerm) {
        matchesSearch = summary.includes(searchTerm) || 
                      path.includes(searchTerm) || 
                      tag.includes(searchTerm);
        
        // 한국어 검색 지원
        if (!matchesSearch) {
          for (const [korean, english] of Object.entries(koreanKeywords)) {
            if (searchTerm.includes(korean)) {
              matchesSearch = english.some(eng => 
                summary.includes(eng) || path.includes(eng) || tag.includes(eng)
              );
              if (matchesSearch) break;
            }
          }
        }
      }

      let matchesStatus = true;
      if (statusTerm) {
        const operationElement = operation as HTMLElement;
        matchesStatus = operationElement.classList.contains(statusTerm) ||
                      operationElement.dataset.status === statusTerm;
      }

      const shouldShow = matchesSearch && matchesStatus;
      (operation as HTMLElement).style.display = shouldShow ? 'block' : 'none';
    });

    // 빈 태그 섹션 숨기기
    document.querySelectorAll('.swagger-ui .opblock-tag').forEach((tagSection) => {
      const visibleOperations = tagSection.querySelectorAll('.opblock:not([style*="display: none"])');
      (tagSection as HTMLElement).style.display = visibleOperations.length > 0 ? 'block' : 'none';
    });
  };

  searchInput.addEventListener('input', performSearch);
  statusFilter.addEventListener('change', performSearch);
  clearButton?.addEventListener('click', () => {
    searchInput.value = '';
    statusFilter.value = '';
    performSearch();
  });
};

const addCategoryFilters = (): void => {
  const topbar = document.querySelector('.enhanced-search');
  if (!topbar || document.querySelector('.category-filters')) return;

  const categoryContainer = document.createElement('div');
  categoryContainer.className = 'category-filters';
  categoryContainer.innerHTML = `
    <div style="margin: 10px 0;">
      <span style="font-weight: bold; margin-right: 10px;">카테고리:</span>
      <button class="filter-btn" data-category="all" style="margin: 2px; padding: 4px 8px; border: 1px solid #ccc; background: #667eea; color: white; border-radius: 4px; cursor: pointer;">전체</button>
      <button class="filter-btn" data-category="core" style="margin: 2px; padding: 4px 8px; border: 1px solid #ccc; background: white; border-radius: 4px; cursor: pointer;">인증</button>
      <button class="filter-btn" data-category="user" style="margin: 2px; padding: 4px 8px; border: 1px solid #ccc; background: white; border-radius: 4px; cursor: pointer;">사용자</button>
      <button class="filter-btn" data-category="content" style="margin: 2px; padding: 4px 8px; border: 1px solid #ccc; background: white; border-radius: 4px; cursor: pointer;">콘텐츠</button>
      <button class="filter-btn" data-category="social" style="margin: 2px; padding: 4px 8px; border: 1px solid #ccc; background: white; border-radius: 4px; cursor: pointer;">소셜</button>
      <button class="filter-btn" data-category="admin" style="margin: 2px; padding: 4px 8px; border: 1px solid #ccc; background: white; border-radius: 4px; cursor: pointer;">관리자</button>
    </div>
  `;

  topbar.appendChild(categoryContainer);

  // 카테고리 필터 이벤트
  categoryContainer.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    if (!target.classList.contains('filter-btn')) return;

    // 버튼 상태 업데이트
    categoryContainer.querySelectorAll('.filter-btn').forEach(btn => {
      btn.style.background = 'white';
      btn.style.color = 'black';
    });
    target.style.background = '#667eea';
    target.style.color = 'white';

    const category = target.dataset.category;
    filterByCategory(category || 'all');
  });
};

const filterByCategory = (category: string): void => {
  const categoryMapping: { [key: string]: string[] } = {
    'core': ['auth', 'registration', 'password', 'verification'],
    'user': ['profile', 'user', 'payment', 'subscription'],
    'content': ['concert', 'stream', 'video', 'article'],
    'social': ['chat', 'like', 'bookmark', 'notification', 'comment', 'follow'],
    'admin': ['admin', 'analytics', 'report'],
    'system': ['health', 'upload', 'storage']
  };

  const tags = document.querySelectorAll('.swagger-ui .opblock-tag');
  
  tags.forEach((tagSection) => {
    const tagName = tagSection.querySelector('h4')?.textContent?.toLowerCase() || '';
    
    if (category === 'all') {
      (tagSection as HTMLElement).style.display = 'block';
    } else {
      const shouldShow = categoryMapping[category]?.some(cat => 
        tagName.includes(cat)
      ) || false;
      (tagSection as HTMLElement).style.display = shouldShow ? 'block' : 'none';
    }
  });
};

const addMethodFilters = (): void => {
  const topbar = document.querySelector('.category-filters');
  if (!topbar || document.querySelector('.method-filters')) return;

  const methodContainer = document.createElement('div');
  methodContainer.className = 'method-filters';
  methodContainer.innerHTML = `
    <div style="margin: 10px 0;">
      <span style="font-weight: bold; margin-right: 10px;">HTTP 메서드:</span>
      <button class="method-btn" data-method="all" style="margin: 2px; padding: 4px 8px; border: 1px solid #ccc; background: #667eea; color: white; border-radius: 4px; cursor: pointer;">전체</button>
      <button class="method-btn" data-method="get" style="margin: 2px; padding: 4px 8px; border: 1px solid #28a745; background: white; color: #28a745; border-radius: 4px; cursor: pointer;">GET</button>
      <button class="method-btn" data-method="post" style="margin: 2px; padding: 4px 8px; border: 1px solid #007bff; background: white; color: #007bff; border-radius: 4px; cursor: pointer;">POST</button>
      <button class="method-btn" data-method="put" style="margin: 2px; padding: 4px 8px; border: 1px solid #ffc107; background: white; color: #ffc107; border-radius: 4px; cursor: pointer;">PUT</button>
      <button class="method-btn" data-method="delete" style="margin: 2px; padding: 4px 8px; border: 1px solid #dc3545; background: white; color: #dc3545; border-radius: 4px; cursor: pointer;">DELETE</button>
    </div>
  `;

  topbar.appendChild(methodContainer);

  methodContainer.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    if (!target.classList.contains('method-btn')) return;

    // 버튼 상태 업데이트
    methodContainer.querySelectorAll('.method-btn').forEach(btn => {
      const method = btn.dataset.method;
      if (method === 'all') {
        btn.style.background = target === btn ? '#667eea' : 'white';
        btn.style.color = target === btn ? 'white' : 'black';
      } else {
        const colors: { [key: string]: string } = {
          get: '#28a745',
          post: '#007bff', 
          put: '#ffc107',
          delete: '#dc3545'
        };
        btn.style.background = target === btn ? colors[method] : 'white';
        btn.style.color = target === btn ? 'white' : colors[method];
      }
    });

    const method = target.dataset.method;
    filterByMethod(method || 'all');
  });
};

const filterByMethod = (method: string): void => {
  const operations = document.querySelectorAll('.swagger-ui .opblock');
  
  operations.forEach((operation) => {
    if (method === 'all') {
      (operation as HTMLElement).style.display = 'block';
    } else {
      const hasMethod = operation.classList.contains(`opblock-${method}`);
      (operation as HTMLElement).style.display = hasMethod ? 'block' : 'none';
    }
  });

  // 빈 태그 섹션 숨기기
  document.querySelectorAll('.swagger-ui .opblock-tag').forEach((tagSection) => {
    const visibleOperations = tagSection.querySelectorAll('.opblock:not([style*="display: none"])');
    (tagSection as HTMLElement).style.display = visibleOperations.length > 0 ? 'block' : 'none';
  });
};

const addQuickActions = (): void => {
  const topbar = document.querySelector('.method-filters');
  if (!topbar || document.querySelector('.quick-actions')) return;

  const quickContainer = document.createElement('div');
  quickContainer.className = 'quick-actions';
  quickContainer.innerHTML = `
    <div style="margin: 10px 0; padding: 10px; border: 1px solid #ddd; border-radius: 6px; background: #f8f9fa;">
      <span style="font-weight: bold; margin-right: 10px;">빠른 작업:</span>
      <button id="expand-all" style="margin: 2px; padding: 4px 8px; background: #28a745; color: white; border: none; border-radius: 4px; cursor: pointer;">모두 펼치기</button>
      <button id="collapse-all" style="margin: 2px; padding: 4px 8px; background: #6c757d; color: white; border: none; border-radius: 4px; cursor: pointer;">모두 접기</button>
      <button id="copy-base-url" style="margin: 2px; padding: 4px 8px; background: #17a2b8; color: white; border: none; border-radius: 4px; cursor: pointer;">베이스 URL 복사</button>
      <button id="toggle-dark-mode" style="margin: 2px; padding: 4px 8px; background: #343a40; color: white; border: none; border-radius: 4px; cursor: pointer;">다크 모드</button>
    </div>
  `;

  topbar.appendChild(quickContainer);

  // 빠른 작업 이벤트들
  document.getElementById('expand-all')?.addEventListener('click', () => {
    document.querySelectorAll('.swagger-ui .opblock-summary').forEach((summary) => {
      const operation = summary.closest('.opblock') as HTMLElement;
      if (operation && !operation.classList.contains('is-open')) {
        (summary as HTMLElement).click();
      }
    });
  });

  document.getElementById('collapse-all')?.addEventListener('click', () => {
    document.querySelectorAll('.swagger-ui .opblock.is-open .opblock-summary').forEach((summary) => {
      (summary as HTMLElement).click();
    });
  });

  document.getElementById('copy-base-url')?.addEventListener('click', () => {
    const baseUrl = window.location.origin;
    navigator.clipboard.writeText(baseUrl).then(() => {
      alert(`베이스 URL이 클립보드에 복사되었습니다: ${baseUrl}`);
    });
  });

  document.getElementById('toggle-dark-mode')?.addEventListener('click', () => {
    document.body.classList.toggle('dark-mode');
    const isDark = document.body.classList.contains('dark-mode');
    localStorage.setItem('swagger-dark-mode', isDark.toString());
  });

  // 다크 모드 상태 복원
  if (localStorage.getItem('swagger-dark-mode') === 'true') {
    document.body.classList.add('dark-mode');
  }
};
