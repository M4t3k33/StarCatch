
// Inicjalizacja po załadowaniu DOM
document.addEventListener('DOMContentLoaded', () => {
    const intro = document.getElementById('intro');
    const mainContent = document.getElementById('mainContent');

    setTimeout(() => {
        intro.style.display = 'none';
        mainContent.style.display = 'flex';
        initGame();
    }, 7000);
});

// Zmienne canvas i elementy DOM
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreElement = document.getElementById('score');
const livesElement = document.getElementById('lives');
const levelElement = document.getElementById('level');
const menu = document.getElementById('menu');
const startButton = document.getElementById('startGame');
const difficultyButton = document.getElementById('difficulty');
const highScoreElement = document.getElementById('highScore');
const collectSound = document.getElementById('collectSound');
const failSound = document.getElementById('failSound');

// Stan gry
let gameState = {
    score: 0,
    lives: 3,
    level: 1,
    isPlaying: false,
    difficulty: 'normal',
    highScore: localStorage.getItem('highScore') || 0
};

// Ustawienia gracza
let playerX = canvas.width / 2;
const playerY = canvas.height - 30;
const playerWidth = 50;
const playerHeight = 20;

// Klasa gwiazdy
class Star {
    constructor() {
        this.reset();
    }

    reset() {
        this.x = Math.random() * (canvas.width - 20);
        this.y = 0;
        this.speed = 2 + gameState.level * 0.5;
        if (gameState.difficulty === 'hard') this.speed *= 1.5;
    }

    update() {
        this.y += this.speed;
        if (this.y > canvas.height) {
            this.reset();
            if (gameState.isPlaying) {
                gameState.lives--;
                failSound.play();
                livesElement.textContent = `Życia: ${gameState.lives}`;
                if (gameState.lives <= 0) endGame();
            }
        }
    }

    draw() {
        ctx.fillStyle = 'gold';
        ctx.beginPath();
        ctx.moveTo(this.x + 10, this.y);
        ctx.lineTo(this.x + 20, this.y + 20);
        ctx.lineTo(this.x, this.y + 20);
        ctx.closePath();
        ctx.fill();
    }
}

// Klasa przeszkody
class Obstacle {
    constructor() {
        this.reset();
    }

    reset() {
        this.x = Math.random() * (canvas.width - 30);
        this.y = -50;
        this.width = 30;
        this.height = 30;
        this.speed = 3 + gameState.level * 0.3;
    }

    update() {
        this.y += this.speed;
        if (this.y > canvas.height) {
            this.reset();
        }
    }

    draw() {
        ctx.fillStyle = 'red';
        ctx.fillRect(this.x, this.y, this.width, this.height);
    }
}

// Inicjalizacja obiektów gry
const star = new Star();
const obstacles = [new Obstacle(), new Obstacle()];

// Funkcje gry
function drawPlayer() {
    ctx.fillStyle = 'blue';
    ctx.fillRect(playerX, playerY, playerWidth, playerHeight);
}

function checkCollisions() {
    // Kolizja z gwiazdą
    if (star.y + 20 > playerY && 
        star.x + 20 > playerX && 
        star.x < playerX + playerWidth) {
        gameState.score++;
        collectSound.play();
        scoreElement.textContent = `Punkty: ${gameState.score}`;
        if (gameState.score > gameState.highScore) {
            gameState.highScore = gameState.score;
            localStorage.setItem('highScore', gameState.highScore);
            highScoreElement.textContent = gameState.highScore;
        }
        if (gameState.score % 10 === 0) {
            gameState.level++;
            levelElement.textContent = `Poziom: ${gameState.level}`;
        }
        star.reset();
    }

    // Kolizja z przeszkodami
    obstacles.forEach(obstacle => {
        if (playerX < obstacle.x + obstacle.width &&
            playerX + playerWidth > obstacle.x &&
            playerY < obstacle.y + obstacle.height &&
            playerY + playerHeight > obstacle.y) {
            gameState.lives--;
            failSound.play();
            livesElement.textContent = `Życia: ${gameState.lives}`;
            obstacle.reset();
            if (gameState.lives <= 0) endGame();
        }
    });
}

function updateGame() {
    if (!gameState.isPlaying) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    star.update();
    star.draw();
    
    obstacles.forEach(obstacle => {
        obstacle.update();
        obstacle.draw();
    });
    
    drawPlayer();
    checkCollisions();
    
    requestAnimationFrame(updateGame);
}

function startGame() {
    gameState.score = 0;
    gameState.lives = 3;
    gameState.level = 1;
    gameState.isPlaying = true;
    
    scoreElement.textContent = `Punkty: ${gameState.score}`;
    livesElement.textContent = `Życia: ${gameState.lives}`;
    levelElement.textContent = `Poziom: ${gameState.level}`;
    
    menu.style.display = 'none';
    updateGame();
}

function endGame() {
    gameState.isPlaying = false;
    menu.style.display = 'block';
    startButton.textContent = 'Zagraj ponownie';
}

function initGame() {
    highScoreElement.textContent = gameState.highScore;
    menu.style.display = 'block';
}

// Event Listenery
canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    playerX = e.clientX - rect.left - playerWidth/2;
    
    if (playerX < 0) playerX = 0;
    if (playerX + playerWidth > canvas.width) playerX = canvas.width - playerWidth;
});

startButton.addEventListener('click', startGame);

difficultyButton.addEventListener('click', () => {
    if (gameState.difficulty === 'normal') {
        gameState.difficulty = 'hard';
        difficultyButton.textContent = 'Poziom: Trudny';
    } else {
        gameState.difficulty = 'normal';
        difficultyButton.textContent = 'Poziom: Normalny';
    }
});
