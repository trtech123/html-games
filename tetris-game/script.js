const canvas = document.getElementById('gameCanvas');
const nextCanvas = document.getElementById('nextCanvas');
const ctx = canvas.getContext('2d');
const nextCtx = nextCanvas.getContext('2d');
const startButton = document.getElementById('startButton');
const pauseButton = document.getElementById('pauseButton');
const scoreElement = document.getElementById('score');
const highScoreElement = document.getElementById('highScore');
const levelElement = document.getElementById('level');
const linesElement = document.getElementById('lines');
const leaderboardList = document.getElementById('leaderboardList');
const themeButtons = document.querySelectorAll('.theme-btn');

// Game constants
const BLOCK_SIZE = 30;
const COLS = 10;
const ROWS = 20;
const COLORS = {
    I: '#00f0f0',
    O: '#f0f000',
    T: '#a000f0',
    S: '#00f000',
    Z: '#f00000',
    J: '#0000f0',
    L: '#f0a000'
};

// Tetromino shapes
const SHAPES = {
    I: [[1, 1, 1, 1]],
    O: [[1, 1], [1, 1]],
    T: [[0, 1, 0], [1, 1, 1]],
    S: [[0, 1, 1], [1, 1, 0]],
    Z: [[1, 1, 0], [0, 1, 1]],
    J: [[1, 0, 0], [1, 1, 1]],
    L: [[0, 0, 1], [1, 1, 1]]
};

// Game state
let board = Array(ROWS).fill().map(() => Array(COLS).fill(0));
let currentPiece = null;
let nextPiece = null;
let score = 0;
let highScore = localStorage.getItem('tetrisHighScore') || 0;
let level = 1;
let lines = 0;
let gameLoop = null;
let isGameRunning = false;
let isPaused = false;
let currentTheme = 'classic';

// Theme colors
const themes = {
    classic: {
        background: '#ffffff',
        grid: '#e0e0e0',
        border: '#2c3e50'
    },
    neon: {
        background: '#1a1a3a',
        grid: '#2a2a4a',
        border: '#00ffff'
    },
    retro: {
        background: '#34495e',
        grid: '#2c3e50',
        border: '#f39c12'
    }
};

// Leaderboard
let leaderboard = JSON.parse(localStorage.getItem('tetrisLeaderboard')) || [];

class Piece {
    constructor(shape, color) {
        this.shape = shape;
        this.color = color;
        this.x = Math.floor(COLS / 2) - Math.floor(shape[0].length / 2);
        this.y = 0;
    }

    rotate() {
        const newShape = this.shape[0].map((_, i) =>
            this.shape.map(row => row[i]).reverse()
        );
        const oldShape = this.shape;
        this.shape = newShape;
        if (this.collides()) {
            this.shape = oldShape;
        }
    }

    collides() {
        for (let y = 0; y < this.shape.length; y++) {
            for (let x = 0; x < this.shape[y].length; x++) {
                if (this.shape[y][x]) {
                    const boardX = this.x + x;
                    const boardY = this.y + y;
                    if (boardX < 0 || boardX >= COLS || boardY >= ROWS ||
                        (boardY >= 0 && board[boardY][boardX])) {
                        return true;
                    }
                }
            }
        }
        return false;
    }
}

function createPiece() {
    const pieces = Object.keys(SHAPES);
    const randomPiece = pieces[Math.floor(Math.random() * pieces.length)];
    return new Piece(SHAPES[randomPiece], COLORS[randomPiece]);
}

function drawBoard() {
    // Clear canvas
    ctx.fillStyle = themes[currentTheme].background;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw grid
    ctx.strokeStyle = themes[currentTheme].grid;
    for (let y = 0; y < ROWS; y++) {
        for (let x = 0; x < COLS; x++) {
            ctx.strokeRect(x * BLOCK_SIZE, y * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
        }
    }

    // Draw placed blocks
    for (let y = 0; y < ROWS; y++) {
        for (let x = 0; x < COLS; x++) {
            if (board[y][x]) {
                ctx.fillStyle = board[y][x];
                ctx.fillRect(x * BLOCK_SIZE, y * BLOCK_SIZE, BLOCK_SIZE - 1, BLOCK_SIZE - 1);
            }
        }
    }

    // Draw current piece
    if (currentPiece) {
        ctx.fillStyle = currentPiece.color;
        for (let y = 0; y < currentPiece.shape.length; y++) {
            for (let x = 0; x < currentPiece.shape[y].length; x++) {
                if (currentPiece.shape[y][x]) {
                    ctx.fillRect(
                        (currentPiece.x + x) * BLOCK_SIZE,
                        (currentPiece.y + y) * BLOCK_SIZE,
                        BLOCK_SIZE - 1,
                        BLOCK_SIZE - 1
                    );
                }
            }
        }
    }
}

function drawNextPiece() {
    nextCtx.fillStyle = themes[currentTheme].background;
    nextCtx.fillRect(0, 0, nextCanvas.width, nextCanvas.height);

    if (nextPiece) {
        const offsetX = (nextCanvas.width - nextPiece.shape[0].length * BLOCK_SIZE) / 2;
        const offsetY = (nextCanvas.height - nextPiece.shape.length * BLOCK_SIZE) / 2;

        nextCtx.fillStyle = nextPiece.color;
        for (let y = 0; y < nextPiece.shape.length; y++) {
            for (let x = 0; x < nextPiece.shape[y].length; x++) {
                if (nextPiece.shape[y][x]) {
                    nextCtx.fillRect(
                        offsetX + x * BLOCK_SIZE,
                        offsetY + y * BLOCK_SIZE,
                        BLOCK_SIZE - 1,
                        BLOCK_SIZE - 1
                    );
                }
            }
        }
    }
}

function mergePiece() {
    for (let y = 0; y < currentPiece.shape.length; y++) {
        for (let x = 0; x < currentPiece.shape[y].length; x++) {
            if (currentPiece.shape[y][x]) {
                board[currentPiece.y + y][currentPiece.x + x] = currentPiece.color;
            }
        }
    }
    checkLines();
    currentPiece = nextPiece;
    nextPiece = createPiece();
    drawNextPiece();
    if (currentPiece.collides()) {
        gameOver();
    }
}

function checkLines() {
    let linesCleared = 0;
    for (let y = ROWS - 1; y >= 0; y--) {
        if (board[y].every(cell => cell !== 0)) {
            board.splice(y, 1);
            board.unshift(Array(COLS).fill(0));
            linesCleared++;
            y++;
        }
    }
    if (linesCleared > 0) {
        lines += linesCleared;
        linesElement.textContent = lines;
        score += [0, 100, 300, 500, 800][linesCleared] * level;
        scoreElement.textContent = score;
        level = Math.floor(lines / 10) + 1;
        levelElement.textContent = level;
    }
}

function gameStep() {
    if (!isPaused) {
        currentPiece.y++;
        if (currentPiece.collides()) {
            currentPiece.y--;
            mergePiece();
        }
        drawBoard();
    }
}

function gameOver() {
    clearInterval(gameLoop);
    isGameRunning = false;
    startButton.disabled = false;
    pauseButton.disabled = true;

    // Update high score
    if (score > highScore) {
        highScore = score;
        highScoreElement.textContent = highScore;
        localStorage.setItem('tetrisHighScore', highScore);
    }

    // Update leaderboard
    const playerName = prompt('Enter your name for the leaderboard:');
    if (playerName) {
        leaderboard.push({ name: playerName, score: score });
        leaderboard.sort((a, b) => b.score - a.score);
        leaderboard = leaderboard.slice(0, 5); // Keep top 5
        localStorage.setItem('tetrisLeaderboard', JSON.stringify(leaderboard));
        updateLeaderboard();
    }

    alert(`Game Over! Score: ${score}`);
}

function startGame() {
    board = Array(ROWS).fill().map(() => Array(COLS).fill(0));
    score = 0;
    lines = 0;
    level = 1;
    scoreElement.textContent = score;
    linesElement.textContent = lines;
    levelElement.textContent = level;
    currentPiece = createPiece();
    nextPiece = createPiece();
    isGameRunning = true;
    isPaused = false;
    startButton.disabled = true;
    pauseButton.disabled = false;
    if (gameLoop) clearInterval(gameLoop);
    gameLoop = setInterval(gameStep, 1000 / (level * 2));
    drawNextPiece();
    drawBoard();
}

function updateLeaderboard() {
    leaderboardList.innerHTML = leaderboard
        .map((entry, index) => `${index + 1}. ${entry.name}: ${entry.score}`)
        .join('<br>');
}

// Event Listeners
startButton.addEventListener('click', startGame);

pauseButton.addEventListener('click', () => {
    if (isGameRunning) {
        isPaused = !isPaused;
        pauseButton.textContent = isPaused ? 'Resume' : 'Pause';
    }
});

document.addEventListener('keydown', (event) => {
    if (!isGameRunning || isPaused) return;

    switch (event.code) {
        case 'ArrowLeft':
            currentPiece.x--;
            if (currentPiece.collides()) currentPiece.x++;
            break;
        case 'ArrowRight':
            currentPiece.x++;
            if (currentPiece.collides()) currentPiece.x--;
            break;
        case 'ArrowDown':
            currentPiece.y++;
            if (currentPiece.collides()) currentPiece.y--;
            break;
        case 'ArrowUp':
            currentPiece.rotate();
            break;
        case 'Space':
            while (!currentPiece.collides()) {
                currentPiece.y++;
            }
            currentPiece.y--;
            mergePiece();
            break;
    }
    drawBoard();
});

themeButtons.forEach(button => {
    button.addEventListener('click', () => {
        themeButtons.forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');
        currentTheme = button.id.replace('theme', '').toLowerCase();
        document.body.className = `theme-${currentTheme}`;
        drawBoard();
        drawNextPiece();
    });
});

// Initialize leaderboard
updateLeaderboard(); 