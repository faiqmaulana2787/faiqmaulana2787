// Simple canvas Pacman: grid-based, dots, walls, one ghost (random), and win/loss.
const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const scoreEl = document.getElementById("score");
const restartBtn = document.getElementById("restart");

const TILE = 16;
const COLS = canvas.width / TILE; // 30
const ROWS = canvas.height / TILE; // 30
let score = 0;

// Very small map (30x30) using string map for simplicity
// 0 = dot, 1 = wall, 2 = empty (no dot)
const rawMap = [
  "111111111111111111111111111111",
  "100000000000000000000000000001",
  "101111011111011111011111011101",
  "100000010000010000010000010001",
  "101110111011011101110111011101",
  "100010000010000010000010000001",
  "111011111011111011111011111101",
  "100000000000000000000000000001",
  "101111011111011111011111011101",
  "100000010000010000010000010001",
  "101110111011011101110111011101",
  "100010000010000010000010000001",
  "111011111011111011111011111101",
  "100000000000000000000000000001",
  "111111111111111111111111111111",
  // repeated vertically for 30 rows — fill remaining rows with similar pattern to keep map rectangular
];

while (rawMap.length < ROWS) {
  rawMap.push(rawMap[rawMap.length % 15]);
}

let map = [];
function initMap() {
  map = [];
  for (let r = 0; r < ROWS; r++) {
    let row = [];
    const line = rawMap[r];
    for (let c = 0; c < COLS; c++) {
      const ch = line[c % line.length] || "1";
      if (ch === "1") row.push({ type: "wall" });
      else row.push({ type: "dot" });
    }
    map.push(row);
  }
}

// Entities
let pacman = { x: 1, y: 1, dir: { x: 0, y: 0 }, speed: 1 };
let ghost = { x: COLS - 2, y: ROWS - 2, dir: { x: 0, y: 0 } };
let keys = {};

function reset() {
  initMap();
  score = 0;
  pacman = { x: 1, y: 1, dir: { x: 0, y: 0 }, speed: 1 };
  ghost = { x: COLS - 2, y: ROWS - 2, dir: { x: 0, y: 0 } };
  updateScore();
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  // draw map
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const cell = map[r][c];
      const px = c * TILE,
        py = r * TILE;
      if (cell.type === "wall") {
        ctx.fillStyle = "#0b3b73";
        ctx.fillRect(px, py, TILE, TILE);
      } else if (cell.type === "dot") {
        ctx.fillStyle = "#ffe27a";
        ctx.beginPath();
        ctx.arc(px + TILE / 2, py + TILE / 2, TILE / 8, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  // draw pacman
  const cx = pacman.x * TILE + TILE / 2;
  const cy = pacman.y * TILE + TILE / 2;
  ctx.fillStyle = "#ffd166";
  ctx.beginPath();
  const mouth = 0.25;
  const angle = Math.atan2(pacman.dir.y, pacman.dir.x);
  // default mouth direction if stationary
  let start = -mouth * Math.PI,
    end = mouth * Math.PI;
  if (pacman.dir.x !== 0 || pacman.dir.y !== 0) {
    start = angle - mouth * Math.PI;
    end = angle + mouth * Math.PI;
  } else {
    start = -mouth * Math.PI;
    end = mouth * Math.PI;
  }
  ctx.moveTo(cx, cy);
  ctx.arc(cx, cy, TILE / 2, start, end);
  ctx.closePath();
  ctx.fill();

  // draw ghost
  const gx = ghost.x * TILE + TILE / 2;
  const gy = ghost.y * TILE + TILE / 2;
  ctx.fillStyle = "#ff6b6b";
  ctx.beginPath();
  ctx.arc(gx, gy, TILE / 2.2, Math.PI, 0);
  ctx.rect(gx - TILE / 2.2, gy, (TILE / 2.2) * 2, TILE / 2.2);
  ctx.fill();

  // eyes
  ctx.fillStyle = "#fff";
  ctx.beginPath();
  ctx.arc(gx - 5, gy - 2, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(gx + 5, gy - 2, 3, 0, Math.PI * 2);
  ctx.fill();
}

function update() {
  // pacman movement (grid-based)
  const nx = pacman.x + pacman.dir.x;
  const ny = pacman.y + pacman.dir.y;
  if (canMoveTo(nx, ny)) {
    pacman.x = nx;
    pacman.y = ny;
  }

  // eat dot
  if (
    map[pacman.y] &&
    map[pacman.y][pacman.x] &&
    map[pacman.y][pacman.x].type === "dot"
  ) {
    map[pacman.y][pacman.x].type = "empty";
    score += 10;
    updateScore();
  }

  // ghost random movement
  if (Math.random() < 0.25) {
    const dirs = [
      { x: 1, y: 0 },
      { x: -1, y: 0 },
      { x: 0, y: 1 },
      { x: 0, y: -1 },
    ];
    let tryDir = dirs[Math.floor(Math.random() * dirs.length)];
    if (canMoveTo(ghost.x + tryDir.x, ghost.y + tryDir.y)) {
      ghost.dir = tryDir;
    }
  }
  const gnx = ghost.x + ghost.dir.x;
  const gny = ghost.y + ghost.dir.y;
  if (canMoveTo(gnx, gny)) {
    ghost.x = gnx;
    ghost.y = gny;
  } else {
    ghost.dir = { x: 0, y: 0 };
  }

  // collision
  if (pacman.x === ghost.x && pacman.y === ghost.y) {
    gameOver();
  }

  // win condition: no dots left
  if (!map.flat().some((cell) => cell.type === "dot")) {
    winGame();
  }
}

function canMoveTo(x, y) {
  if (x < 0 || y < 0 || x >= COLS || y >= ROWS) return false;
  const cell = map[y][x];
  return cell && cell.type !== "wall";
}

function updateScore() {
  scoreEl.textContent = `Score: ${score}`;
}

let running = false;
function gameLoop() {
  if (!running) return;
  update();
  draw();
  setTimeout(gameLoop, 120); // control speed
}

function start() {
  running = true;
  gameLoop();
}

function gameOver() {
  running = false;
  alert(`Game Over! Your score: ${score}`);
}

function winGame() {
  running = false;
  alert(`You win! Score: ${score}`);
}

document.addEventListener("keydown", (e) => {
  if (e.key === "ArrowUp" || e.key === "w") pacman.dir = { x: 0, y: -1 };
  if (e.key === "ArrowDown" || e.key === "s") pacman.dir = { x: 0, y: 1 };
  if (e.key === "ArrowLeft" || e.key === "a") pacman.dir = { x: -1, y: 0 };
  if (e.key === "ArrowRight" || e.key === "d") pacman.dir = { x: 1, y: 0 };
  // start on first key press
  if (!running) start();
});

restartBtn.addEventListener("click", () => {
  reset();
  draw();
  start();
});

// init
reset();
draw();
