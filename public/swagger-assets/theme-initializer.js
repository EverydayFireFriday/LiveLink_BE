/**
 * Swagger UI Theme & Search Initializer
 * 스웨거 UI 테마, 검색 기능 초기화 스크립트
 */

(function() {
  'use strict';

  // ==================== 환경 설정 ====================
  const isDevelopment = window.location.hostname === 'localhost' ||
                        window.location.hostname === '127.0.0.1' ||
                        window.location.hostname.includes('dev');

  // 개발 환경에서만 로그 출력
  const logger = {
    info: (msg) => isDevelopment && console.log(`%c[Swagger] ${msg}`, 'color: #3b82f6'),
    warn: (msg) => isDevelopment && console.warn(`[Swagger] ${msg}`),
    error: (msg, error) => isDevelopment && console.error(`[Swagger] ${msg}`, error)
  };

  // ==================== 다크모드 강제 적용 ====================
  function forceDarkMode() {
    document.documentElement.setAttribute('data-theme', 'dark');
    logger.info('다크 모드 강제 적용 완료');
  }

  // ==================== 고객 문의 버튼 ====================
  function setupSupportButton() {
    if (document.querySelector('.support-button')) return;

    const supportButton = document.createElement('button');
    supportButton.className = 'support-button';
    supportButton.title = '고객 문의 관리';
    supportButton.innerHTML = '📧';

    Object.assign(supportButton.style, {
      position: 'fixed', top: '14px', right: '20px', zIndex: '1001',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      color: 'white', border: 'none',
      borderRadius: '50%', width: '40px', height: '40px', cursor: 'pointer',
      fontSize: '18px', transition: 'all 0.3s ease',
      boxShadow: '0 4px 15px rgba(102, 126, 234, 0.3)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    });

    supportButton.addEventListener('click', () => window.open('/support/admin/login', '_blank'));
    supportButton.addEventListener('mouseenter', () => {
      supportButton.style.transform = 'scale(1.1)';
      supportButton.style.boxShadow = '0 6px 20px rgba(102, 126, 234, 0.5)';
    });
    supportButton.addEventListener('mouseleave', () => {
      supportButton.style.transform = 'scale(1)';
      supportButton.style.boxShadow = '0 4px 15px rgba(102, 126, 234, 0.3)';
    });

    document.body.appendChild(supportButton);
    logger.info('고객 문의 버튼 설정 완료');
  }

  // ==================== DOM 기반 검색 기능 ====================
  function setupDOMSearch() {
    logger.info('DOM 기반 검색 설정 시작');

    // 검색 입력창을 찾을 때까지 시도
    let retryCount = 0;
    const maxRetries = 20;

    const findAndSetupSearch = () => {
      const searchInput = document.querySelector('.operation-filter-input');

      if (!searchInput) {
        retryCount++;
        if (retryCount < maxRetries) {
          setTimeout(findAndSetupSearch, 500);
        } else {
          logger.warn('검색 입력창을 찾을 수 없습니다.');
        }
        return;
      }

      logger.info('검색 입력창 발견, 이벤트 설정');

      // 플레이스홀더 설정
      searchInput.placeholder = '🔍 검색 (쉼표로 구분하여 여러 개 검색 가능, 예: concert, article, auth)';

      // 기존 이벤트 제거를 위해 클론 생성
      const newSearchInput = searchInput.cloneNode(true);
      searchInput.parentNode.replaceChild(newSearchInput, searchInput);

      // 검색 함수
      const performSearch = (searchTerm) => {
        const term = searchTerm.toLowerCase().trim();

        // 쉼표로 구분된 검색어를 배열로 변환
        const searchTerms = term.split(',').map(t => t.trim()).filter(t => t !== '');

        logger.info(`검색어: "${term}" (${searchTerms.length}개 키워드: [${searchTerms.join(', ')}])`);

        // 검색어가 있으면 먼저 모든 섹션을 열기
        if (searchTerms.length > 0) {
          const allTagButtons = document.querySelectorAll('.opblock-tag-section .opblock-tag');
          allTagButtons.forEach(button => {
            const section = button.closest('.opblock-tag-section');
            if (section && !section.classList.contains('is-open')) {
              button.click();
            }
          });
          logger.info('모든 섹션 열기 완료');
        }

        // 약간의 지연 후 검색 수행 (DOM 업데이트 대기)
        setTimeout(() => {
          // 모든 태그 섹션 찾기
          const tagSections = document.querySelectorAll('.opblock-tag-section');

          if (tagSections.length === 0) {
            logger.warn('태그 섹션을 찾을 수 없습니다.');
            return;
          }

          logger.info(`${tagSections.length}개의 태그 섹션 발견`);

          tagSections.forEach(section => {
            let sectionHasMatch = false;

            // 태그 헤더 검색
            const tagHeader = section.querySelector('h3, h4, .opblock-tag');
            const tagText = tagHeader ? tagHeader.textContent.toLowerCase() : '';

            // 검색어가 없거나, 태그가 검색어 중 하나라도 포함하면 매치
            if (searchTerms.length === 0 || searchTerms.some(keyword => tagText.includes(keyword))) {
              sectionHasMatch = true;
            }

            // 각 API 오퍼레이션 검색
            const operations = section.querySelectorAll('.opblock');
            let visibleOpsCount = 0;

            operations.forEach(operation => {
              const pathSpan = operation.querySelector('.opblock-summary-path span, .opblock-summary-path');
              const path = pathSpan ? pathSpan.textContent.toLowerCase() : '';

              const methodSpan = operation.querySelector('.opblock-summary-method');
              const method = methodSpan ? methodSpan.textContent.toLowerCase() : '';

              const descSpan = operation.querySelector('.opblock-summary-description');
              const description = descSpan ? descSpan.textContent.toLowerCase() : '';

              const opblockSummary = operation.querySelector('.opblock-summary');
              const summaryText = opblockSummary ? opblockSummary.textContent.toLowerCase() : '';

              // 검색어가 없거나, 하나라도 매치되면 표시 (OR 조건)
              const isMatch = searchTerms.length === 0 || searchTerms.some(keyword =>
                  path.includes(keyword) ||
                  method.includes(keyword) ||
                  description.includes(keyword) ||
                  summaryText.includes(keyword)
              );

              if (isMatch) {
                operation.style.display = '';
                visibleOpsCount++;
                sectionHasMatch = true;
              } else {
                operation.style.display = 'none';
              }
            });

            // 섹션 표시/숨김
            if (searchTerms.length === 0 || sectionHasMatch) {
              section.style.display = '';
            } else {
              section.style.display = 'none';
            }

            if (visibleOpsCount > 0) {
              logger.info(`섹션 "${tagText}": ${visibleOpsCount}개 API 표시`);
            }
          });
        }, searchTerms.length > 0 ? 100 : 0); // 검색어가 있을 때만 지연
      };

      // input 이벤트로 실시간 검색
      newSearchInput.addEventListener('input', (e) => {
        performSearch(e.target.value);
      });

      // keyup 이벤트 (백업)
      newSearchInput.addEventListener('keyup', (e) => {
        performSearch(e.target.value);
      });

      logger.info('검색 기능 활성화 완료');

      // 초기 검색 (현재 값이 있다면)
      if (newSearchInput.value) {
        performSearch(newSearchInput.value);
      }
    };

    findAndSetupSearch();
  }

  // ==================== UI 개선 ====================
  function setupUIEnhancements() {
    const style = document.createElement('style');
    style.textContent = `
      /* 검색 입력창 스타일 */
      .swagger-ui .filter .operation-filter-input {
        transition: all 0.3s ease;
      }
      .swagger-ui .filter .operation-filter-input:focus {
        box-shadow: 0 0 0 2px var(--primary-color, #3b82f6);
        border-color: var(--primary-color, #3b82f6);
        outline: none;
      }

      /* 토글 버튼 호버 효과 */
      .support-button:hover {
        transform: scale(1.1);
      }
    `;
    document.head.appendChild(style);
    logger.info('UI 스타일 적용 완료');
  }

  // ==================== 메인 초기화 함수 ====================
  function initializeSwaggerUI() {
    try {
      logger.info('Swagger UI 초기화 시작');

      forceDarkMode();
      setupSupportButton();
      setupUIEnhancements();
      setupDOMSearch();

      logger.info('Swagger UI 초기화 완료');
    } catch (error) {
      logger.error('Swagger UI 초기화 중 오류 발생:', error);
    }
  }

  // ==================== 실행 ====================
  // DOMContentLoaded 이벤트 리스너
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', waitForSwaggerUI);
  } else {
    waitForSwaggerUI();
  }

  function waitForSwaggerUI() {
    // Swagger UI가 렌더링될 때까지 대기
    const observer = new MutationObserver((mutations, obs) => {
      if (document.querySelector('.swagger-ui')) {
        initializeSwaggerUI();
        obs.disconnect();
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    // 타임아웃 설정 (최대 10초 대기)
    setTimeout(() => {
      observer.disconnect();
      if (document.querySelector('.swagger-ui')) {
        initializeSwaggerUI();
      } else {
        logger.warn('Swagger UI 로드 타임아웃');
      }
    }, 10000);
  }

})();
