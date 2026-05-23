// Russian Betweenle PWA Game Controller
// Dict loaded from global dictionary.js -> const WORDS = [...]

// DOM Selectors
const logoEl = document.getElementById('game-logo');
const topWordEl = document.getElementById('top-word');
const bottomWordEl = document.getElementById('bottom-word');
const topDotEl = document.getElementById('top-dot');
const bottomDotEl = document.getElementById('bottom-dot');
const rangeCounterEl = document.getElementById('range-counter');
const historyContainerEl = document.getElementById('history-container');
const letterGridEl = document.getElementById('letter-grid');
const keyboardEl = document.getElementById('keyboard');
const helpBtn = document.getElementById('help-btn');
const statsBtn = document.getElementById('stats-btn');
const helpModal = document.getElementById('help-modal');
const statsModal = document.getElementById('stats-modal');
const closeHelpBtn = document.getElementById('close-help-btn');
const closeStatsBtn = document.getElementById('close-stats-btn');
const playAgainBtn = document.getElementById('play-again-btn');
const toastEl = document.getElementById('toast-message');

// Modal Elements for Stats
const statsPlayedEl = document.getElementById('stat-played');
const statsWinPercentEl = document.getElementById('stat-winpercent');
const statsStreakEl = document.getElementById('stat-streak');
const statsMaxStreakEl = document.getElementById('stat-maxstreak');
const secretWordBoxEl = document.getElementById('secret-word-box');
const secretWordLabelEl = document.getElementById('secret-word-label');
const secretWordTextEl = document.getElementById('secret-word-text');
const statsModalTitle = document.getElementById('stats-modal-title');

// Game State
let secretWord = '';
let topWord = 'ааааа';
let bottomWord = 'яяяяя';
let guessHistory = []; // { word: string, relation: 'top'|'bottom', wordsLeft: number }
let currentGuess = '';
let isGameOver = false;
const maxAttempts = 15;

// Statistics
let stats = {
  played: 0,
  won: 0,
  streak: 0,
  maxStreak: 0
};

// --- INITIALIZATION ---
function initGame() {
  // 1. Ensure dictionary is loaded
  if (typeof WORDS === 'undefined' || !Array.isArray(WORDS) || WORDS.length === 0) {
    showToast('Ошибка загрузки словаря!', 5000);
    rangeCounterEl.textContent = 'Ошибка словаря!';
    return;
  }

  // 2. Load Stats
  loadStats();

  // 3. Load Active Saved Game or Start New
  const savedState = localStorage.getItem('betweenle_ru_game_state');
  if (savedState) {
    try {
      const state = JSON.parse(savedState);
      secretWord = state.secretWord;
      topWord = state.topWord || 'ааааа';
      bottomWord = state.bottomWord || 'яяяяя';
      guessHistory = state.guessHistory || [];
      isGameOver = state.isGameOver || false;
      
      // Safety check: is the loaded secret word valid?
      if (!WORDS.includes(secretWord)) {
        startNewGame();
        return;
      }
    } catch (e) {
      console.error('Failed to parse saved state:', e);
      startNewGame();
      return;
    }
  } else {
    startNewGame(false); // start new without saving again immediately
  }

  // 4. Render Layout
  updateUI();
  setupEventListeners();
  
  // Show intro help modal if it's the player's first time
  if (!localStorage.getItem('betweenle_ru_first_time')) {
    openModal(helpModal);
    localStorage.setItem('betweenle_ru_first_time', 'true');
  }
}

// --- NEW GAME CREATION ---
function startNewGame(saveState = true) {
  // Choose random secret word
  const randomIndex = Math.floor(Math.random() * WORDS.length);
  secretWord = WORDS[randomIndex];
  
  // Reset boundaries
  topWord = 'ааааа';
  bottomWord = 'яяяяя';
  guessHistory = [];
  currentGuess = '';
  isGameOver = false;

  // Clear typing grid
  updateInputGrid();

  if (saveState) {
    saveGameState();
  }
  
  // Dev hint (uncomment for testing)
  // console.log('Секретное слово:', secretWord);
}

// --- LOCAL STORAGE STATE MANAGEMENT ---
function saveGameState() {
  const state = {
    secretWord,
    topWord,
    bottomWord,
    guessHistory,
    isGameOver
  };
  localStorage.setItem('betweenle_ru_game_state', JSON.stringify(state));
}

function loadStats() {
  const savedStats = localStorage.getItem('betweenle_ru_statistics');
  if (savedStats) {
    try {
      stats = JSON.parse(savedStats);
    } catch (e) {
      console.error('Failed to parse stats:', e);
    }
  }
}

function saveStats() {
  localStorage.setItem('betweenle_ru_statistics', JSON.stringify(stats));
}

// --- HELPER DICTIONARY VIRTUAL INDICES ---
// Find alphabetical location using localeCompare
function getVirtualIndex(word) {
  let count = 0;
  for (let i = 0; i < WORDS.length; i++) {
    if (WORDS[i].localeCompare(word, 'ru') < 0) {
      count++;
    } else {
      break;
    }
  }
  return count;
}

function getWordsLeftCount() {
  const idxTop = getVirtualIndex(topWord);
  const idxBottom = getVirtualIndex(bottomWord);
  
  // Exclude the boundary words if they are dictionary words themselves
  // Since topWord starts as 'ааааа' (virtual idx 0) and bottomWord as 'яяяяя' (virtual idx WORDS.length)
  // If topWord is a valid dictionary word, it takes index matching itself.
  let remaining = idxBottom - idxTop;
  
  // If topWord is in WORDS, index difference counts topWord. We need to exclude it.
  if (WORDS.includes(topWord)) {
    remaining -= 1;
  }
  
  return Math.max(0, remaining);
}

// --- UI RENDERING ---
function updateUI() {
  // Update Boundary Cards
  topWordEl.textContent = topWord;
  bottomWordEl.textContent = bottomWord;

  // Update Range Counter
  const count = getWordsLeftCount();
  rangeCounterEl.textContent = `Осталось слов: ${count.toLocaleString('ru-RU')}`;

  // Update Proximity Indicator (Orange Dots)
  updateProximityDots();

  // Update History list
  renderHistory();

  // Update Typing Grid
  updateInputGrid();
}

function updateProximityDots() {
  if (isGameOver) {
    topDotEl.classList.remove('active');
    bottomDotEl.classList.remove('active');
    return;
  }

  const idxTop = getVirtualIndex(topWord);
  const idxBottom = getVirtualIndex(bottomWord);
  const idxSecret = getVirtualIndex(secretWord);

  const distTop = idxSecret - idxTop;
  const distBottom = idxBottom - idxSecret;

  if (distTop < distBottom) {
    topDotEl.classList.add('active');
    bottomDotEl.classList.remove('active');
  } else if (distBottom < distTop) {
    bottomDotEl.classList.add('active');
    topDotEl.classList.remove('active');
  } else {
    // Equidistant
    topDotEl.classList.remove('active');
    bottomDotEl.classList.remove('active');
  }
}

function renderHistory() {
  historyContainerEl.innerHTML = '';

  if (guessHistory.length === 0) {
    // Show placeholder
    historyContainerEl.innerHTML = `
      <div class="history-placeholder">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
        </svg>
        <span>Сделайте первую попытку, чтобы сузить диапазон!</span>
      </div>
    `;
    return;
  }

  // Populate history backwards (most recent first)
  for (let i = guessHistory.length - 1; i >= 0; i--) {
    const item = guessHistory[i];
    const isWinner = item.word === secretWord;
    const badgeClass = isWinner ? 'badge-winner' : (item.relation === 'top' ? 'badge-top' : 'badge-bottom');
    const badgeLabel = isWinner ? 'Победа!' : (item.relation === 'top' ? '⬆ вверху' : '⬇ внизу');

    const itemEl = document.createElement('div');
    itemEl.classList.add('history-item');
    
    itemEl.innerHTML = `
      <div class="history-left">
        <span class="history-index">${i + 1}</span>
        <span class="history-word">${item.word}</span>
        <span class="history-badge ${badgeClass}">${badgeLabel}</span>
      </div>
      <div class="history-right">
        <span class="history-range-desc">Слов осталось</span>
        <span class="history-range-num">${item.wordsLeft.toLocaleString('ru-RU')}</span>
      </div>
    `;

    historyContainerEl.appendChild(itemEl);
  }
}

function updateInputGrid() {
  for (let i = 0; i < 5; i++) {
    const box = document.getElementById(`box-${i}`);
    if (i < currentGuess.length) {
      box.textContent = currentGuess[i];
      box.classList.add('filled');
    } else {
      box.textContent = '';
      box.classList.remove('filled');
    }
  }
}

// --- GAMEPLAY GUESS VALIDATION & SUBMISSION ---
function handleKeyInput(char) {
  if (isGameOver) return;
  if (currentGuess.length < 5) {
    currentGuess += char.toLowerCase();
    updateInputGrid();
  }
}

function handleBackspace() {
  if (isGameOver) return;
  if (currentGuess.length > 0) {
    currentGuess = currentGuess.slice(0, -1);
    updateInputGrid();
  }
}

function handleSubmitGuess() {
  if (isGameOver) return;

  // 1. Check length
  if (currentGuess.length < 5) {
    showToast('Недостаточно букв!');
    shakeGrid();
    return;
  }

  // 2. Check dictionary
  if (!WORDS.includes(currentGuess)) {
    showToast('Нет в словаре!');
    shakeGrid();
    return;
  }

  // 3. Check boundaries (strictly between topWord and bottomWord)
  const compTop = currentGuess.localeCompare(topWord, 'ru');
  const compBottom = currentGuess.localeCompare(bottomWord, 'ru');

  if (compTop <= 0 || compBottom >= 0) {
    showToast(`Слово должно быть между ${topWord.toUpperCase()} и ${bottomWord.toUpperCase()}!`);
    shakeGrid();
    return;
  }

  // GUESS IS VALID -> Process it!
  const wordsLeftBefore = getWordsLeftCount();

  if (currentGuess === secretWord) {
    // WIN STATE
    isGameOver = true;
    
    // Track history
    guessHistory.push({
      word: currentGuess,
      relation: 'equal',
      wordsLeft: 0
    });

    updateStats(true);
    saveStats();
    saveGameState();
    updateUI();
    
    setTimeout(() => {
      triggerConfetti();
      showStatsPopup('Победа! 🎉');
    }, 500);

  } else {
    // SHRINK BOUNDARIES
    const compSecret = currentGuess.localeCompare(secretWord, 'ru');
    let relation = 'top';

    if (compSecret < 0) {
      // Guess is BEFORE secretWord alphabetically -> new top boundary
      topWord = currentGuess;
      relation = 'top';
    } else {
      // Guess is AFTER secretWord alphabetically -> new bottom boundary
      bottomWord = currentGuess;
      relation = 'bottom';
    }

    // Add to history
    const wordsLeftAfter = getWordsLeftCount();
    guessHistory.push({
      word: currentGuess,
      relation: relation,
      wordsLeft: wordsLeftAfter
    });

    currentGuess = '';
    saveGameState();
    updateUI();

    // Check Loss State (15 attempts)
    if (guessHistory.length >= maxAttempts) {
      isGameOver = true;
      updateStats(false);
      saveStats();
      saveGameState();
      
      setTimeout(() => {
        showStatsPopup('Игра окончена 😔');
      }, 500);
    }
  }
}

// --- STATS UPDATE LOGIC ---
function updateStats(won) {
  stats.played += 1;
  if (won) {
    stats.won += 1;
    stats.streak += 1;
    if (stats.streak > stats.maxStreak) {
      stats.maxStreak = stats.streak;
    }
  } else {
    stats.streak = 0;
  }
}

// --- DYNAMIC ALERTS / TOASTS ---
function showToast(message, duration = 2500) {
  toastEl.textContent = message;
  toastEl.classList.add('show');
  
  setTimeout(() => {
    toastEl.classList.remove('show');
  }, duration);
}

function shakeGrid() {
  letterGridEl.classList.add('shake');
  for (let i = 0; i < 5; i++) {
    document.getElementById(`box-${i}`).classList.add('error');
  }

  setTimeout(() => {
    letterGridEl.classList.remove('shake');
    for (let i = 0; i < 5; i++) {
      document.getElementById(`box-${i}`).classList.remove('error');
    }
  }, 500);
}

// --- POPUPS & MODALS ---
function openModal(modal) {
  modal.classList.add('active');
}

function closeModal(modal) {
  modal.classList.remove('active');
}

function showStatsPopup(title) {
  statsModalTitle.textContent = title;
  
  // Fill stats values
  statsPlayedEl.textContent = stats.played;
  
  const winPercent = stats.played > 0 ? Math.round((stats.won / stats.played) * 100) : 0;
  statsWinPercentEl.textContent = `${winPercent}%`;
  
  statsStreakEl.textContent = stats.streak;
  statsMaxStreakEl.textContent = stats.maxStreak;

  // Show secret word box if game is over
  if (isGameOver) {
    secretWordTextEl.textContent = secretWord;
    
    if (guessHistory[guessHistory.length - 1].word === secretWord) {
      secretWordBoxEl.classList.remove('lost');
      secretWordLabelEl.textContent = `Угадано за ${guessHistory.length} поп.`;
    } else {
      secretWordBoxEl.classList.add('lost');
      secretWordLabelEl.textContent = 'Секретное слово';
    }
    
    secretWordBoxEl.style.display = 'block';
    playAgainBtn.style.display = 'block';
  } else {
    secretWordBoxEl.style.display = 'none';
    playAgainBtn.style.display = 'none';
  }

  openModal(statsModal);
}

// --- EVENT LISTENERS BINDING ---
function setupEventListeners() {
  // Help Modal
  helpBtn.addEventListener('click', () => openModal(helpModal));
  closeHelpBtn.addEventListener('click', () => closeModal(helpModal));
  helpModal.addEventListener('click', (e) => {
    if (e.target === helpModal) closeModal(helpModal);
  });

  // Stats Modal
  statsBtn.addEventListener('click', () => showStatsPopup('Статистика'));
  closeStatsBtn.addEventListener('click', () => closeModal(statsModal));
  statsModal.addEventListener('click', (e) => {
    if (e.target === statsModal) closeModal(statsModal);
  });

  // Play Again Btn
  playAgainBtn.addEventListener('click', () => {
    closeModal(statsModal);
    startNewGame();
    updateUI();
  });

  // Click on Title logo -> secret debugging easter egg
  logoEl.addEventListener('click', () => {
    showToast(`Слов в словаре: ${WORDS.length}`);
  });

  // Virtual Keyboard clicks
  keyboardEl.addEventListener('click', (e) => {
    const keyBtn = e.target.closest('button.key');
    if (!keyBtn) return;

    const keyValue = keyBtn.getAttribute('data-key');
    
    if (keyValue === 'enter') {
      handleSubmitGuess();
    } else if (keyValue === 'backspace') {
      handleBackspace();
    } else {
      handleKeyInput(keyValue);
    }
  });

  // Physical Keyboard binding
  document.addEventListener('keydown', (e) => {
    if (e.repeat) return;
    if (e.altKey || e.ctrlKey || e.metaKey) return;

    // Check if modal is open. If so, Escape key closes it.
    if (e.key === 'Escape') {
      closeModal(helpModal);
      closeModal(statsModal);
      return;
    }

    if (e.key === 'Enter') {
      handleSubmitGuess();
    } else if (e.key === 'Backspace') {
      handleBackspace();
    } else {
      // Validate Russian Cyrillic characters (both lowercase and uppercase)
      // Range: [а-яёА-ЯЁ]
      const key = e.key.toLowerCase();
      if (key.length === 1 && /^[а-яё]$/u.test(key)) {
        handleKeyInput(key);
      }
    }
  });
}

// --- NATIVE CANVAS CONFETTI SYSTEM ---
function triggerConfetti() {
  const canvas = document.getElementById('confetti-canvas');
  const ctx = canvas.getContext('2d');
  
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  
  let particles = [];
  const colors = ['#f97316', '#3b82f6', '#10b981', '#facc15', '#ec4899', '#8b5cf6'];
  
  for (let i = 0; i < 150; i++) {
    particles.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height - canvas.height,
      r: Math.random() * 5 + 3,
      d: Math.random() * canvas.height,
      color: colors[Math.floor(Math.random() * colors.length)],
      tilt: Math.random() * 10 - 5,
      tiltAngleIncremental: Math.random() * 0.07 + 0.02,
      tiltAngle: 0
    });
  }
  
  let animationId;
  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    let active = false;
    
    particles.forEach((p) => {
      p.tiltAngle += p.tiltAngleIncremental;
      p.y += (Math.cos(p.d) + 3 + p.r / 2) / 2.5;
      p.x += Math.sin(p.tiltAngle) * 1.5;
      p.tilt = Math.sin(p.tiltAngle - p.r / 2) * 12;
      
      if (p.y <= canvas.height + 20) {
        active = true;
      }
      
      ctx.beginPath();
      ctx.lineWidth = p.r;
      ctx.strokeStyle = p.color;
      ctx.moveTo(p.x + p.tilt + p.r / 2, p.y);
      ctx.lineTo(p.x + p.tilt, p.y + p.tilt + p.r / 2);
      ctx.stroke();
    });
    
    if (active) {
      animationId = requestAnimationFrame(draw);
    } else {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }
  
  draw();
  
  // Resize handler
  window.addEventListener('resize', () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  });
}

// --- BOOTSTRAP APP ---
window.addEventListener('DOMContentLoaded', initGame);
