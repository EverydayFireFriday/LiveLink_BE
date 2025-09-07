
(function() {
  // 초기 테마 설정
  const savedTheme = localStorage.getItem('swagger-theme');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
    document.documentElement.setAttribute('data-theme', 'dark');
  }

  // Swagger UI가 로드된 후 실행될 함수
  function onSwaggerUiComplete() {
    try {
      console.log("🚀 LiveLink Swagger UI 초기화 시작");
      setupDarkModeToggle();
      setupAdvancedSearch();
      setupUIEnhancements();
      console.log("✅ LiveLink Swagger UI 초기화 완료");
    } catch (error) {
      console.error("❌ Swagger UI 커스터마이징 중 오류 발생:", error);
    }
  }

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
      } else {
        document.documentElement.removeAttribute('data-theme');
        toggleButton.innerHTML = "🌙";
      }
    };

    toggleButton.addEventListener("click", () => {
      const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
      const newTheme = isDark ? 'light' : 'dark';
      applyTheme(newTheme);
      localStorage.setItem('swagger-theme', newTheme);
    });
    
    document.body.appendChild(toggleButton);
    applyTheme(document.documentElement.getAttribute('data-theme') || 'light');
    console.log("🌙 다크 모드 토글 설정 완료");
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
            console.error("검색 필터링 중 오류:", e);
            return true;
          }
        });
      };
      console.log("🔍 고급 검색 기능 활성화 완료");
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
    console.log("🎨 추가 UI 개선 적용 완료");
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
