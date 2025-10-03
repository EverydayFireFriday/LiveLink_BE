
(function() {
  // 환경 확인 (개발 환경에서만 로그 출력)
  const isDevelopment = window.location.hostname === 'localhost' ||
                        window.location.hostname === '127.0.0.1' ||
                        window.location.hostname.includes('dev');

  // 조건부 로깅 함수
  const logger = {
    info: (msg) => isDevelopment && console.log(msg),
    error: (msg, error) => isDevelopment && console.error(msg, error),
    warn: (msg) => isDevelopment && console.warn(msg)
  };

  // 초기 테마 설정
  const savedTheme = localStorage.getItem('swagger-theme');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
    document.documentElement.setAttribute('data-theme', 'dark');
  }

  // Swagger UI가 로드된 후 실행될 함수
  function onSwaggerUiComplete() {
    try {
      logger.info("🚀 Stagelives Swagger UI 초기화 시작");
      setupDarkModeToggle();
      setupRainbowModeToggle();
      setupAdvancedSearch();
      setupUIEnhancements();
      logger.info("✅ Stagelives Swagger UI 초기화 완료");
    } catch (error) {
      logger.error("❌ Swagger UI 커스터마이징 중 오류 발생:", error);
    }
  }

  // 무지개 색상 테마 목록
  const rainbowThemes = [
    { name: 'purple', colors: { primary: '#8B5CF6', secondary: '#EC4899', accent: '#F59E0B', primaryLight: '#A78BFA', secondaryLight: '#F472B6', bg: '#F3E8FF', bgEnd: '#FCE7F3', text: '#1F2937', heading: '#7C3AED' } },
    { name: 'ocean', colors: { primary: '#0EA5E9', secondary: '#06B6D4', accent: '#3B82F6', primaryLight: '#38BDF8', secondaryLight: '#22D3EE', bg: '#E0F2FE', bgEnd: '#CFFAFE', text: '#1F2937', heading: '#0284C7' } },
    { name: 'sunset', colors: { primary: '#F59E0B', secondary: '#EF4444', accent: '#EC4899', primaryLight: '#FBBF24', secondaryLight: '#F87171', bg: '#FEF3C7', bgEnd: '#FEE2E2', text: '#1F2937', heading: '#D97706' } },
    { name: 'forest', colors: { primary: '#10B981', secondary: '#059669', accent: '#14B8A6', primaryLight: '#34D399', secondaryLight: '#10B981', bg: '#D1FAE5', bgEnd: '#CCFBF1', text: '#1F2937', heading: '#047857' } },
    { name: 'candy', colors: { primary: '#EC4899', secondary: '#F472B6', accent: '#C084FC', primaryLight: '#F9A8D4', secondaryLight: '#FBCFE8', bg: '#FCE7F3', bgEnd: '#FAE8FF', text: '#1F2937', heading: '#DB2777' } },
    { name: 'galaxy', colors: { primary: '#6366F1', secondary: '#8B5CF6', accent: '#A78BFA', primaryLight: '#818CF8', secondaryLight: '#A78BFA', bg: '#E0E7FF', bgEnd: '#EDE9FE', text: '#1F2937', heading: '#4F46E5' } },
    { name: 'fire', colors: { primary: '#EF4444', secondary: '#F97316', accent: '#FBBF24', primaryLight: '#F87171', secondaryLight: '#FB923C', bg: '#FEE2E2', bgEnd: '#FFEDD5', text: '#1F2937', heading: '#DC2626' } },
    { name: 'arctic', colors: { primary: '#06B6D4', secondary: '#0EA5E9', accent: '#3B82F6', primaryLight: '#22D3EE', secondaryLight: '#38BDF8', bg: '#CFFAFE', bgEnd: '#DBEAFE', text: '#1F2937', heading: '#0891B2' } }
  ];

  // 다크 모드 토글 버튼 설정
  function setupDarkModeToggle() {
    const existingToggle = document.querySelector(".dark-mode-toggle");
    if (existingToggle) return;

    const toggleButton = document.createElement("button");
    toggleButton.className = "dark-mode-toggle";
    toggleButton.title = "다크 모드 토글";

    Object.assign(toggleButton.style, {
      position: "fixed", top: "14px", right: "20px", zIndex: "1001",
      background: "var(--primary-color, #3b82f6)", color: "white", border: "none",
      borderRadius: "50%", width: "40px", height: "40px", cursor: "pointer",
      fontSize: "18px", transition: "all 0.3s ease", boxShadow: "0 4px 15px rgba(0, 0, 0, 0.2)",
      display: "flex", alignItems: "center", justifyContent: "center",
    });

    const applyTheme = (theme) => {
      if (theme === "dark") {
        document.documentElement.setAttribute('data-theme', 'dark');
        toggleButton.innerHTML = "☀️";
      } else if (theme === "rainbow") {
        document.documentElement.setAttribute('data-theme', 'rainbow');
        toggleButton.innerHTML = "🌙";
      } else {
        document.documentElement.removeAttribute('data-theme');
        toggleButton.innerHTML = "🌙";
      }
    };

    toggleButton.addEventListener("click", () => {
      const currentTheme = document.documentElement.getAttribute('data-theme');
      let newTheme;

      if (currentTheme === 'dark') {
        newTheme = 'light';
      } else {
        newTheme = 'dark';
      }

      applyTheme(newTheme);
      localStorage.setItem('swagger-theme', newTheme);
    });

    document.body.appendChild(toggleButton);
    applyTheme(document.documentElement.getAttribute('data-theme') || 'light');
    logger.info("🌙 다크 모드 토글 설정 완료");
  }

  // 레인보우 모드 토글 버튼 설정
  function setupRainbowModeToggle() {
    const existingToggle = document.querySelector(".rainbow-mode-toggle");
    if (existingToggle) return;

    const toggleButton = document.createElement("button");
    toggleButton.className = "rainbow-mode-toggle";
    toggleButton.title = "레인보우 모드 토글";
    toggleButton.innerHTML = "🌈";

    Object.assign(toggleButton.style, {
      position: "fixed", top: "14px", right: "70px", zIndex: "1001",
      background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)", color: "white", border: "none",
      borderRadius: "50%", width: "40px", height: "40px", cursor: "pointer",
      fontSize: "18px", transition: "all 0.3s ease", boxShadow: "0 4px 15px rgba(102, 126, 234, 0.3)",
      display: "flex", alignItems: "center", justifyContent: "center",
    });

    const applyRainbowTheme = () => {
      const randomTheme = rainbowThemes[Math.floor(Math.random() * rainbowThemes.length)];
      const root = document.documentElement;

      root.setAttribute('data-theme', 'rainbow');
      root.style.setProperty('--rainbow-primary', randomTheme.colors.primary);
      root.style.setProperty('--rainbow-secondary', randomTheme.colors.secondary);
      root.style.setProperty('--rainbow-accent', randomTheme.colors.accent);
      root.style.setProperty('--rainbow-primary-light', randomTheme.colors.primaryLight);
      root.style.setProperty('--rainbow-secondary-light', randomTheme.colors.secondaryLight);
      root.style.setProperty('--rainbow-bg-start', randomTheme.colors.bg);
      root.style.setProperty('--rainbow-bg-end', randomTheme.colors.bgEnd);
      root.style.setProperty('--rainbow-text', randomTheme.colors.text);
      root.style.setProperty('--rainbow-heading', randomTheme.colors.heading);

      localStorage.setItem('swagger-theme', 'rainbow');
      localStorage.setItem('rainbow-theme-name', randomTheme.name);
      logger.info(`🌈 레인보우 모드 적용: ${randomTheme.name}`);
    };

    toggleButton.addEventListener("click", applyRainbowTheme);

    document.body.appendChild(toggleButton);
    logger.info("🌈 레인보우 모드 토글 설정 완료");
  }

  // 고급 검색 기능 설정
  function setupAdvancedSearch() {
    const win = window;
    if (win.ui && win.ui.getSystem) {
      const system = win.ui.getSystem();
      const originalTaggedOps = system.layoutSelectors.taggedOperations;
      
      system.layoutSelectors.taggedOperations = (state, tagFilter) => {
        const taggedOps = originalTaggedOps(state, "");
        if (!tagFilter || tagFilter.trim().length === 0) return taggedOps;
        
        const lowerFilter = tagFilter.toLowerCase().trim();
        
        return taggedOps.filter(taggedOp => {
          try {
            const tagName = taggedOp.get("tagName").toLowerCase();
            if (tagName.includes(lowerFilter)) return true;

            const operations = taggedOp.get("operations");
            return operations.some(op => {
              const path = op.get("path").toLowerCase();
              const method = op.get("method").toLowerCase();
              const summary = (op.getIn(["operation", "summary"]) || "").toLowerCase();
              const description = (op.getIn(["operation", "description"]) || "").toLowerCase();
              
              return path.includes(lowerFilter) || method.includes(lowerFilter) || summary.includes(lowerFilter) || description.includes(lowerFilter);
            });
          } catch (e) {
            logger.error("검색 필터링 중 오류:", e);
            return true;
          }
        });
      };
      logger.info("🔍 고급 검색 기능 활성화 완료");
    }
  }

  // 기타 UI 개선
  function setupUIEnhancements() {
    const style = document.createElement("style");
    style.textContent = `
      .dark-mode-toggle:hover { transform: scale(1.1); box-shadow: 0 6px 20px rgba(0, 0, 0, 0.3); }
      .swagger-ui .filter .operation-filter-input { transition: all 0.3s ease; }
      .swagger-ui .filter .operation-filter-input:focus { box-shadow: 0 0 0 2px var(--primary-color, #3b82f6); border-color: var(--primary-color, #3b82f6); }
    `;
    document.head.appendChild(style);

    const filterInput = document.querySelector(".operation-filter-input");
    if (filterInput) {
      filterInput.placeholder = "🔍 태그, 경로, 메소드, 설명으로 검색...";
    }
    logger.info("🎨 추가 UI 개선 적용 완료");
  }

  // DOM 로드가 완료되면 스크립트 실행
  document.addEventListener("DOMContentLoaded", () => {
    // Swagger UI가 완전히 렌더링될 때까지 기다림
    const observer = new MutationObserver((mutations, obs) => {
      if (document.querySelector(".swagger-ui")) {
        onSwaggerUiComplete();
        obs.disconnect(); // 한번 실행 후 관찰 중지
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  });

})();
