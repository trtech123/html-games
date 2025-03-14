const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const startButton = document.getElementById('startButton');
const scoreElement = document.getElementById('score');
const highScoreElement = document.getElementById('highScore');
const difficultyElement = document.getElementById('difficulty');
const leaderboardList = document.getElementById('leaderboardList');
const themeButtons = document.querySelectorAll('.theme-btn');

// Game constants
const GRAVITY = 0.5;
const FLAP_FORCE = -8;
const PIPE_SPEED = 2;
const PIPE_SPACING = 150;
const PIPE_WIDTH = 60;
const BIRD_SIZE = 30;

// Game state
let bird = {
    x: 50,
    y: canvas.height / 2,
    velocity: 0,
    rotation: 0
};

let pipes = [];
let score = 0;
let highScore = localStorage.getItem('flappyHighScore') || 0;
let gameLoop = null;
let isGameRunning = false;
let currentTheme = 'classic';
let difficulty = 'normal';
let lastDifficultyAdjustment = 0;

// Theme colors
const themes = {
    classic: {
        background: '#87CEEB',
        bird: '#FFD700',
        pipe: '#2ecc71',
        ground: '#8B4513'
    },
    night: {
        background: '#1a1a1a',
        bird: '#FFD700',
        pipe: '#34495e',
        ground: '#2c3e50'
    },
    space: {
        background: '#0a0a2a',
        bird: '#FFD700',
        pipe: '#4a4a8a',
        ground: '#2a2a4a'
    }
};

// Leaderboard
let leaderboard = JSON.parse(localStorage.getItem('flappyLeaderboard')) || [];

// Initialize game
function initGame() {
    bird.y = canvas.height / 2;
    bird.velocity = 0;
    bird.rotation = 0;
    pipes = [];
    score = 0;
    scoreElement.textContent = score;
    difficulty = 'normal';
    difficultyElement.textContent = difficulty;
    lastDifficultyAdjustment = 0;
    spawnPipe();
}

function spawnPipe() {
    const gapY = Math.random() * (canvas.height - PIPE_SPACING - 100) + 50;
    pipes.push({
        x: canvas.width,
        gapY: gapY,
        passed: false
    });
}

function drawBird() {
    ctx.save();
    ctx.translate(bird.x, bird.y);
    ctx.rotate(bird.rotation);
    
    // Draw bird body
    ctx.fillStyle = themes[currentTheme].bird;
    ctx.beginPath();
    ctx.arc(0, 0, BIRD_SIZE / 2, 0, Math.PI * 2);
    ctx.fill();
    
    // Draw eye
    ctx.fillStyle = 'black';
    ctx.beginPath();
    ctx.arc(5, -5, 3, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.restore();
}

function drawPipes() {
    ctx.fillStyle = themes[currentTheme].pipe;
    pipes.forEach(pipe => {
        // Draw top pipe
        ctx.fillRect(pipe.x, 0, PIPE_WIDTH, pipe.gapY);
        // Draw bottom pipe
        ctx.fillRect(pipe.x, pipe.gapY + PIPE_SPACING, PIPE_WIDTH, canvas.height);
    });
}

function drawGround() {
    ctx.fillStyle = themes[currentTheme].ground;
    ctx.fillRect(0, canvas.height - 20, canvas.width, 20);
}

function drawGame() {
    // Clear canvas
    ctx.fillStyle = themes[currentTheme].background;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    drawPipes();
    drawGround();
    drawBird();
}

function updateBird() {
    bird.velocity += GRAVITY;
    bird.y += bird.velocity;
    bird.rotation = bird.velocity * 0.1;

    // Check for collisions with ground and ceiling
    if (bird.y + BIRD_SIZE / 2 > canvas.height - 20 || bird.y - BIRD_SIZE / 2 < 0) {
        gameOver();
    }

    // Check for collisions with pipes
    pipes.forEach(pipe => {
        if (bird.x + BIRD_SIZE / 2 > pipe.x && 
            bird.x - BIRD_SIZE / 2 < pipe.x + PIPE_WIDTH) {
            if (bird.y - BIRD_SIZE / 2 < pipe.gapY || 
                bird.y + BIRD_SIZE / 2 > pipe.gapY + PIPE_SPACING) {
                gameOver();
            }
        }
    });
}

function updatePipes() {
    pipes.forEach(pipe => {
        pipe.x -= PIPE_SPEED;

        // Score point when passing pipe
        if (!pipe.passed && pipe.x + PIPE_WIDTH < bird.x) {
            pipe.passed = true;
            score++;
            scoreElement.textContent = score;
            updateDifficulty();
        }
    });

    // Remove off-screen pipes
    pipes = pipes.filter(pipe => pipe.x + PIPE_WIDTH > 0);

    // Spawn new pipes
    if (pipes.length === 0 || pipes[pipes.length - 1].x < canvas.width - 200) {
        spawnPipe();
    }
}

function updateDifficulty() {
    const scoreThresholds = {
        normal: 5,
        hard: 10,
        expert: 15
    };

    if (score > lastDifficultyAdjustment + 5) {
        if (score >= scoreThresholds.expert) {
            difficulty = 'expert';
        } else if (score >= scoreThresholds.hard) {
            difficulty = 'hard';
        } else if (score >= scoreThresholds.normal) {
            difficulty = 'normal';
        }
        difficultyElement.textContent = difficulty;
        lastDifficultyAdjustment = score;
    }
}

function gameStep() {
    updateBird();
    updatePipes();
    drawGame();
}

function gameOver() {
    clearInterval(gameLoop);
    isGameRunning = false;
    startButton.disabled = false;

    // Update high score
    if (score > highScore) {
        highScore = score;
        highScoreElement.textContent = highScore;
        localStorage.setItem('flappyHighScore', highScore);
    }

    // Update leaderboard
    const playerName = prompt('Enter your name for the leaderboard:');
    if (playerName) {
        leaderboard.push({ name: playerName, score: score });
        leaderboard.sort((a, b) => b.score - a.score);
        leaderboard = leaderboard.slice(0, 5); // Keep top 5
        localStorage.setItem('flappyLeaderboard', JSON.stringify(leaderboard));
        updateLeaderboard();
    }

    alert(`Game Over! Score: ${score}`);
}

function startGame() {
    initGame();
    isGameRunning = true;
    startButton.disabled = true;
    if (gameLoop) clearInterval(gameLoop);
    gameLoop = setInterval(gameStep, 1000 / 60);
}

function updateLeaderboard() {
    leaderboardList.innerHTML = leaderboard
        .map((entry, index) => `${index + 1}. ${entry.name}: ${entry.score}`)
        .join('<br>');
}

// Event Listeners
startButton.addEventListener('click', startGame);

canvas.addEventListener('click', () => {
    if (isGameRunning) {
        bird.velocity = FLAP_FORCE;
    }
});

document.addEventListener('keydown', (event) => {
    if (event.code === 'Space' && isGameRunning) {
        bird.velocity = FLAP_FORCE;
    }
});

themeButtons.forEach(button => {
    button.addEventListener('click', () => {
        // Remove active class from all buttons
        themeButtons.forEach(btn => btn.classList.remove('active'));
        // Add active class to clicked button
        button.classList.add('active');
        // Update theme
        currentTheme = button.id.replace('theme', '').toLowerCase();
        document.body.className = `theme-${currentTheme}`;
    });
});

// Initialize leaderboard
updateLeaderboard(); 