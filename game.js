const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const scoreEl = document.getElementById("score");
const livesEl = document.getElementById("lives");
const levelEl = document.getElementById("level");
const overlay = document.getElementById("game-overlay");
const startButton = document.getElementById("startBtn");
const overlayTitle = document.getElementById("overlayTitle");
const overlayDescription = document.getElementById("overlayDescription");

const input = {
    left: false,
    right: false,
    up: false,
    down: false,
};

const game = {
    running: false,
    score: 0,
    lives: 3,
    level: 1,
    stars: [],
    enemies: [],
    pickups: [],
    lastEnemySpawn: 0,
    lastPickupSpawn: 0,
    player: {
        x: 0,
        y: 0,
        w: 34,
        h: 42,
        speed: 5.5,
        invulnerable: 0,
    },
};

function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

function createStars() {
    const total = 120;
    game.stars = Array.from({ length: total }, () => ({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        radius: Math.random() * 2.2 + 0.8,
        speed: Math.random() * 1.4 + 0.7,
    }));
}

function updateHud() {
    scoreEl.textContent = String(game.score);
    livesEl.textContent = String(game.lives);
    levelEl.textContent = String(game.level);
}

function resetPlayer() {
    game.player.x = canvas.width / 2 - game.player.w / 2;
    game.player.y = canvas.height - 80;
    game.player.invulnerable = 0;
}

function startGame() {
    game.score = 0;
    game.lives = 3;
    game.level = 1;
    game.enemies = [];
    game.pickups = [];
    game.lastEnemySpawn = performance.now();
    game.lastPickupSpawn = performance.now();
    game.running = true;
    overlayTitle.textContent = "Star Drift";
    overlayDescription.textContent = "Collect energy cells, dodge debris, and stay alive as the asteroid field intensifies.";
    startButton.textContent = "Launch";
    overlay.classList.add("hidden");
    resetPlayer();
    updateHud();
}

function endGame() {
    game.running = false;
    overlay.classList.remove("hidden");
    overlayTitle.textContent = "Mission Failed";
    overlayDescription.textContent = `Final score: ${game.score}. Push Launch to try again.`;
    startButton.textContent = "Retry";
}

function resizeCanvas() {
    const rect = canvas.getBoundingClientRect();
    canvas.width = Math.max(460, rect.width);
    canvas.height = Math.max(360, rect.height);

    if (!game.running) {
        resetPlayer();
    }

    if (game.stars.length === 0) {
        createStars();
    }
}

function spawnEnemy() {
    const size = 22 + Math.random() * 18;
    const enemy = {
        x: Math.random() * (canvas.width - size),
        y: -size,
        w: size,
        h: size,
        speed: 1.8 + game.level * 0.65 + Math.random() * 1.2,
        drift: (Math.random() - 0.5) * 1.4,
    };
    game.enemies.push(enemy);
}

function spawnPickup() {
    const radius = 10;
    const pickup = {
        x: Math.random() * (canvas.width - radius * 2),
        y: -radius,
        r: radius,
        speed: 2.5 + Math.random() * 1.4,
        kind: Math.random() < 0.75 ? "energy" : "bonus",
    };
    game.pickups.push(pickup);
}

function rectCircleCollision(rect, circle) {
    const closestX = clamp(circle.x, rect.x, rect.x + rect.w);
    const closestY = clamp(circle.y, rect.y, rect.y + rect.h);
    const dx = circle.x - closestX;
    const dy = circle.y - closestY;
    return dx * dx + dy * dy <= circle.r * circle.r;
}

function rectsOverlap(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function update(dt) {
    const delta = dt / 16.67;

    game.stars.forEach((star) => {
        star.y += star.speed * delta;
        if (star.y > canvas.height + 3) {
            star.y = -3;
            star.x = Math.random() * canvas.width;
        }
    });

    if (input.left) {
        game.player.x -= game.player.speed * delta;
    }
    if (input.right) {
        game.player.x += game.player.speed * delta;
    }
    if (input.up) {
        game.player.y -= game.player.speed * delta;
    }
    if (input.down) {
        game.player.y += game.player.speed * delta;
    }

    game.player.x = clamp(game.player.x, 8, canvas.width - game.player.w - 8);
    game.player.y = clamp(game.player.y, 40, canvas.height - game.player.h - 8);

    if (game.player.invulnerable > 0) {
        game.player.invulnerable -= dt;
    }

    const spawnDelay = Math.max(400, 1100 - (game.level - 1) * 90);
    if (performance.now() - game.lastEnemySpawn > spawnDelay) {
        spawnEnemy();
        game.lastEnemySpawn = performance.now();
    }

    const pickupDelay = 2500 + Math.random() * 1500;
    if (performance.now() - game.lastPickupSpawn > pickupDelay) {
        spawnPickup();
        game.lastPickupSpawn = performance.now();
    }

    game.enemies.forEach((enemy) => {
        enemy.x += enemy.drift * delta;
        enemy.y += enemy.speed * delta;

        if (enemy.x < 0 || enemy.x + enemy.w > canvas.width) {
            enemy.drift *= -1;
        }
    });

    game.pickups.forEach((pickup) => {
        pickup.y += pickup.speed * delta;
    });

    for (let i = game.enemies.length - 1; i >= 0; i--) {
        const enemy = game.enemies[i];

        if (rectsOverlap(
            { x: game.player.x, y: game.player.y, w: game.player.w, h: game.player.h },
            { x: enemy.x, y: enemy.y, w: enemy.w, h: enemy.h }
        )) {
            game.enemies.splice(i, 1);
            if (game.player.invulnerable <= 0) {
                game.lives -= 1;
                game.player.invulnerable = 1200;
                updateHud();
            }
            if (game.lives <= 0) {
                endGame();
                return;
            }
        }

        if (enemy.y > canvas.height + enemy.h) {
            game.enemies.splice(i, 1);
        }
    }

    for (let i = game.pickups.length - 1; i >= 0; i--) {
        const pickup = game.pickups[i];
        const playerRect = { x: game.player.x, y: game.player.y, w: game.player.w, h: game.player.h };

        if (rectCircleCollision(playerRect, { x: pickup.x + pickup.r, y: pickup.y + pickup.r, r: pickup.r })) {
            game.pickups.splice(i, 1);
            if (pickup.kind === "bonus") {
                game.score += 30;
            } else {
                game.score += 15;
                if (game.lives < 5) {
                    game.lives += 1;
                }
            }
            game.level = 1 + Math.floor(game.score / 120);
            updateHud();
        } else if (pickup.y > canvas.height + pickup.r) {
            game.pickups.splice(i, 1);
        }
    }
}

function drawBackground() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, "rgba(14, 23, 42, 0.85)");
    gradient.addColorStop(1, "rgba(2, 8, 18, 0.95)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    game.stars.forEach((star) => {
        ctx.fillStyle = "rgba(255,255,255,0.9)";
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
        ctx.fill();
    });
}

function drawPlayer() {
    const { x, y, w, h } = game.player;
    const blink = game.player.invulnerable > 0 && Math.floor(game.player.invulnerable / 80) % 2 === 0;

    if (blink) {
        return;
    }

    ctx.save();
    ctx.translate(x + w / 2, y + h / 2);
    ctx.fillStyle = "#7ef9ff";
    ctx.beginPath();
    ctx.moveTo(0, -h / 2);
    ctx.lineTo(w / 2, h / 2);
    ctx.lineTo(0, h / 3);
    ctx.lineTo(-w / 2, h / 2);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "#b2ebff";
    ctx.fillRect(-4, h / 3 - 7, 8, 12);
    ctx.restore();
}

function drawEnemy(enemy) {
    ctx.fillStyle = "#ff8a8a";
    ctx.beginPath();
    ctx.moveTo(enemy.x + enemy.w / 2, enemy.y);
    ctx.lineTo(enemy.x + enemy.w, enemy.y + enemy.h / 2);
    ctx.lineTo(enemy.x + enemy.w / 2, enemy.y + enemy.h);
    ctx.lineTo(enemy.x, enemy.y + enemy.h / 2);
    ctx.closePath();
    ctx.fill();
}

function drawPickup(pickup) {
    ctx.fillStyle = pickup.kind === "bonus" ? "#ffd166" : "#7af98f";
    ctx.beginPath();
    ctx.arc(pickup.x + pickup.r, pickup.y + pickup.r, pickup.r, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "rgba(0, 0, 0, 0.2)";
    ctx.fillRect(pickup.x + pickup.r - 2, pickup.y + pickup.r - 5, 4, 10);
    ctx.fillRect(pickup.x + pickup.r - 5, pickup.y + pickup.r - 2, 10, 4);
}

function draw() {
    drawBackground();

    game.enemies.forEach(drawEnemy);
    game.pickups.forEach(drawPickup);
    drawPlayer();

    if (!game.running) {
        const fade = overlay.classList.contains("hidden") ? 0 : 1;
        if (fade === 0) {
            return;
        }
    }
}

let lastTime = 0;

function gameLoop(timestamp) {
    const dt = timestamp - lastTime || 16;
    lastTime = timestamp;

    if (game.running) {
        update(dt);
    }

    draw();
    requestAnimationFrame(gameLoop);
}

function handleKey(event, pressed) {
    const key = event.key.toLowerCase();
    if (key === "arrowleft" || key === "a") input.left = pressed;
    if (key === "arrowright" || key === "d") input.right = pressed;
    if (key === "arrowup" || key === "w") input.up = pressed;
    if (key === "arrowdown" || key === "s") input.down = pressed;
    if (pressed && (key === " " || key === "enter")) {
        if (!game.running) {
            startGame();
        }
    }
}

document.addEventListener("keydown", (event) => handleKey(event, true));
document.addEventListener("keyup", (event) => handleKey(event, false));
startButton.addEventListener("click", startGame);

resizeCanvas();
createStars();
resetPlayer();
updateHud();
requestAnimationFrame(gameLoop);