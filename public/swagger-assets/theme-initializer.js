
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
      setupMiniGameButton();
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

  // 미니게임 버튼 설정
  function setupMiniGameButton() {
    const existingButton = document.querySelector(".minigame-button");
    if (existingButton) return;

    const gameButton = document.createElement("button");
    gameButton.className = "minigame-button";
    gameButton.title = "미니게임 플레이";
    gameButton.innerHTML = "🎮";

    Object.assign(gameButton.style, {
      position: "fixed", top: "14px", right: "120px", zIndex: "1001",
      background: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)", color: "white", border: "none",
      borderRadius: "50%", width: "40px", height: "40px", cursor: "pointer",
      fontSize: "18px", transition: "all 0.3s ease", boxShadow: "0 4px 15px rgba(245, 87, 108, 0.3)",
      display: "flex", alignItems: "center", justifyContent: "center",
    });

    gameButton.addEventListener("click", openMiniGame);
    gameButton.addEventListener("mouseenter", () => {
      gameButton.style.transform = "scale(1.1)";
      gameButton.style.boxShadow = "0 6px 20px rgba(245, 87, 108, 0.5)";
    });
    gameButton.addEventListener("mouseleave", () => {
      gameButton.style.transform = "scale(1)";
      gameButton.style.boxShadow = "0 4px 15px rgba(245, 87, 108, 0.3)";
    });

    document.body.appendChild(gameButton);
    logger.info("🎮 미니게임 버튼 설정 완료");
  }

  // 미니게임 모달 열기 (게임 선택 메뉴)
  function openMiniGame() {
    const existingModal = document.querySelector(".minigame-modal");
    if (existingModal) {
      existingModal.remove();
    }

    const modal = document.createElement("div");
    modal.className = "minigame-modal";

    Object.assign(modal.style, {
      position: "fixed", top: "0", left: "0", width: "100%", height: "100%",
      backgroundColor: "rgba(0, 0, 0, 0.8)", zIndex: "10000",
      display: "flex", alignItems: "center", justifyContent: "center",
      animation: "fadeIn 0.3s ease"
    });

    const gameContainer = document.createElement("div");
    Object.assign(gameContainer.style, {
      backgroundColor: "#fff", borderRadius: "12px", padding: "30px",
      maxWidth: "500px", width: "90%",
      boxShadow: "0 20px 60px rgba(0, 0, 0, 0.5)",
      animation: "slideIn 0.3s ease"
    });

    gameContainer.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
        <h2 style="margin: 0; color: #333;">🎮 게임 선택</h2>
        <button class="close-game" style="background: #ef4444; color: white; border: none; border-radius: 50%; width: 30px; height: 30px; cursor: pointer; font-size: 18px; line-height: 1;">×</button>
      </div>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
        <button class="game-choice" data-game="snake" style="padding: 30px 20px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border: none; border-radius: 12px; cursor: pointer; font-size: 16px; font-weight: bold; transition: transform 0.2s;">
          <div style="font-size: 40px; margin-bottom: 10px;">🐍</div>
          Snake Game
        </button>
        <button class="game-choice" data-game="minesweeper" style="padding: 30px 20px; background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white; border: none; border-radius: 12px; cursor: pointer; font-size: 16px; font-weight: bold; transition: transform 0.2s;">
          <div style="font-size: 40px; margin-bottom: 10px;">💣</div>
          지뢰찾기
        </button>
      </div>
    `;

    modal.appendChild(gameContainer);
    document.body.appendChild(modal);

    const closeBtn = gameContainer.querySelector(".close-game");
    closeBtn.addEventListener("click", () => modal.remove());
    modal.addEventListener("click", (e) => {
      if (e.target === modal) modal.remove();
    });

    // 게임 선택 이벤트
    gameContainer.querySelectorAll(".game-choice").forEach(btn => {
      btn.addEventListener("mouseenter", () => btn.style.transform = "scale(1.05)");
      btn.addEventListener("mouseleave", () => btn.style.transform = "scale(1)");
      btn.addEventListener("click", () => {
        const game = btn.getAttribute("data-game");
        modal.remove();
        if (game === "snake") {
          openSnakeGame();
        } else if (game === "minesweeper") {
          openMinesweeperGame();
        }
      });
    });

    // 애니메이션 CSS 추가
    if (!document.getElementById("minigame-styles")) {
      const style = document.createElement("style");
      style.id = "minigame-styles";
      style.textContent = `
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideIn {
          from { transform: translateY(-50px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        .minigame-button:hover { transform: scale(1.1); }
        .game-choice:active { transform: scale(0.95) !important; }
        .close-game:hover { background: #dc2626; }
      `;
      document.head.appendChild(style);
    }
  }

  // Snake 게임 열기
  function openSnakeGame() {
    const modal = document.createElement("div");
    modal.className = "minigame-modal";

    Object.assign(modal.style, {
      position: "fixed", top: "0", left: "0", width: "100%", height: "100%",
      backgroundColor: "rgba(0, 0, 0, 0.8)", zIndex: "10000",
      display: "flex", alignItems: "center", justifyContent: "center",
      animation: "fadeIn 0.3s ease"
    });

    const gameContainer = document.createElement("div");
    Object.assign(gameContainer.style, {
      backgroundColor: "#fff", borderRadius: "12px", padding: "30px",
      maxWidth: "600px", width: "90%", maxHeight: "90vh", overflow: "auto",
      boxShadow: "0 20px 60px rgba(0, 0, 0, 0.5)",
      animation: "slideIn 0.3s ease"
    });

    gameContainer.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
        <h2 style="margin: 0; color: #333;">🐍 Snake Game</h2>
        <button class="close-game" style="background: #ef4444; color: white; border: none; border-radius: 50%; width: 30px; height: 30px; cursor: pointer; font-size: 18px; line-height: 1;">×</button>
      </div>
      <div style="text-align: center; margin-bottom: 15px;">
        <div style="font-size: 18px; color: #333; margin-bottom: 10px;">
          Score: <span id="game-score" style="font-weight: bold; color: #3b82f6;">0</span>
          | High Score: <span id="game-high-score" style="font-weight: bold; color: #f59e0b;">0</span>
        </div>
        <canvas id="snake-canvas" width="400" height="400" style="border: 3px solid #3b82f6; border-radius: 8px; background: #f0f9ff;"></canvas>
      </div>
      <div style="text-align: center; color: #666; font-size: 14px; margin-top: 15px;">
        <p style="margin: 5px 0;">⬆️⬇️⬅️➡️ 방향키로 이동</p>
        <p style="margin: 5px 0;">🍎 먹이를 먹고 점수를 올리세요!</p>
        <button id="restart-game" style="margin-top: 10px; padding: 10px 20px; background: #3b82f6; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 14px;">🔄 다시 시작</button>
      </div>
    `;

    modal.appendChild(gameContainer);
    document.body.appendChild(modal);

    const closeBtn = gameContainer.querySelector(".close-game");
    closeBtn.addEventListener("click", () => modal.remove());
    modal.addEventListener("click", (e) => {
      if (e.target === modal) modal.remove();
    });

    initSnakeGame();
  }

  // 지뢰찾기 게임 열기
  function openMinesweeperGame() {
    const modal = document.createElement("div");
    modal.className = "minigame-modal";

    Object.assign(modal.style, {
      position: "fixed", top: "0", left: "0", width: "100%", height: "100%",
      backgroundColor: "rgba(0, 0, 0, 0.8)", zIndex: "10000",
      display: "flex", alignItems: "center", justifyContent: "center",
      animation: "fadeIn 0.3s ease"
    });

    const gameContainer = document.createElement("div");
    Object.assign(gameContainer.style, {
      backgroundColor: "#fff", borderRadius: "12px", padding: "30px",
      maxWidth: "600px", width: "90%", maxHeight: "90vh", overflow: "auto",
      boxShadow: "0 20px 60px rgba(0, 0, 0, 0.5)",
      animation: "slideIn 0.3s ease"
    });

    gameContainer.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
        <h2 style="margin: 0; color: #333;">💣 지뢰찾기</h2>
        <button class="close-game" style="background: #ef4444; color: white; border: none; border-radius: 50%; width: 30px; height: 30px; cursor: pointer; font-size: 18px; line-height: 1;">×</button>
      </div>
      <div style="text-align: center; margin-bottom: 15px;">
        <div style="font-size: 16px; color: #333; margin-bottom: 15px; display: flex; justify-content: space-around;">
          <div>💣 지뢰: <span id="mine-count" style="font-weight: bold; color: #ef4444;">10</span></div>
          <div>🚩 깃발: <span id="flag-count" style="font-weight: bold; color: #3b82f6;">0</span></div>
          <div>⏱️ <span id="time-count" style="font-weight: bold; color: #059669;">0</span>s</div>
        </div>
        <div id="minesweeper-board" style="display: inline-block; border: 3px solid #3b82f6; border-radius: 8px; background: #e5e7eb; padding: 5px;"></div>
      </div>
      <div style="text-align: center; color: #666; font-size: 14px; margin-top: 15px;">
        <p style="margin: 5px 0;">🖱️ 좌클릭: 칸 열기 | 우클릭: 깃발 표시</p>
        <p style="margin: 5px 0;">💡 모든 안전한 칸을 열면 승리!</p>
        <div style="margin-top: 10px;">
          <button id="restart-minesweeper" style="padding: 10px 20px; background: #3b82f6; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 14px; margin-right: 10px;">🔄 다시 시작</button>
          <select id="difficulty-select" style="padding: 10px; border: 2px solid #3b82f6; border-radius: 6px; cursor: pointer; font-size: 14px;">
            <option value="easy">😊 쉬움 (8x8, 10개)</option>
            <option value="medium" selected>😐 보통 (10x10, 15개)</option>
            <option value="hard">😰 어려움 (12x12, 25개)</option>
          </select>
        </div>
      </div>
    `;

    modal.appendChild(gameContainer);
    document.body.appendChild(modal);

    const closeBtn = gameContainer.querySelector(".close-game");
    closeBtn.addEventListener("click", () => modal.remove());
    modal.addEventListener("click", (e) => {
      if (e.target === modal) modal.remove();
    });

    initMinesweeperGame();
  }

  // Snake 게임 로직
  function initSnakeGame() {
    const canvas = document.getElementById("snake-canvas");
    const ctx = canvas.getContext("2d");
    const scoreEl = document.getElementById("game-score");
    const highScoreEl = document.getElementById("game-high-score");
    const restartBtn = document.getElementById("restart-game");

    const gridSize = 20;
    const tileCount = canvas.width / gridSize;

    let snake = [{x: 10, y: 10}];
    let food = {x: 15, y: 15};
    let dx = 0;
    let dy = 0;
    let score = 0;
    let highScore = parseInt(localStorage.getItem("snake-high-score") || "0");
    let gameLoop;
    let gameSpeed = 100;

    highScoreEl.textContent = highScore;

    function drawGame() {
      // 배경
      ctx.fillStyle = "#f0f9ff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // 뱀
      snake.forEach((segment, index) => {
        ctx.fillStyle = index === 0 ? "#3b82f6" : "#60a5fa";
        ctx.fillRect(segment.x * gridSize, segment.y * gridSize, gridSize - 2, gridSize - 2);
        ctx.strokeStyle = "#1e40af";
        ctx.lineWidth = 1;
        ctx.strokeRect(segment.x * gridSize, segment.y * gridSize, gridSize - 2, gridSize - 2);
      });

      // 먹이
      ctx.fillStyle = "#ef4444";
      ctx.beginPath();
      ctx.arc(food.x * gridSize + gridSize / 2, food.y * gridSize + gridSize / 2, gridSize / 2 - 2, 0, 2 * Math.PI);
      ctx.fill();
    }

    function moveSnake() {
      if (dx === 0 && dy === 0) return;

      const head = {x: snake[0].x + dx, y: snake[0].y + dy};

      // 벽 충돌 체크
      if (head.x < 0 || head.x >= tileCount || head.y < 0 || head.y >= tileCount) {
        gameOver();
        return;
      }

      // 자기 자신 충돌 체크
      if (snake.some(segment => segment.x === head.x && segment.y === head.y)) {
        gameOver();
        return;
      }

      snake.unshift(head);

      // 먹이 먹기
      if (head.x === food.x && head.y === food.y) {
        score += 10;
        scoreEl.textContent = score;
        if (score > highScore) {
          highScore = score;
          highScoreEl.textContent = highScore;
          localStorage.setItem("snake-high-score", highScore.toString());
        }
        spawnFood();
        // 속도 증가
        if (gameSpeed > 50) {
          gameSpeed -= 2;
          clearInterval(gameLoop);
          gameLoop = setInterval(update, gameSpeed);
        }
      } else {
        snake.pop();
      }
    }

    function spawnFood() {
      food = {
        x: Math.floor(Math.random() * tileCount),
        y: Math.floor(Math.random() * tileCount)
      };
      // 뱀과 겹치면 다시 생성
      if (snake.some(segment => segment.x === food.x && segment.y === food.y)) {
        spawnFood();
      }
    }

    function gameOver() {
      clearInterval(gameLoop);
      ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "#fff";
      ctx.font = "bold 30px Arial";
      ctx.textAlign = "center";
      ctx.fillText("Game Over!", canvas.width / 2, canvas.height / 2 - 20);
      ctx.font = "20px Arial";
      ctx.fillText(`Score: ${score}`, canvas.width / 2, canvas.height / 2 + 20);
    }

    function update() {
      moveSnake();
      drawGame();
    }

    function resetGame() {
      snake = [{x: 10, y: 10}];
      dx = 0;
      dy = 0;
      score = 0;
      gameSpeed = 100;
      scoreEl.textContent = score;
      spawnFood();
      clearInterval(gameLoop);
      gameLoop = setInterval(update, gameSpeed);
      drawGame();
    }

    // 키보드 이벤트
    document.addEventListener("keydown", (e) => {
      if (!document.querySelector(".minigame-modal")) return;

      switch(e.key) {
        case "ArrowUp":
          if (dy === 0) { dx = 0; dy = -1; }
          e.preventDefault();
          break;
        case "ArrowDown":
          if (dy === 0) { dx = 0; dy = 1; }
          e.preventDefault();
          break;
        case "ArrowLeft":
          if (dx === 0) { dx = -1; dy = 0; }
          e.preventDefault();
          break;
        case "ArrowRight":
          if (dx === 0) { dx = 1; dy = 0; }
          e.preventDefault();
          break;
      }
    });

    restartBtn.addEventListener("click", resetGame);

    // 게임 시작
    drawGame();
    gameLoop = setInterval(update, gameSpeed);

    // 모달 닫힐 때 게임 루프 정리
    const modal = document.querySelector(".minigame-modal");
    const observer = new MutationObserver(() => {
      if (!document.body.contains(modal)) {
        clearInterval(gameLoop);
        observer.disconnect();
      }
    });
    observer.observe(document.body, { childList: true });
  }

  // 지뢰찾기 게임 로직
  function initMinesweeperGame() {
    const difficulties = {
      easy: { rows: 8, cols: 8, mines: 10 },
      medium: { rows: 10, cols: 10, mines: 15 },
      hard: { rows: 12, cols: 12, mines: 25 }
    };

    let currentDifficulty = 'medium';
    let config = difficulties[currentDifficulty];
    let board = [];
    let revealed = [];
    let flagged = [];
    let gameOver = false;
    let gameWon = false;
    let startTime = null;
    let timerInterval = null;

    const boardEl = document.getElementById('minesweeper-board');
    const mineCountEl = document.getElementById('mine-count');
    const flagCountEl = document.getElementById('flag-count');
    const timeCountEl = document.getElementById('time-count');
    const restartBtn = document.getElementById('restart-minesweeper');
    const difficultySelect = document.getElementById('difficulty-select');

    function initBoard() {
      config = difficulties[currentDifficulty];
      board = Array(config.rows).fill().map(() => Array(config.cols).fill(0));
      revealed = Array(config.rows).fill().map(() => Array(config.cols).fill(false));
      flagged = Array(config.rows).fill().map(() => Array(config.cols).fill(false));
      gameOver = false;
      gameWon = false;
      startTime = null;
      if (timerInterval) clearInterval(timerInterval);
      timeCountEl.textContent = '0';

      // 지뢰 배치
      let minesPlaced = 0;
      while (minesPlaced < config.mines) {
        const row = Math.floor(Math.random() * config.rows);
        const col = Math.floor(Math.random() * config.cols);
        if (board[row][col] !== -1) {
          board[row][col] = -1;
          minesPlaced++;
        }
      }

      // 인접 지뢰 개수 계산
      for (let r = 0; r < config.rows; r++) {
        for (let c = 0; c < config.cols; c++) {
          if (board[r][c] === -1) continue;
          let count = 0;
          for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
              const nr = r + dr;
              const nc = c + dc;
              if (nr >= 0 && nr < config.rows && nc >= 0 && nc < config.cols && board[nr][nc] === -1) {
                count++;
              }
            }
          }
          board[r][c] = count;
        }
      }

      updateUI();
      renderBoard();
    }

    function updateUI() {
      const flagCount = flagged.flat().filter(f => f).length;
      mineCountEl.textContent = config.mines;
      flagCountEl.textContent = flagCount;
    }

    function renderBoard() {
      boardEl.innerHTML = '';
      boardEl.style.display = 'grid';
      boardEl.style.gridTemplateColumns = `repeat(${config.cols}, 30px)`;
      boardEl.style.gap = '2px';

      for (let r = 0; r < config.rows; r++) {
        for (let c = 0; c < config.cols; c++) {
          const cell = document.createElement('div');
          cell.style.width = '30px';
          cell.style.height = '30px';
          cell.style.display = 'flex';
          cell.style.alignItems = 'center';
          cell.style.justifyContent = 'center';
          cell.style.cursor = 'pointer';
          cell.style.fontWeight = 'bold';
          cell.style.fontSize = '14px';
          cell.style.userSelect = 'none';
          cell.style.border = '1px solid #9ca3af';

          if (revealed[r][c]) {
            cell.style.background = '#f3f4f6';
            if (board[r][c] === -1) {
              cell.textContent = '💣';
              cell.style.background = '#fecaca';
            } else if (board[r][c] > 0) {
              cell.textContent = board[r][c];
              const colors = ['', '#3b82f6', '#059669', '#ef4444', '#7c3aed', '#f59e0b', '#06b6d4', '#ec4899', '#64748b'];
              cell.style.color = colors[board[r][c]];
            }
          } else {
            cell.style.background = '#cbd5e1';
            if (flagged[r][c]) {
              cell.textContent = '🚩';
            }

            cell.addEventListener('click', () => revealCell(r, c));
            cell.addEventListener('contextmenu', (e) => {
              e.preventDefault();
              toggleFlag(r, c);
            });
            cell.addEventListener('mouseenter', () => {
              if (!revealed[r][c] && !gameOver) {
                cell.style.background = '#94a3b8';
              }
            });
            cell.addEventListener('mouseleave', () => {
              if (!revealed[r][c]) {
                cell.style.background = '#cbd5e1';
              }
            });
          }

          boardEl.appendChild(cell);
        }
      }
    }

    function startTimer() {
      if (!startTime) {
        startTime = Date.now();
        timerInterval = setInterval(() => {
          const elapsed = Math.floor((Date.now() - startTime) / 1000);
          timeCountEl.textContent = elapsed;
        }, 1000);
      }
    }

    function revealCell(row, col) {
      if (gameOver || gameWon || revealed[row][col] || flagged[row][col]) return;

      startTimer();
      revealed[row][col] = true;

      if (board[row][col] === -1) {
        gameOver = true;
        revealAll();
        setTimeout(() => alert('💣 지뢰를 밟았습니다! 게임 오버!'), 100);
        if (timerInterval) clearInterval(timerInterval);
        return;
      }

      if (board[row][col] === 0) {
        // 빈 칸이면 주변도 자동으로 열기
        for (let dr = -1; dr <= 1; dr++) {
          for (let dc = -1; dc <= 1; dc++) {
            const nr = row + dr;
            const nc = col + dc;
            if (nr >= 0 && nr < config.rows && nc >= 0 && nc < config.cols && !revealed[nr][nc]) {
              revealCell(nr, nc);
            }
          }
        }
      }

      checkWin();
      renderBoard();
    }

    function toggleFlag(row, col) {
      if (gameOver || gameWon || revealed[row][col]) return;
      flagged[row][col] = !flagged[row][col];
      updateUI();
      renderBoard();
    }

    function revealAll() {
      for (let r = 0; r < config.rows; r++) {
        for (let c = 0; c < config.cols; c++) {
          revealed[r][c] = true;
        }
      }
      renderBoard();
    }

    function checkWin() {
      let safeCells = 0;
      let revealedSafeCells = 0;

      for (let r = 0; r < config.rows; r++) {
        for (let c = 0; c < config.cols; c++) {
          if (board[r][c] !== -1) {
            safeCells++;
            if (revealed[r][c]) revealedSafeCells++;
          }
        }
      }

      if (safeCells === revealedSafeCells) {
        gameWon = true;
        if (timerInterval) clearInterval(timerInterval);
        setTimeout(() => alert(`🎉 축하합니다! ${timeCountEl.textContent}초 만에 클리어!`), 100);
      }
    }

    restartBtn.addEventListener('click', initBoard);
    difficultySelect.addEventListener('change', (e) => {
      currentDifficulty = e.target.value;
      initBoard();
    });

    // 모달 닫힐 때 타이머 정리
    const modal = document.querySelector('.minigame-modal');
    const observer = new MutationObserver(() => {
      if (!document.body.contains(modal)) {
        if (timerInterval) clearInterval(timerInterval);
        observer.disconnect();
      }
    });
    observer.observe(document.body, { childList: true });

    initBoard();
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
