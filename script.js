/**
 * CSC336 Web Technologies - Lab Mid Fall 2026
 * Typing Challenge Game
 * Clean ES6+ Modular Code (Zero external gaming libraries, easy for Viva explanation)
 */

// -------------------------------------------------------------
// Global Configuration & Game State
// -------------------------------------------------------------
const CONFIG = {
  bubbles: {
    maxMisses: 6,
    minSimultaneous: 5,
    levels: {
      easy:   { baseSpeed: 1.2, spawnInterval: 1800, maxBubbles: 5 },
      medium: { baseSpeed: 2.0, spawnInterval: 1400, maxBubbles: 7 },
      hard:   { baseSpeed: 3.0, spawnInterval: 1000, maxBubbles: 9 }
    },
    letters: "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
  },
  keymagnet: {
    durationSec: 30,
    levels: {
      easy:   { pointsPerHit: 10, penalty: 3 },
      medium: { pointsPerHit: 15, penalty: 5 },
      hard:   { pointsPerHit: 20, penalty: 8 }
    },
    keySets: {
      homerow: ["A", "S", "D", "F", "J", "K", "L"],
      toprow:  ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"],
      numbers: ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"],
      all:     "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("")
    }
  }
};

class GameApplication {
  constructor() {
    this.currentMode = null;       // 'bubbles' or 'keymagnet'
    this.currentDifficulty = 'easy';
    this.selectedKeySet = 'homerow';

    // Game Engines
    this.bubbleEngine = null;
    this.keyMagnetEngine = null;

    // Attach global keyboard listener
    window.addEventListener('keydown', (e) => this.handleGlobalKeyDown(e));
  }

  // View Switcher Utility
  switchView(viewId) {
    const screens = [
      'screen-home',
      'screen-setup',
      'screen-game-bubbles',
      'screen-game-keymagnet',
      'screen-results'
    ];
    screens.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.classList.add('d-none');
    });
    const target = document.getElementById(viewId);
    if (target) target.classList.remove('d-none');
  }

  // Home Screen
  showHome() {
    this.stopAllEngines();
    this.switchView('screen-home');
  }

  // Setup Screen (Difficulty & Options)
  showModeSetup(mode) {
    this.currentMode = mode;
    this.switchView('screen-setup');

    const titleEl = document.getElementById('setup-title');
    const descEl = document.getElementById('setup-desc');
    const keySetGroup = document.getElementById('keyset-group');

    if (mode === 'bubbles') {
      titleEl.textContent = 'Mode A: Bubbles Setup';
      descEl.textContent = 'Configure speed and difficulty for letter floating bubbles.';
      keySetGroup.classList.add('d-none');
    } else {
      titleEl.textContent = 'Mode B: KeyMagnet Setup';
      descEl.textContent = 'Select difficulty and your practice target key set.';
      keySetGroup.classList.remove('d-none');
    }
  }

  // Start selected game
  startGame() {
    const diffInputs = document.getElementsByName('difficulty');
    for (let radio of diffInputs) {
      if (radio.checked) {
        this.currentDifficulty = radio.value;
        break;
      }
    }
    this.selectedKeySet = document.getElementById('keyset-select').value;

    if (this.currentMode === 'bubbles') {
      this.switchView('screen-game-bubbles');
      this.bubbleEngine = new BubbleGame(this.currentDifficulty, this);
      this.bubbleEngine.start();
    } else if (this.currentMode === 'keymagnet') {
      this.switchView('screen-game-keymagnet');
      this.keyMagnetEngine = new KeyMagnetGame(this.currentDifficulty, this.selectedKeySet, this);
      this.keyMagnetEngine.start();
    }
  }

  // Restart Current Game (Without reloading page)
  restartCurrentGame() {
    this.stopAllEngines();
    this.startGame();
  }

  // Reset to Home
  resetToHome() {
    this.stopAllEngines();
    this.showHome();
  }

  // Stop running timers & loops to prevent memory leak/duplicate loops
  stopAllEngines() {
    if (this.bubbleEngine) {
      this.bubbleEngine.cleanup();
      this.bubbleEngine = null;
    }
    if (this.keyMagnetEngine) {
      this.keyMagnetEngine.cleanup();
      this.keyMagnetEngine = null;
    }
  }

  // Key event router
  handleGlobalKeyDown(e) {
    // Ignore modifier keys or F-keys
    if (e.ctrlKey || e.altKey || e.metaKey || e.key.length > 1) return;

    const pressedKey = e.key.toUpperCase();

    if (this.bubbleEngine && this.bubbleEngine.isRunning) {
      this.bubbleEngine.handleInput(pressedKey);
    } else if (this.keyMagnetEngine && this.keyMagnetEngine.isRunning) {
      this.keyMagnetEngine.handleInput(pressedKey);
    }
  }

  // Display Unified Results Screen
  showResults(resultsData) {
    this.stopAllEngines();
    this.switchView('screen-results');

    document.getElementById('results-icon').textContent = resultsData.icon || '🏁';
    document.getElementById('results-title').textContent = resultsData.title;
    document.getElementById('results-subtitle').textContent = resultsData.subtitle;

    const tbody = document.getElementById('results-table-body');
    tbody.innerHTML = '';

    resultsData.stats.forEach(item => {
      const tr = document.createElement('tr');
      tr.innerHTML = `<th class="text-start ps-4 w-50">${item.label}</th><td class="text-end pe-4 fw-bold">${item.value}</td>`;
      tbody.appendChild(tr);
    });
  }
}


// -------------------------------------------------------------
// MODE A: BUBBLES GAME ENGINE
// -------------------------------------------------------------
class BubbleGame {
  constructor(difficulty, app) {
    this.app = app;
    this.diffConfig = CONFIG.bubbles.levels[difficulty];
    this.difficulty = difficulty;

    // State Variables
    this.score = 0;
    this.misses = 0;
    this.popped = 0;
    this.totalTyped = 0;
    this.wrongKeys = 0;
    this.isRunning = false;

    // Progression state
    this.currentSpeed = this.diffConfig.baseSpeed;
    this.bubblesList = []; // active bubble objects: { id, letter, x, y, element }

    // Intervals & Animation frame handles
    this.spawnTimerId = null;
    this.animationFrameId = null;

    // DOM Elements
    this.arena = document.getElementById('bubble-arena');
    this.container = document.getElementById('bubble-container');
    this.scoreEl = document.getElementById('bubble-score');
    this.missesEl = document.getElementById('bubble-misses');
    this.poppedEl = document.getElementById('bubble-popped');
    this.diffBadge = document.getElementById('bubble-diff-badge');
    this.feedbackOverlay = document.getElementById('bubble-feedback-overlay');
  }

  start() {
    this.cleanup();
    this.isRunning = true;
    this.updateHUD();

    this.diffBadge.textContent = this.difficulty;
    this.container.innerHTML = '';

    // Spawn initial bubbles up to minimum count
    for (let i = 0; i < CONFIG.bubbles.minSimultaneous; i++) {
      this.spawnBubble();
    }

    // Interval to spawn new bubbles periodically
    this.spawnTimerId = setInterval(() => {
      if (this.bubblesList.length < this.diffConfig.maxBubbles) {
        this.spawnBubble();
      }
    }, this.diffConfig.spawnInterval);

    // Main animation loop using requestAnimationFrame for 60fps smooth movement
    this.animate = this.animate.bind(this);
    this.animationFrameId = requestAnimationFrame(this.animate);
  }

  spawnBubble() {
    const letters = CONFIG.bubbles.letters;
    const randomLetter = letters[Math.floor(Math.random() * letters.length)];

    const bubbleEl = document.createElement('div');
    bubbleEl.className = 'bubble';
    bubbleEl.textContent = randomLetter;

    // Arena width constraint
    const arenaWidth = this.arena.clientWidth || 600;
    const arenaHeight = this.arena.clientHeight || 480;

    const bubbleWidth = 65;
    const maxX = Math.max(10, arenaWidth - bubbleWidth - 10);
    const posX = Math.floor(Math.random() * maxX) + 5;
    const posY = arenaHeight - (Math.random() * 40); // start at bottom

    bubbleEl.style.left = `${posX}px`;
    bubbleEl.style.top = `${posY}px`;

    this.container.appendChild(bubbleEl);

    this.bubblesList.push({
      id: Math.random().toString(36).substr(2, 9),
      letter: randomLetter,
      x: posX,
      y: posY,
      element: bubbleEl
    });
  }

  animate() {
    if (!this.isRunning) return;

    const toRemoveIndices = [];

    // Move each bubble upward
    for (let i = 0; i < this.bubblesList.length; i++) {
      const bubble = this.bubblesList[i];
      bubble.y -= this.currentSpeed;
      bubble.element.style.top = `${bubble.y}px`;

      // Check boundary collision (reached the top)
      if (bubble.y <= -60) {
        toRemoveIndices.push(i);
        this.handleMiss(bubble);
      }
    }

    // Remove missed bubbles from state array (in reverse to preserve indices)
    for (let i = toRemoveIndices.length - 1; i >= 0; i--) {
      const idx = toRemoveIndices[i];
      if (this.bubblesList[idx] && this.bubblesList[idx].element.parentNode) {
        this.bubblesList[idx].element.remove();
      }
      this.bubblesList.splice(idx, 1);
    }

    // Keep minimum required bubbles active
    while (this.bubblesList.length < CONFIG.bubbles.minSimultaneous && this.isRunning) {
      this.spawnBubble();
    }

    if (this.isRunning) {
      this.animationFrameId = requestAnimationFrame(this.animate);
    }
  }

  handleInput(key) {
    this.totalTyped++;

    // Find the lowest bubble matching this key (or first matched)
    const matchIndex = this.bubblesList.findIndex(b => b.letter === key);

    if (matchIndex !== -1) {
      // SUCCESS HIT
      const matched = this.bubblesList[matchIndex];
      this.score += 10;
      this.popped++;

      // Difficulty progression: gradually increase bubble speed as score grows
      if (this.popped % 5 === 0) {
        this.currentSpeed += 0.25;
      }

      // Visual feedback: pop animation & flash
      matched.element.classList.add('popped');
      setTimeout(() => {
        if (matched.element && matched.element.parentNode) {
          matched.element.remove();
        }
      }, 150);

      this.bubblesList.splice(matchIndex, 1);
      this.flashFeedback('correct');
    } else {
      // INCORRECT KEYPRESS PENALTY
      this.wrongKeys++;
      this.score = Math.max(0, this.score - 5); // 5 points penalty
      this.flashFeedback('wrong');
    }

    this.updateHUD();
  }

  handleMiss(bubble) {
    this.misses++;
    this.updateHUD();
    this.flashFeedback('wrong');

    if (this.misses >= CONFIG.bubbles.maxMisses) {
      this.endGame(false);
    }
  }

  flashFeedback(type) {
    this.feedbackOverlay.className = `feedback-overlay ${type === 'correct' ? 'correct-flash' : 'wrong-flash'}`;
    setTimeout(() => {
      this.feedbackOverlay.className = 'feedback-overlay';
    }, 180);
  }

  updateHUD() {
    this.scoreEl.textContent = this.score;
    this.missesEl.textContent = this.misses;
    this.poppedEl.textContent = this.popped;
  }

  endGame(won) {
    this.cleanup();
    const accuracy = this.totalTyped > 0 
      ? Math.round((this.popped / this.totalTyped) * 100) 
      : 0;

    this.app.showResults({
      icon: won ? '🎉' : '💥',
      title: won ? 'Victory!' : 'Game Over (Miss Limit Reached)',
      subtitle: won ? 'You popped all target bubbles!' : `You reached ${CONFIG.bubbles.maxMisses} misses.`,
      stats: [
        { label: 'Game Mode', value: 'Mode A: Bubbles' },
        { label: 'Difficulty', value: this.difficulty.toUpperCase() },
        { label: 'Final Score', value: this.score },
        { label: 'Bubbles Popped', value: this.popped },
        { label: 'Total Misses', value: `${this.misses} / ${CONFIG.bubbles.maxMisses}` },
        { label: 'Wrong Keypresses', value: this.wrongKeys },
        { label: 'Typing Accuracy', value: `${accuracy}%` }
      ]
    });
  }

  cleanup() {
    this.isRunning = false;
    if (this.spawnTimerId) {
      clearInterval(this.spawnTimerId);
      this.spawnTimerId = null;
    }
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    this.bubblesList = [];
    if (this.container) {
      this.container.innerHTML = '';
    }
  }
}


// -------------------------------------------------------------
// MODE B: KEYMAGNET (KEYBOARD PRECISION) ENGINE
// -------------------------------------------------------------
class KeyMagnetGame {
  constructor(difficulty, keySetName, app) {
    this.app = app;
    this.difficulty = difficulty;
    this.keySetName = keySetName;
    this.diffConfig = CONFIG.keymagnet.levels[difficulty];
    this.keyPool = CONFIG.keymagnet.keySets[keySetName] || CONFIG.keymagnet.keySets.homerow;

    // State Variables
    this.score = 0;
    this.correctCount = 0;
    this.wrongCount = 0;
    this.remainingTime = CONFIG.keymagnet.durationSec;
    this.isRunning = false;

    // Precision Response Time Tracking
    this.targetKey = '';
    this.targetStartTime = 0;
    this.responseTimes = []; // list of millisecond times

    // Timer Handles
    this.clockIntervalId = null;

    // DOM Elements
    this.targetCharEl = document.getElementById('km-target-char');
    this.targetBoxEl = document.getElementById('km-target-display');
    this.feedbackTextEl = document.getElementById('km-feedback-text');
    this.scoreEl = document.getElementById('km-score');
    this.timerEl = document.getElementById('km-timer');
    this.accuracyEl = document.getElementById('km-accuracy');
    this.avgTimeEl = document.getElementById('km-avg-time');
  }

  start() {
    this.cleanup();
    this.isRunning = true;
    this.score = 0;
    this.correctCount = 0;
    this.wrongCount = 0;
    this.responseTimes = [];
    this.remainingTime = CONFIG.keymagnet.durationSec;

    this.updateHUD();
    this.nextTarget();

    // 1-second countdown clock
    this.clockIntervalId = setInterval(() => {
      this.remainingTime--;
      this.updateHUD();

      if (this.remainingTime <= 0) {
        this.endGame();
      }
    }, 1000);
  }

  nextTarget() {
    // Pick random key from pool (different from current if pool > 1)
    let next = this.targetKey;
    if (this.keyPool.length > 1) {
      while (next === this.targetKey) {
        next = this.keyPool[Math.floor(Math.random() * this.keyPool.length)];
      }
    } else {
      next = this.keyPool[0];
    }

    this.targetKey = next;
    this.targetCharEl.textContent = this.targetKey;
    this.targetStartTime = performance.now();

    // Highlight key on the virtual keyboard
    this.highlightVirtualKey(this.targetKey);
  }

  highlightVirtualKey(char) {
    document.querySelectorAll('.key').forEach(k => k.classList.remove('target-active'));
    const targetKeyEl = document.querySelector(`.key[data-key="${char}"]`);
    if (targetKeyEl) {
      targetKeyEl.classList.add('target-active');
    }
  }

  handleInput(pressedKey) {
    const elapsed = Math.round(performance.now() - this.targetStartTime);
    const virtualKeyEl = document.querySelector(`.key[data-key="${pressedKey}"]`);

    if (pressedKey === this.targetKey) {
      // CORRECT KEYPRESS
      this.correctCount++;
      this.score += this.diffConfig.pointsPerHit;
      this.responseTimes.push(elapsed);

      // Feedback animation
      this.targetBoxEl.className = 'target-key-box mx-auto shadow mb-4 correct-pulse';
      this.feedbackTextEl.innerHTML = `<span class="text-success">✔ Correct! (+${this.diffConfig.pointsPerHit}) [${elapsed} ms]</span>`;
      
      if (virtualKeyEl) {
        virtualKeyEl.classList.add('key-hit-success');
        setTimeout(() => virtualKeyEl.classList.remove('key-hit-success'), 200);
      }

      setTimeout(() => {
        this.targetBoxEl.className = 'target-key-box mx-auto shadow mb-4';
      }, 150);

      this.updateHUD();
      this.nextTarget();
    } else {
      // WRONG KEYPRESS
      this.wrongCount++;
      this.score = Math.max(0, this.score - this.diffConfig.penalty);

      this.targetBoxEl.className = 'target-key-box mx-auto shadow mb-4 wrong-pulse';
      this.feedbackTextEl.innerHTML = `<span class="text-danger">✖ Missed! Target was "${this.targetKey}" (-${this.diffConfig.penalty})</span>`;

      if (virtualKeyEl) {
        virtualKeyEl.classList.add('key-hit-error');
        setTimeout(() => virtualKeyEl.classList.remove('key-hit-error'), 200);
      }

      setTimeout(() => {
        this.targetBoxEl.className = 'target-key-box mx-auto shadow mb-4';
      }, 150);

      this.updateHUD();
    }
  }

  updateHUD() {
    this.scoreEl.textContent = this.score;
    this.timerEl.textContent = `${this.remainingTime}s`;

    const total = this.correctCount + this.wrongCount;
    const accuracy = total > 0 ? Math.round((this.correctCount / total) * 100) : 100;
    this.accuracyEl.textContent = `${accuracy}%`;

    const avgMs = this.responseTimes.length > 0
      ? Math.round(this.responseTimes.reduce((a, b) => a + b, 0) / this.responseTimes.length)
      : 0;
    this.avgTimeEl.textContent = `${avgMs} ms`;
  }

  endGame() {
    this.cleanup();

    const total = this.correctCount + this.wrongCount;
    const accuracy = total > 0 ? Math.round((this.correctCount / total) * 100) : 0;
    const avgMs = this.responseTimes.length > 0
      ? Math.round(this.responseTimes.reduce((a, b) => a + b, 0) / this.responseTimes.length)
      : 0;

    this.app.showResults({
      icon: '🎯',
      title: 'Time Elapsed!',
      subtitle: `Completed 30 seconds drill on ${this.keySetName.toUpperCase()} set.`,
      stats: [
        { label: 'Game Mode', value: 'Mode B: KeyMagnet' },
        { label: 'Selected Key Set', value: this.keySetName.toUpperCase() },
        { label: 'Difficulty', value: this.difficulty.toUpperCase() },
        { label: 'Final Score', value: this.score },
        { label: 'Correct Hits', value: this.correctCount },
        { label: 'Incorrect Hits', value: this.wrongCount },
        { label: 'Accuracy', value: `${accuracy}%` },
        { label: 'Avg Response Time', value: `${avgMs} ms` }
      ]
    });
  }

  cleanup() {
    this.isRunning = false;
    if (this.clockIntervalId) {
      clearInterval(this.clockIntervalId);
      this.clockIntervalId = null;
    }
    document.querySelectorAll('.key').forEach(k => {
      k.classList.remove('target-active', 'key-hit-success', 'key-hit-error');
    });
    if (this.feedbackTextEl) this.feedbackTextEl.innerHTML = '&nbsp;';
  }
}

// Global App Instance
const app = new GameApplication();
