import logger from '../../../utils/logger/logger';

export const setupSearchFilter = function () {
  try {
    logger.info('🔧 setupSearchFilter 시작');

    // 기존 다크모드 토글이 있다면 제거 (중복 방지)
    const existingToggle = document.querySelector('.dark-mode-toggle');
    if (existingToggle) {
      existingToggle.remove();
      logger.info('🗑️ 기존 토글 제거');
    }

    // 다크 모드 토글 버튼 생성
    setupDarkModeToggle();

    // 검색 필터 기능 설정
    setupAdvancedSearch();

    // UI 개선 적용
    setupUIEnhancements();
  } catch (error) {
    logger.error('❌ 검색 필터 초기화 중 오류:', error);
  }
};

const setupDarkModeToggle = () => {
  logger.info('🌙 다크모드 토글 설정');

  const toggleButton = document.createElement('button');
  toggleButton.className = 'dark-mode-toggle';
  toggleButton.innerHTML = '🌙';
  toggleButton.title = '다크 모드 토글';

  // 인라인 스타일로 버튼이 확실히 보이도록 설정
  Object.assign(toggleButton.style, {
    position: 'fixed',
    top: '20px',
    right: '20px',
    zIndex: '1001',
    background: '#3b82f6',
    color: 'white',
    border: 'none',
    borderRadius: '50%',
    width: '50px',
    height: '50px',
    cursor: 'pointer',
    fontSize: '18px',
    transition: 'all 0.3s ease',
    boxShadow: '0 4px 15px rgba(59, 130, 246, 0.3)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  });

  // 현재 테마 상태 확인 - localStorage 통일
  const currentTheme = localStorage.getItem('swagger-theme') || 'light';

  // 테마 적용 함수 - DOM 일관성 맞추기
  const applyTheme = (theme: string) => {
    if (theme === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark');
      toggleButton.innerHTML = '☀️';
      logger.info('🌙 다크모드 적용');
    } else {
      document.documentElement.removeAttribute('data-theme');
      toggleButton.innerHTML = '🌙';
      logger.info('☀️ 라이트모드 적용');
    }
    localStorage.setItem('swagger-theme', theme);
  };

  // 초기 테마 적용
  applyTheme(currentTheme);

  // 토글 기능
  toggleButton.addEventListener('click', () => {
    const isDark =
      document.documentElement.getAttribute('data-theme') === 'dark';
    const newTheme = isDark ? 'light' : 'dark';
    applyTheme(newTheme);
    logger.info(
      `🔄 테마 변경: ${isDark ? '다크' : '라이트'} → ${newTheme === 'dark' ? '다크' : '라이트'}`,
    );
  });

  // 호버 효과
  toggleButton.addEventListener('mouseenter', () => {
    toggleButton.style.transform = 'scale(1.1)';
    toggleButton.style.boxShadow = '0 6px 20px rgba(59, 130, 246, 0.4)';
  });

  toggleButton.addEventListener('mouseleave', () => {
    toggleButton.style.transform = 'scale(1)';
    toggleButton.style.boxShadow = '0 4px 15px rgba(59, 130, 246, 0.3)';
  });

  document.body.appendChild(toggleButton);
  logger.info('✅ 다크모드 토글 버튼 생성 완료');
};

// 나머지 함수들은 기존과 동일...
// Swagger UI 타입 정의
interface SwaggerUIWindow extends Window {
  ui?: {
    getSystem(): SwaggerUISystem;
  };
}

interface SwaggerUISystem {
  layoutSelectors: {
    taggedOperations(
      state: unknown,
      tagFilter: string,
    ): SwaggerTaggedOperation[];
  };
}

interface SwaggerTaggedOperation {
  get?(key: string): unknown;
  tagName?: string;
  tag?: SwaggerTag;
  operations?: SwaggerOperation[];
}

interface SwaggerTag {
  get?(key: string): unknown;
  description?: string;
}

interface SwaggerOperation {
  get?(key: string): unknown;
  path?: string;
  operation?: SwaggerOperationDetail;
}

interface SwaggerOperationDetail {
  get?(key: string): unknown;
  method?: string;
  summary?: string;
  description?: string;
}

const setupAdvancedSearch = () => {
  setTimeout(() => {
    const win = window as SwaggerUIWindow;

    if (win.ui && win.ui.getSystem) {
      const system = win.ui.getSystem();
      const layoutSelectors = system.layoutSelectors;

      if (layoutSelectors && layoutSelectors.taggedOperations) {
        const originalTaggedOps = layoutSelectors.taggedOperations;

        system.layoutSelectors.taggedOperations = function (
          state: unknown,
          tagFilter: string,
        ) {
          const taggedOps = originalTaggedOps(state, '');

          if (!tagFilter || tagFilter.trim().length === 0) {
            return taggedOps;
          }

          const lowerFilter = tagFilter.toLowerCase().trim();

          return taggedOps.filter((taggedOp: SwaggerTaggedOperation) => {
            try {
              // 태그명 검색
              const tagName = taggedOp.get
                ? taggedOp.get('tagName')
                : taggedOp.tagName;
              if (
                tagName &&
                typeof tagName === 'string' &&
                tagName.toLowerCase().includes(lowerFilter)
              ) {
                return true;
              }

              // 태그 설명 검색
              const tagObj = taggedOp.get ? taggedOp.get('tag') : taggedOp.tag;
              if (tagObj) {
                const description = (tagObj as SwaggerTag).get
                  ? (tagObj as SwaggerTag).get?.('description')
                  : (tagObj as SwaggerTag).description;
                if (
                  description &&
                  typeof description === 'string' &&
                  description.toLowerCase().includes(lowerFilter)
                ) {
                  return true;
                }
              }

              // 오퍼레이션들 내부 검색
              const operations = taggedOp.get
                ? taggedOp.get('operations')
                : taggedOp.operations;
              if (operations && Array.isArray(operations)) {
                return operations.some((op: SwaggerOperation) => {
                  try {
                    // API 경로 검색
                    const path = op.get ? op.get('path') : op.path;
                    if (
                      path &&
                      typeof path === 'string' &&
                      path.toLowerCase().includes(lowerFilter)
                    ) {
                      return true;
                    }

                    const operation = op.get
                      ? op.get('operation')
                      : op.operation;
                    if (operation) {
                      const opDetail = operation as SwaggerOperationDetail;

                      // HTTP 메소드 검색
                      const method = opDetail.get
                        ? opDetail.get('method')
                        : opDetail.method;
                      if (
                        method &&
                        typeof method === 'string' &&
                        method.toLowerCase().includes(lowerFilter)
                      ) {
                        return true;
                      }

                      // API 요약 검색
                      const summary = opDetail.get
                        ? opDetail.get('summary')
                        : opDetail.summary;
                      if (
                        summary &&
                        typeof summary === 'string' &&
                        summary.toLowerCase().includes(lowerFilter)
                      ) {
                        return true;
                      }

                      // API 설명 검색
                      const description = opDetail.get
                        ? opDetail.get('description')
                        : opDetail.description;
                      if (
                        description &&
                        typeof description === 'string' &&
                        description.toLowerCase().includes(lowerFilter)
                      ) {
                        return true;
                      }
                    }

                    return false;
                  } catch (e) {
                    return false;
                  }
                });
              }

              return false;
            } catch (e) {
              return true;
            }
          });
        };

        logger.info('✅ Swagger 검색 필터 오버라이드 완료');
      }
    }

    // DOM 기반 검색 백업
    setupDOMBasedSearch();
  }, 2000);
};

const setupDOMBasedSearch = () => {
  const searchInput = document.querySelector(
    '.operation-filter-input',
  ) as HTMLInputElement;
  if (searchInput) {
    const newInput = searchInput.cloneNode(true) as HTMLInputElement;
    searchInput.parentNode?.replaceChild(newInput, searchInput);

    newInput.addEventListener('input', function (e) {
      const searchTerm = (e.target as HTMLInputElement).value
        .toLowerCase()
        .trim();

      if (!searchTerm) {
        const tags = document.querySelectorAll('.opblock-tag');
        tags.forEach((tag) => {
          (tag as HTMLElement).style.display = 'block';
        });
        return;
      }

      const tags = document.querySelectorAll('.opblock-tag');
      tags.forEach((tag) => {
        const tagElement = tag as HTMLElement;
        let shouldShow = false;

        // 태그 제목 검색
        const tagTitle =
          tagElement.querySelector('h3')?.textContent?.toLowerCase() || '';
        if (tagTitle.includes(searchTerm)) {
          shouldShow = true;
        }

        // 개별 API 검색
        const operations = tagElement.querySelectorAll('.opblock');
        let hasMatchingOperation = false;

        operations.forEach((operation) => {
          const opElement = operation as HTMLElement;

          const pathElement = opElement.querySelector('.opblock-summary-path');
          const path = pathElement?.textContent?.toLowerCase() || '';

          const summaryElement = opElement.querySelector(
            '.opblock-summary-description',
          );
          const summary = summaryElement?.textContent?.toLowerCase() || '';

          const methodElement = opElement.querySelector(
            '.opblock-summary-method',
          );
          const method = methodElement?.textContent?.toLowerCase() || '';

          if (
            path.includes(searchTerm) ||
            summary.includes(searchTerm) ||
            method.includes(searchTerm)
          ) {
            hasMatchingOperation = true;
            opElement.style.display = 'block';
          } else {
            opElement.style.display = 'none';
          }
        });

        if (shouldShow || hasMatchingOperation) {
          tagElement.style.display = 'block';
        } else {
          tagElement.style.display = 'none';
        }
      });
    });

    logger.info('✅ DOM 기반 검색 설정 완료');
  }
};

const setupUIEnhancements = () => {
  try {
    const style = document.createElement('style');
    style.textContent = `
        .swagger-ui .filter .operation-filter-input::placeholder {
          color: rgba(0, 0, 0, 0.5);
          font-style: italic;
        }
        .swagger-ui .opblock-summary-description {
          font-weight: 500;
        }
        .swagger-ui .opblock-summary-path {
          font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
          background: rgba(0,0,0,0.05);
          padding: 2px 6px;
          border-radius: 4px;
        }
      `;
    document.head.appendChild(style);

    setTimeout(() => {
      const filterInput = document.querySelector(
        '.operation-filter-input',
      ) as HTMLInputElement;
      if (filterInput && 'placeholder' in filterInput) {
        filterInput.placeholder = '🔍 검색... (태그, API 경로, 메소드, 설명)';
      }
    }, 3000);
  } catch (error) {
    logger.error('UI 개선 적용 중 오류:', error);
  }
};
