const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreElement = document.getElementById('score');
const highScoreElement = document.getElementById('high-score');
const startBtn = document.getElementById('start-btn');
const overlay = document.getElementById('overlay');
const overlayTitle = document.getElementById('overlay-title');
// Auth Elements
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const userProfile = document.getElementById('user-profile');
const loginBtn = document.getElementById('login-btn');
const regBtn = document.getElementById('reg-btn');
const logoutBtn = document.getElementById('logout-btn');
const showRegLink = document.getElementById('show-register');
const showLoginLink = document.getElementById('show-login');
const loginUserInp = document.getElementById('login-username');
const loginPassInp = document.getElementById('login-password');
const regUserInp = document.getElementById('reg-username');
const regPassInp = document.getElementById('reg-password');
const currentUserDisplay = document.getElementById('current-user-display');
const authMessage = document.getElementById('auth-message');
const difficultyBtns = document.querySelectorAll('.diff-btn');
const leaderboardList = document.getElementById('leaderboard-list');
const npcToggleBtn = document.getElementById('npc-toggle');

// Game Constants
const GRID_SIZE = 20;
const TILE_COUNT_X = canvas.width / GRID_SIZE;
const TILE_COUNT_Y = canvas.height / GRID_SIZE;

// Game State
let gameSpeed = 65;
let score = 0;
let highScore = 0; // Loaded from user profile
let users = JSON.parse(localStorage.getItem('snakeUsers')) || {}; // { username: { pass: "...", highScores: { 100: 0, 65: 0, 40: 0 } } }
let currentUser = localStorage.getItem('snakeCurrentUser') || null; // Restore session
let playerName = 'GUEST';
let snake = [];
let foods = []; // Array for multiple food items
let dx = 0;
let dy = 0;
// NPC State
let isNpcEnabled = false;
let npcSnake = [];
let npcDx = 0;
let npcDy = 0;
let npcAlive = false;
let weapons = []; // Array for weapon items
let npcRespawnTimer = null; // Timer ID
let gameStartTime = 0;

let gameLoop;
let isGameRunning = false;

// Initialize High Score Display
highScoreElement.textContent = '000';

// Auth Functions
function showMessage(msg) {
    authMessage.textContent = msg;
    setTimeout(() => authMessage.textContent = '', 3000);
}

function updateAuthUI() {
    if (currentUser) {
        loginForm.classList.add('hidden');
        registerForm.classList.add('hidden');
        userProfile.classList.remove('hidden');
        currentUserDisplay.textContent = currentUser.toUpperCase();
        playerName = currentUser;
        // Load High Score for current difficulty
        const user = users[currentUser];
        highScore = user.highScores ? (user.highScores[gameSpeed] || 0) : 0;
    } else {
        loginForm.classList.remove('hidden');
        registerForm.classList.add('hidden');
        userProfile.classList.add('hidden');
        playerName = 'GUEST';
        highScore = 0;
    }
    highScoreElement.textContent = highScore.toString().padStart(3, '0');
}

function saveUserbox() {
    localStorage.setItem('snakeUsers', JSON.stringify(users));
}

function register() {
    const user = regUserInp.value.trim().toLowerCase();
    const pass = regPassInp.value.trim();
    if (!user || !pass) return showMessage('Please fill all fields');
    if (users[user]) return showMessage('User already exists');

    users[user] = { pass: pass, highScores: {} };
    saveUserbox();
    showMessage('Registered! Please Login.');
    toggleAuthMode();
}

function login() {
    const user = loginUserInp.value.trim().toLowerCase();
    const pass = loginPassInp.value.trim();
    if (!users[user] || users[user].pass !== pass) return showMessage('Invalid credentials');

    currentUser = user;
    localStorage.setItem('snakeCurrentUser', currentUser);
    updateAuthUI();
    showMessage('');
}

function logout() {
    currentUser = null;
    localStorage.removeItem('snakeCurrentUser');
    updateAuthUI();
}

function toggleAuthMode() {
    loginForm.classList.toggle('hidden');
    registerForm.classList.toggle('hidden');
    authMessage.textContent = '';
}

function initGame() {
    // PlayerName is already set by updateAuthUI
    snake = [
        { x: 10, y: 10 },
        { x: 9, y: 10 },
        { x: 8, y: 10 }
    ];
    score = 0;
    dx = 1;
    dy = 0;
    scoreElement.textContent = '000';
    foods = [];
    weapons = []; // Clear weapons
    if (npcRespawnTimer) clearTimeout(npcRespawnTimer);
    gameStartTime = Date.now();
    while (foods.length < 5) {
        createFood();
    }
    overlay.classList.add('hidden');
    isGameRunning = true;

    // Initialize High Score Display
    highScoreElement.textContent = highScore.toString().padStart(3, '0');

    // NPC Init
    npcAlive = isNpcEnabled;
    if (isNpcEnabled) {
        npcSnake = [
            { x: TILE_COUNT_X - 10, y: TILE_COUNT_Y - 10 },
            { x: TILE_COUNT_X - 9, y: TILE_COUNT_Y - 10 },
            { x: TILE_COUNT_X - 8, y: TILE_COUNT_Y - 10 }
        ];
        npcDx = -1;
        npcDy = 0;
    } else {
        npcSnake = [];
    }

    if (gameLoop) clearInterval(gameLoop);
    gameLoop = setInterval(update, gameSpeed);
}

function createFood() {
    let newFood;
    let isColliding;

    do {
        isColliding = false;
        newFood = {
            x: Math.floor(Math.random() * TILE_COUNT_X),
            y: Math.floor(Math.random() * TILE_COUNT_Y)
        };

        // Check collision with snake
        for (let segment of snake) {
            if (segment.x === newFood.x && segment.y === newFood.y) {
                isColliding = true;
                break;
            }
        }

        // Check collision with existing food
        if (!isColliding) {
            for (let f of foods) {
                if (f.x === newFood.x && f.y === newFood.y) {
                    isColliding = true;
                    break;
                }
            }
        }

    } while (isColliding);

    foods.push(newFood);

    // Chance to spawn weapon if NPC is active
    // Condition: 15s elapsed, 10% chance, Max 1 weapon
    if (isNpcEnabled && (Date.now() - gameStartTime > 15000) && Math.random() < 0.1 && weapons.length < 1) {
        createWeapon();
    }
}

function createWeapon() {
    let newWeapon;
    let isColliding;
    do {
        isColliding = false;
        newWeapon = {
            x: Math.floor(Math.random() * TILE_COUNT_X),
            y: Math.floor(Math.random() * TILE_COUNT_Y)
        };

        // Check Food
        for (let f of foods) {
            if (f.x === newWeapon.x && f.y === newWeapon.y) isColliding = true;
        }

        // Check Player Snake
        for (let s of snake) {
            if (s.x === newWeapon.x && s.y === newWeapon.y) isColliding = true;
        }

        // Check NPC Snake
        if (isNpcEnabled && npcAlive) {
            for (let s of npcSnake) {
                if (s.x === newWeapon.x && s.y === newWeapon.y) isColliding = true;
            }
        }

        // Check Existing Weapons
        for (let w of weapons) {
            if (w.x === newWeapon.x && w.y === newWeapon.y) isColliding = true;
        }

    } while (isColliding);
    weapons.push(newWeapon);
}

function drawRect(x, y, color, blur = 0) {
    ctx.fillStyle = color;
    if (blur > 0) {
        ctx.shadowBlur = blur;
        ctx.shadowColor = color;
    } else {
        ctx.shadowBlur = 0;
    }
    ctx.fillRect(x * GRID_SIZE, y * GRID_SIZE, GRID_SIZE - 2, GRID_SIZE - 2);
    ctx.shadowBlur = 0; // Reset
}

function drawGame() {
    // Clear Canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw Foods
    foods.forEach(f => {
        drawRect(f.x, f.y, '#ff0055', 10);
    });

    // Draw Weapons
    weapons.forEach(w => {
        drawRect(w.x, w.y, '#00ffff', 15); // Cyan Blue
    });

    // Draw Snake
    snake.forEach((segment, index) => {
        // Head is brighter/different color
        const color = index === 0 ? '#ffffff' : '#00ff88';
        const blur = index === 0 ? 15 : 5;
        drawRect(segment.x, segment.y, color, blur);
    });

    // Draw NPC
    if (npcAlive) {
        npcSnake.forEach((segment, index) => {
            const color = index === 0 ? '#ffaa00' : '#ff5500'; // Orange
            const blur = index === 0 ? 15 : 5;
            drawRect(segment.x, segment.y, color, blur);
        });
    }
}

function moveSnake() {
    const head = { x: snake[0].x + dx, y: snake[0].y + dy };

    // Collision with Walls
    if (head.x < 0 || head.x >= TILE_COUNT_X || head.y < 0 || head.y >= TILE_COUNT_Y) {
        gameOver();
        return;
    }

    // Collision with Self
    for (let i = 0; i < snake.length; i++) {
        if (head.x === snake[i].x && head.y === snake[i].y) {
            gameOver();
            return;
        }
    }

    // Check collisions with NPC
    if (isNpcEnabled && npcAlive) {
        for (let s of npcSnake) {
            if (head.x === s.x && head.y === s.y) {
                gameOver();
                return;
            }
        }
    }

    snake.unshift(head);

    // Check if ate any food
    let ateFoodIndex = -1;
    for (let i = 0; i < foods.length; i++) {
        if (head.x === foods[i].x && head.y === foods[i].y) {
            ateFoodIndex = i;
            break;
        }
    }

    // Check if ate any weapon
    let ateWeaponIndex = -1;
    for (let i = 0; i < weapons.length; i++) {
        if (head.x === weapons[i].x && head.y === weapons[i].y) {
            ateWeaponIndex = i;
            break;
        }
    }

    if (ateWeaponIndex !== -1) {
        // Weapon Logic: Banish NPC for 15s
        weapons.splice(ateWeaponIndex, 1);
        if (isNpcEnabled) {
            npcAlive = false;
            npcSnake = []; // Remove from map
            if (npcRespawnTimer) clearTimeout(npcRespawnTimer);

            // Set Timer to respawn
            npcRespawnTimer = setTimeout(() => {
                if (isGameRunning && isNpcEnabled) {
                    initNPC();
                }
            }, 5000); // 5 Seconds
        }
    }

    if (ateFoodIndex !== -1) {
        score += 10;
        scoreElement.textContent = score.toString().padStart(3, '0');
        foods.splice(ateFoodIndex, 1); // Remove eaten food
        createFood(); // Add new food to replace it
    } else {
        snake.pop();
    }
}

function updateNPC() {
    if (!npcAlive) return;

    // AI Logic: Greedy BFS-ish (but just greedy closest food for now)
    // Find closest food
    let target = null;
    let minDist = Infinity;

    foods.forEach(f => {
        let d = Math.abs(f.x - npcSnake[0].x) + Math.abs(f.y - npcSnake[0].y);
        if (d < minDist) {
            minDist = d;
            target = f;
        }
    });

    if (!target) return; // No food?

    const head = npcSnake[0];
    const possibleMoves = [
        { dx: 0, dy: -1 }, // Up
        { dx: 0, dy: 1 },  // Down
        { dx: -1, dy: 0 }, // Left
        { dx: 1, dy: 0 }   // Right
    ];

    // Simple validity check (walls, self, player)
    // Heuristic: move closer to target, but if blocked, try others

    // Sort moves by distance to target
    possibleMoves.sort((a, b) => {
        const distA = Math.abs((head.x + a.dx) - target.x) + Math.abs((head.y + a.dy) - target.y);
        const distB = Math.abs((head.x + b.dx) - target.x) + Math.abs((head.y + b.dy) - target.y);
        return distA - distB;
    });

    let bestMove = null;

    for (let move of possibleMoves) {
        // Prevent 180 turn
        if (move.dx === -npcDx && move.dy === -npcDy) continue;

        const nx = head.x + move.dx;
        const ny = head.y + move.dy;

        // Check Wall
        if (nx < 0 || nx >= TILE_COUNT_X || ny < 0 || ny >= TILE_COUNT_Y) continue;

        // Check Self Collision
        let hitSelf = false;
        for (let s of npcSnake) {
            if (s.x === nx && s.y === ny) { hitSelf = true; break; }
        }
        if (hitSelf) continue;

        // Removed Player Collision Check to make NPC lethal (it won't avoid you)

        // Safe move found
        bestMove = move;
        break;
    }

    if (bestMove) {
        npcDx = bestMove.dx;
        npcDy = bestMove.dy;
    }

    const newHead = { x: head.x + npcDx, y: head.y + npcDy };

    // Check Player Collision (Lethal)
    for (let s of snake) {
        if (newHead.x === s.x && newHead.y === s.y) {
            gameOver();
            return;
        }
    }

    npcSnake.unshift(newHead);

    // Food Check
    let ateIndex = -1;
    for (let i = 0; i < foods.length; i++) {
        if (newHead.x === foods[i].x && newHead.y === foods[i].y) {
            ateIndex = i;
            break;
        }
    }

    // Weapon Check (NPC destroys weapon)
    for (let i = 0; i < weapons.length; i++) {
        if (newHead.x === weapons[i].x && newHead.y === weapons[i].y) {
            weapons.splice(i, 1);
            // Penalty: Player loses score
            score = Math.max(0, score - 20);
            scoreElement.textContent = score.toString().padStart(3, '0');
            break;
        }
    }

    if (ateIndex !== -1) {
        foods.splice(ateIndex, 1);
        createFood();
        // NPC doesn't get points, just gets longer
    } else {
        npcSnake.pop();
    }
}

function initNPC() {
    npcAlive = true;
    npcSnake = [
        { x: TILE_COUNT_X - 10, y: TILE_COUNT_Y - 10 },
        { x: TILE_COUNT_X - 9, y: TILE_COUNT_Y - 10 },
        { x: TILE_COUNT_X - 8, y: TILE_COUNT_Y - 10 }
    ];
    npcDx = -1;
    npcDy = 0;
}

function update() {
    if (!isGameRunning) return;
    moveSnake();
    if (isNpcEnabled) updateNPC();
    if (isGameRunning) drawGame();
}

function updateLeaderboard() {
    const key = `snakeLeaderboard_${gameSpeed}`;
    let currentLeaderboard = JSON.parse(localStorage.getItem(key)) || [];

    currentLeaderboard.push({ name: playerName, score: score });
    currentLeaderboard.sort((a, b) => b.score - a.score);
    currentLeaderboard = currentLeaderboard.slice(0, 5); // Keep top 5

    localStorage.setItem(key, JSON.stringify(currentLeaderboard));
}

function renderLeaderboard() {
    const key = `snakeLeaderboard_${gameSpeed}`;
    let currentLeaderboard = JSON.parse(localStorage.getItem(key)) || [];

    leaderboardList.innerHTML = '';

    if (currentLeaderboard.length === 0) {
        leaderboardList.innerHTML = '<li><span>---</span><span>NO SCORES</span></li>';
        return;
    }

    currentLeaderboard.forEach(entry => {
        const li = document.createElement('li');
        li.innerHTML = `<span>${entry.score.toString().padStart(3, '0')}</span><span>${entry.name}</span>`;
        leaderboardList.appendChild(li);
    });
}

function gameOver() {
    isGameRunning = false;
    clearInterval(gameLoop);

    // Save Personal High Score if Logged in
    if (currentUser && score > highScore) {
        highScore = score;
        if (!users[currentUser].highScores) users[currentUser].highScores = {};
        users[currentUser].highScores[gameSpeed] = highScore;
        saveUserbox();
        highScoreElement.textContent = highScore.toString().padStart(3, '0');
    } else if (!currentUser && score > highScore) {
        // Guest high score (temporary or legacy logic)
        highScore = score;
        highScoreElement.textContent = highScore.toString().padStart(3, '0');
    }

    updateLeaderboard();
    renderLeaderboard();

    overlayTitle.textContent = 'GAME OVER';
    overlay.classList.remove('hidden');
}

// Input Handling
document.addEventListener('keydown', (e) => {
    // Prevent default scrolling for arrow keys and interactions
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' ', 'Home', 'End', 'PageUp', 'PageDown'].includes(e.key)) {
        e.preventDefault();
    }

    // Allow restarting with Space or Enter if game is not running
    if (!isGameRunning && (e.key === 'Enter' || e.key === ' ')) {
        initGame();
        return;
    }

    if (!isGameRunning) return;

    const goingUp = dy === -1;
    const goingDown = dy === 1;
    const goingRight = dx === 1;
    const goingLeft = dx === -1;

    switch (e.key) {
        case 'ArrowLeft':
        case 'a':
        case 'A':
            if (!goingRight) { dx = -1; dy = 0; }
            break;
        case 'ArrowRight':
        case 'd':
        case 'D':
            if (!goingLeft) { dx = 1; dy = 0; }
            break;
        case 'ArrowUp':
        case 'w':
        case 'W':
            if (!goingDown) { dx = 0; dy = -1; }
            break;
        case 'ArrowDown':
        case 's':
        case 'S':
            if (!goingUp) { dx = 0; dy = 1; }
            break;
    }
});

// Auth Listeners
loginBtn.addEventListener('click', login);
regBtn.addEventListener('click', register);
logoutBtn.addEventListener('click', logout);
showRegLink.addEventListener('click', toggleAuthMode);
showLoginLink.addEventListener('click', toggleAuthMode);

// Difficulty Selection
difficultyBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        // Remove active class from all
        difficultyBtns.forEach(b => b.classList.remove('active'));
        // Add active to clicked
        btn.classList.add('active');
        // Set Speed
        gameSpeed = parseInt(btn.getAttribute('data-speed'));
        // Update High Score for this difficulty if logged in
        if (currentUser) {
            const user = users[currentUser];
            highScore = user.highScores ? (user.highScores[gameSpeed] || 0) : 0;
            highScoreElement.textContent = highScore.toString().padStart(3, '0');
        }
        // Refresh Leaderboard for new difficulty
        renderLeaderboard();
    });
});

npcToggleBtn.addEventListener('click', () => {
    isNpcEnabled = !isNpcEnabled;
    npcToggleBtn.textContent = isNpcEnabled ? 'NPC: ON' : 'NPC: OFF';
    npcToggleBtn.classList.toggle('active', isNpcEnabled);
    if (isNpcEnabled) {
        npcToggleBtn.style.color = '#ffaa00';
        npcToggleBtn.style.borderColor = '#ffaa00';
    } else {
        npcToggleBtn.style.color = '#888';
        npcToggleBtn.style.borderColor = '#444';
    }
});

startBtn.addEventListener('click', initGame);

// Initial Draw & Render
updateAuthUI();
createFood();
drawGame();
renderLeaderboard();


