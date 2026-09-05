// --- Sound Effects System (Web Audio API) ---
class SoundEffects {
    constructor() {
        this.ctx = null;
        this.muted = false;
        this.wakaToggle = false;
        this.lastWakaTime = 0;
    }

    init() {
        if (this.ctx) return;
        try {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        } catch (e) {
            console.warn("Web Audio API not supported in this browser", e);
        }
    }

    playWaka() {
        if (this.muted || !this.ctx) return;
        const now = this.ctx.currentTime;
        if (now - this.lastWakaTime < 0.12) return; // Throttle waka sounds
        this.lastWakaTime = now;

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.type = 'triangle';
        const startFreq = this.wakaToggle ? 380 : 220;
        const endFreq = this.wakaToggle ? 220 : 380;
        this.wakaToggle = !this.wakaToggle;

        osc.frequency.setValueAtTime(startFreq, now);
        osc.frequency.exponentialRampToValueAtTime(endFreq, now + 0.08);

        gain.gain.setValueAtTime(0.08, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.08);

        osc.start(now);
        osc.stop(now + 0.08);
    }

    playPowerPellet() {
        if (this.muted || !this.ctx) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.type = 'sine';
        osc.frequency.setValueAtTime(110, now);
        osc.frequency.linearRampToValueAtTime(220, now + 0.15);
        osc.frequency.linearRampToValueAtTime(110, now + 0.3);

        gain.gain.setValueAtTime(0.06, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.3);

        osc.start(now);
        osc.stop(now + 0.3);
    }

    playEatGhost() {
        if (this.muted || !this.ctx) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(200, now);
        osc.frequency.exponentialRampToValueAtTime(1000, now + 0.3);

        gain.gain.setValueAtTime(0.15, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.3);

        osc.start(now);
        osc.stop(now + 0.3);
    }

    playDeath() {
        if (this.muted || !this.ctx) return;
        const now = this.ctx.currentTime;
        
        for (let i = 0; i < 5; i++) {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.connect(gain);
            gain.connect(this.ctx.destination);

            osc.type = 'sawtooth';
            const startTime = now + i * 0.12;
            osc.frequency.setValueAtTime(500 - i * 80, startTime);
            osc.frequency.linearRampToValueAtTime(80, startTime + 0.12);

            gain.gain.setValueAtTime(0.1, startTime);
            gain.gain.linearRampToValueAtTime(0.01, startTime + 0.12);

            osc.start(startTime);
            osc.stop(startTime + 0.12);
        }
    }

    playStart() {
        if (this.muted || !this.ctx) return;
        const now = this.ctx.currentTime;
        
        const melody = [
            { note: 493.88, dur: 0.1 }, // B4
            { note: 987.77, dur: 0.1 }, // B5
            { note: 739.99, dur: 0.1 }, // F#5
            { note: 622.25, dur: 0.1 }, // D#5
            { note: 987.77, dur: 0.08 }, // B5
            { note: 739.99, dur: 0.12 }, // F#5
            { note: 622.25, dur: 0.2 }, // D#5
            
            { note: 523.25, dur: 0.1 }, // C5
            { note: 1046.50, dur: 0.1 }, // C6
            { note: 783.99, dur: 0.1 }, // G5
            { note: 659.25, dur: 0.1 }, // E5
            { note: 1046.50, dur: 0.08 }, // C6
            { note: 783.99, dur: 0.12 }, // G5
            { note: 659.25, dur: 0.2 }, // E5
            
            { note: 493.88, dur: 0.1 }, // B4
            { note: 987.77, dur: 0.1 }, // B5
            { note: 739.99, dur: 0.1 }, // F#5
            { note: 622.25, dur: 0.1 }, // D#5
            { note: 987.77, dur: 0.08 }, // B5
            { note: 739.99, dur: 0.12 }, // F#5
            { note: 622.25, dur: 0.2 }, // D#5
            
            { note: 659.25, dur: 0.06 }, // E5
            { note: 698.46, dur: 0.06 }, // F5
            { note: 739.99, dur: 0.06 }, // F#5
            { note: 783.99, dur: 0.06 }, // G5
            { note: 830.61, dur: 0.06 }, // G#5
            { note: 880.00, dur: 0.06 }, // A5
            { note: 987.77, dur: 0.2 }   // B5
        ];

        let time = now;
        melody.forEach(item => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.connect(gain);
            gain.connect(this.ctx.destination);

            osc.type = 'square';
            osc.frequency.setValueAtTime(item.note, time);
            gain.gain.setValueAtTime(0.05, time);
            gain.gain.linearRampToValueAtTime(0.005, time + item.dur - 0.02);

            osc.start(time);
            osc.stop(time + item.dur);
            time += item.dur;
        });
    }
}

const sounds = new SoundEffects();

// --- Game Setup & Constants ---
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const TILE_SIZE = 28;
const MAP_WIDTH = 19;
const MAP_HEIGHT = 21;

// 1: Wall, 2: Dot, 3: Power Pellet, 4: Ghost Gate, 0: Empty
const ORIGINAL_MAP = [
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
    [1,3,2,2,2,2,2,2,2,1,2,2,2,2,2,2,2,3,1],
    [1,2,1,1,2,1,1,1,2,1,2,1,1,1,2,1,1,2,1],
    [1,2,1,1,2,1,1,1,2,1,2,1,1,1,2,1,1,2,1],
    [1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1],
    [1,2,1,1,2,1,2,1,1,1,1,1,2,1,2,1,1,2,1],
    [1,2,2,2,2,1,2,2,2,1,2,2,2,1,2,2,2,2,1],
    [1,1,1,1,2,1,1,1,0,1,0,1,1,1,2,1,1,1,1],
    [0,0,0,1,2,1,0,0,0,0,0,0,0,1,2,1,0,0,0],
    [1,1,1,1,2,1,0,1,1,4,1,1,0,1,2,1,1,1,1],
    [0,0,0,0,2,0,0,1,0,0,0,1,0,0,2,0,0,0,0], // Tunnel row
    [1,1,1,1,2,1,0,1,1,1,1,1,0,1,2,1,1,1,1],
    [0,0,0,1,2,1,0,0,0,0,0,0,0,1,2,1,0,0,0],
    [1,1,1,1,2,1,0,1,1,1,1,1,0,1,2,1,1,1,1],
    [1,2,2,2,2,2,2,2,2,1,2,2,2,2,2,2,2,2,1],
    [1,2,1,1,2,1,1,1,2,1,2,1,1,1,2,1,1,2,1],
    [1,3,2,1,2,2,2,2,2,0,2,2,2,2,2,1,2,3,1],
    [1,1,2,1,2,1,2,1,1,1,1,1,2,1,2,1,2,1,1],
    [1,2,2,2,2,1,2,2,2,1,2,2,2,1,2,2,2,2,1],
    [1,2,1,1,1,1,1,1,2,1,2,1,1,1,1,1,1,2,1],
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
];

let map = [];
let score = 0;
let highScore = localStorage.getItem('pacman_highScore') || 0;
let lives = 3;
let level = 1;
let gameState = 'START'; // START, PLAYING, PAUSED, DYING, GAMEOVER, VICTORY
let totalDots = 0;
let dotsEaten = 0;

// Timers
let globalTimer = 0;
let frightenedTimer = 0;
let ghostEatenMultiplier = 1;
let stateTimer = 0; // Used for delays (e.g., death animation, ready screen)

// Update High Score Display
document.getElementById('high-score').innerText = String(highScore).padStart(6, '0');

// --- Helper Functions ---
function isWallForPacman(gridX, gridY) {
    if (gridX < 0 || gridX >= MAP_WIDTH) return false; // Tunnel wrap-around
    if (gridY < 0 || gridY >= MAP_HEIGHT) return true;
    const tile = map[gridY][gridX];
    return tile === 1 || tile === 4; // Wall or Ghost Gate
}

function isWallForGhost(gridX, gridY) {
    if (gridX < 0 || gridX >= MAP_WIDTH) return false; // Tunnel wrap-around
    if (gridY < 0 || gridY >= MAP_HEIGHT) return true;
    const tile = map[gridY][gridX];
    return tile === 1; // Only solid walls are walls for ghosts (they can pass gate 4)
}

// --- Pac-Man Class ---
class Pacman {
    constructor() {
        this.reset();
    }

    reset() {
        this.gridX = 9;
        this.gridY = 16;
        this.x = this.gridX * TILE_SIZE + TILE_SIZE / 2;
        this.y = this.gridY * TILE_SIZE + TILE_SIZE / 2;
        this.dirX = -1; // Start moving left
        this.dirY = 0;
        this.nextDirX = -1;
        this.nextDirY = 0;
        this.speed = 2;
        this.angle = 0.2;
        this.mouthSpeed = 0.02;
        this.mouthOpening = 1;
    }

    update() {
        // Check if aligned with grid
        const alignedX = (this.x - TILE_SIZE / 2) % TILE_SIZE === 0;
        const alignedY = (this.y - TILE_SIZE / 2) % TILE_SIZE === 0;

        if (alignedX && alignedY) {
            this.gridX = Math.round((this.x - TILE_SIZE / 2) / TILE_SIZE);
            this.gridY = Math.round((this.y - TILE_SIZE / 2) / TILE_SIZE);

            // Eat dots
            const currentTile = map[this.gridY][this.gridX];
            if (currentTile === 2) {
                map[this.gridY][this.gridX] = 0;
                score += 10;
                dotsEaten++;
                sounds.playWaka();
                updateScore();
                checkWinCondition();
            } else if (currentTile === 3) {
                map[this.gridY][this.gridX] = 0;
                score += 50;
                dotsEaten++;
                sounds.playPowerPellet();
                triggerFrightenedMode();
                updateScore();
                checkWinCondition();
            }

            // Apply buffered direction if valid
            if (this.nextDirX !== 0 || this.nextDirY !== 0) {
                if (!isWallForPacman(this.gridX + this.nextDirX, this.gridY + this.nextDirY)) {
                    this.dirX = this.nextDirX;
                    this.dirY = this.nextDirY;
                }
            }

            // Stop if hitting a wall
            if (isWallForPacman(this.gridX + this.dirX, this.gridY + this.dirY)) {
                this.dirX = 0;
                this.dirY = 0;
            }
        }

        // Move
        this.x += this.dirX * this.speed;
        this.y += this.dirY * this.speed;

        // Tunnel Wrap-around
        const halfTile = TILE_SIZE / 2;
        if (this.x < -halfTile) {
            this.x = MAP_WIDTH * TILE_SIZE - halfTile;
        } else if (this.x > MAP_WIDTH * TILE_SIZE - halfTile) {
            this.x = -halfTile;
        }

        // Mouth Animation
        if (this.dirX !== 0 || this.dirY !== 0) {
            this.angle += this.mouthSpeed * this.mouthOpening;
            if (this.angle > 0.4 || this.angle < 0.05) {
                this.mouthOpening *= -1;
            }
        } else {
            this.angle = 0.2; // Keep mouth slightly open when stopped
        }
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);

        // Rotate based on direction
        let rotation = 0;
        if (this.dirX === 1) rotation = 0;
        else if (this.dirX === -1) rotation = Math.PI;
        else if (this.dirY === 1) rotation = Math.PI / 2;
        else if (this.dirY === -1) rotation = -Math.PI / 2;
        else {
            // If stopped, keep last rotation
            if (this.nextDirX === 1) rotation = 0;
            else if (this.nextDirX === -1) rotation = Math.PI;
            else if (this.nextDirY === 1) rotation = Math.PI / 2;
            else if (this.nextDirY === -1) rotation = -Math.PI / 2;
        }
        ctx.rotate(rotation);

        // Draw Pac-Man body
        ctx.beginPath();
        ctx.arc(0, 0, TILE_SIZE / 2 - 2, this.angle, 2 * Math.PI - this.angle);
        ctx.lineTo(0, 0);
        ctx.fillStyle = '#ffff00';
        ctx.fill();
        ctx.closePath();

        ctx.restore();
    }
}

// --- Ghost Class ---
class Ghost {
    constructor(name, color, scatterX, scatterY, startGridX, startGridY, exitDelay) {
        this.name = name;
        this.color = color;
        this.scatterX = scatterX;
        this.scatterY = scatterY;
        this.startGridX = startGridX;
        this.startGridY = startGridY;
        this.exitDelay = exitDelay; // Delay in frames before leaving house
        this.reset();
    }

    reset() {
        this.gridX = this.startGridX;
        this.gridY = this.startGridY;
        this.x = this.gridX * TILE_SIZE + TILE_SIZE / 2;
        this.y = this.gridY * TILE_SIZE + TILE_SIZE / 2;
        this.dirX = 0;
        this.dirY = -1;
        this.mode = 'house'; // house, chase, scatter, frightened, eaten
        this.speed = 2;
        this.targetX = 9;
        this.targetY = 8; // Outside the house
        this.timer = 0;
        this.flashToggle = false;
    }

    update(pacman) {
        this.timer++;

        // Handle Ghost House Exit Delay
        if (this.mode === 'house') {
            if (this.timer > this.exitDelay) {
                // Move towards the exit gate
                this.targetX = 9;
                this.targetY = 8;
                if (this.gridX === 9 && this.gridY === 8) {
                    this.mode = 'chase';
                }
            } else {
                // Just bounce up and down inside the house
                const alignedY = (this.y - TILE_SIZE / 2) % TILE_SIZE === 0;
                if (alignedY) {
                    if (this.gridY === 10) this.dirY = -1;
                    else if (this.gridY === 9) this.dirY = 1;
                }
                this.y += this.dirY * 1;
                this.gridX = Math.round((this.x - TILE_SIZE / 2) / TILE_SIZE);
                this.gridY = Math.round((this.y - TILE_SIZE / 2) / TILE_SIZE);
                return;
            }
        }

        // Set Speed based on Mode
        if (this.mode === 'frightened') {
            this.speed = 1; // Slower when frightened
        } else if (this.mode === 'eaten') {
            this.speed = 4; // Super fast when returning to house
        } else {
            this.speed = 2; // Normal speed
        }

        // Check if aligned with grid
        const alignedX = (this.x - TILE_SIZE / 2) % TILE_SIZE === 0;
        const alignedY = (this.y - TILE_SIZE / 2) % TILE_SIZE === 0;

        if (alignedX && alignedY) {
            this.gridX = Math.round((this.x - TILE_SIZE / 2) / TILE_SIZE);
            this.gridY = Math.round((this.y - TILE_SIZE / 2) / TILE_SIZE);

            // If eaten and returned to house, respawn
            if (this.mode === 'eaten' && this.gridX === 9 && this.gridY === 10) {
                this.mode = 'chase';
                this.timer = 0;
            }

            // Determine Target Tile based on Mode & Personality
            if (this.mode === 'eaten') {
                this.targetX = 9;
                this.targetY = 10;
            } else if (this.mode === 'scatter') {
                this.targetX = this.scatterX;
                this.targetY = this.scatterY;
            } else if (this.mode === 'chase') {
                // Distinct AI Personalities
                if (this.name === 'Blinky') {
                    // Aggressive: directly targets Pac-Man
                    this.targetX = pacman.gridX;
                    this.targetY = pacman.gridY;
                } else if (this.name === 'Pinky') {
                    // Ambusher: 4 tiles ahead of Pac-Man
                    this.targetX = pacman.gridX + pacman.dirX * 4;
                    this.targetY = pacman.gridY + pacman.dirY * 4;
                } else if (this.name === 'Inky') {
                    // Flanker: dynamic targeting based on Pac-Man and Blinky
                    const blinky = ghosts.find(g => g.name === 'Blinky');
                    const bX = blinky ? blinky.gridX : 9;
                    const bY = blinky ? blinky.gridY : 8;
                    const pX = pacman.gridX + pacman.dirX * 2;
                    const pY = pacman.gridY + pacman.dirY * 2;
                    this.targetX = pX + (pX - bX);
                    this.targetY = pY + (pY - bY);
                } else if (this.name === 'Clyde') {
                    // Coward: targets Pac-Man if far, targets bottom-left if close
                    const dist = Math.hypot(this.gridX - pacman.gridX, this.gridY - pacman.gridY);
                    if (dist > 8) {
                        this.targetX = pacman.gridX;
                        this.targetY = pacman.gridY;
                    } else {
                        this.targetX = this.scatterX;
                        this.targetY = this.scatterY;
                    }
                }
            }

            // Pathfinding: Choose next direction at intersection
            const directions = [
                { x: 0, y: -1 }, // Up
                { x: -1, y: 0 }, // Left
                { x: 0, y: 1 },  // Down
                { x: 1, y: 0 }   // Right
            ];

            let validMoves = [];

            for (let dir of directions) {
                // Cannot reverse direction
                if (dir.x === -this.dirX && dir.y === -this.dirY) continue;

                const nextX = this.gridX + dir.x;
                const nextY = this.gridY + dir.y;

                if (!isWallForGhost(nextX, nextY)) {
                    // Prevent entering ghost house unless eaten
                    if (map[nextY][nextX] === 4 && this.mode !== 'eaten') continue;
                    
                    validMoves.push(dir);
                }
            }

            if (validMoves.length > 0) {
                if (this.mode === 'frightened') {
                    // Random movement when frightened
                    const randomDir = validMoves[Math.floor(Math.random() * validMoves.length)];
                    this.dirX = randomDir.x;
                    this.dirY = randomDir.y;
                } else {
                    // Choose direction that minimizes distance to target
                    let bestDir = validMoves[0];
                    let minDistance = Infinity;

                    for (let dir of validMoves) {
                        const nextX = this.gridX + dir.x;
                        const nextY = this.gridY + dir.y;
                        const dist = Math.hypot(nextX - this.targetX, nextY - this.targetY);

                        if (dist < minDistance) {
                            minDistance = dist;
                            bestDir = dir;
                        }
                    }
                    this.dirX = bestDir.x;
                    this.dirY = bestDir.y;
                }
            } else {
                // If no valid moves (should not happen in standard maze), reverse
                this.dirX *= -1;
                this.dirY *= -1;
            }
        }

        // Move
        this.x += this.dirX * this.speed;
        this.y += this.dirY * this.speed;

        // Tunnel Wrap-around
        const halfTile = TILE_SIZE / 2;
        if (this.x < -halfTile) {
            this.x = MAP_WIDTH * TILE_SIZE - halfTile;
        } else if (this.x > MAP_WIDTH * TILE_SIZE - halfTile) {
            this.x = -halfTile;
        }
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);

        const radius = TILE_SIZE / 2 - 2;

        if (this.mode === 'eaten') {
            // Draw only eyes
            this.drawEyes(ctx);
        } else if (this.mode === 'frightened') {
            // Draw frightened ghost (blue or flashing white/blue)
            let ghostColor = '#0000ff'; // Dark Blue
            let eyeColor = '#ffb8ae'; // Orange/Pinkish

            if (frightenedTimer < 120) { // Flash in last 2 seconds
                if (Math.floor(frightenedTimer / 10) % 2 === 0) {
                    ghostColor = '#ffffff';
                    eyeColor = '#ff0000';
                }
            }

            // Body
            ctx.beginPath();
            ctx.arc(0, -2, radius, Math.PI, 0, false);
            ctx.lineTo(radius, radius);
            // Wavy bottom
            const waveCount = 3;
            const waveWidth = (radius * 2) / waveCount;
            for (let i = 0; i < waveCount; i++) {
                ctx.quadraticCurveTo(
                    radius - (i + 0.5) * waveWidth,
                    radius + (this.timer % 10 < 5 ? 4 : 0),
                    radius - (i + 1) * waveWidth,
                    radius
                );
            }
            ctx.lineTo(-radius, -2);
            ctx.fillStyle = ghostColor;
            ctx.fill();
            ctx.closePath();

            // Frightened Eyes (small dots)
            ctx.fillStyle = eyeColor;
            ctx.beginPath();
            ctx.arc(-4, -2, 2, 0, 2 * Math.PI);
            ctx.arc(4, -2, 2, 0, 2 * Math.PI);
            ctx.fill();

            // Frightened Mouth (squiggly line)
            ctx.strokeStyle = eyeColor;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(-6, 4);
            ctx.lineTo(-4, 2);
            ctx.lineTo(-2, 4);
            ctx.lineTo(0, 2);
            ctx.lineTo(2, 4);
            ctx.lineTo(4, 2);
            ctx.lineTo(6, 4);
            ctx.stroke();
        } else {
            // Draw Normal Ghost
            // Body
            ctx.beginPath();
            ctx.arc(0, -2, radius, Math.PI, 0, false);
            ctx.lineTo(radius, radius);
            // Wavy bottom
            const waveCount = 3;
            const waveWidth = (radius * 2) / waveCount;
            for (let i = 0; i < waveCount; i++) {
                ctx.quadraticCurveTo(
                    radius - (i + 0.5) * waveWidth,
                    radius + (this.timer % 10 < 5 ? 4 : 0),
                    radius - (i + 1) * waveWidth,
                    radius
                );
            }
            ctx.lineTo(-radius, -2);
            ctx.fillStyle = this.color;
            ctx.fill();
            ctx.closePath();

            // Eyes
            this.drawEyes(ctx);
        }

        ctx.restore();
    }

    drawEyes(ctx) {
        const eyeOffsetX = this.dirX * 2;
        const eyeOffsetY = this.dirY * 2;

        // Left Eye
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(-5 + eyeOffsetX, -3 + eyeOffsetY, 4, 0, 2 * Math.PI);
        ctx.fill();

        // Right Eye
        ctx.beginPath();
        ctx.arc(5 + eyeOffsetX, -3 + eyeOffsetY, 4, 0, 2 * Math.PI);
        ctx.fill();

        // Pupils
        ctx.fillStyle = '#0000ff';
        ctx.beginPath();
        ctx.arc(-5 + eyeOffsetX * 1.5, -3 + eyeOffsetY * 1.5, 2, 0, 2 * Math.PI);
        ctx.arc(5 + eyeOffsetX * 1.5, -3 + eyeOffsetY * 1.5, 2, 0, 2 * Math.PI);
        ctx.fill();
    }
}

// --- Instantiate Entities ---
const pacman = new Pacman();
const ghosts = [
    new Ghost('Blinky', '#ff0000', MAP_WIDTH - 1, 0, 9, 8, 0),        // Red (starts outside)
    new Ghost('Pinky', '#ffb8ff', 0, 0, 9, 10, 120),                 // Pink (leaves after 2s)
    new Ghost('Inky', '#00ffff', MAP_WIDTH - 1, MAP_HEIGHT - 1, 8, 10, 300), // Cyan (leaves after 5s)
    new Ghost('Clyde', '#ffb852', 0, MAP_HEIGHT - 1, 10, 10, 600)    // Orange (leaves after 10s)
];

// --- Game Logic Functions ---

function initMap() {
    map = ORIGINAL_MAP.map(row => [...row]);
    totalDots = 0;
    dotsEaten = 0;
    for (let r = 0; r < MAP_HEIGHT; r++) {
        for (let c = 0; c < MAP_WIDTH; c++) {
            if (map[r][c] === 2 || map[r][c] === 3) {
                totalDots++;
            }
        }
    }
}

function triggerFrightenedMode() {
    frightenedTimer = 420; // 7 seconds at 60fps
    ghostEatenMultiplier = 1;
    ghosts.forEach(ghost => {
        if (ghost.mode !== 'house' && ghost.mode !== 'eaten') {
            ghost.mode = 'frightened';
        }
    });
}

function updateScore() {
    document.getElementById('score').innerText = String(score).padStart(6, '0');
    if (score > highScore) {
        highScore = score;
        localStorage.setItem('pacman_highScore', highScore);
        document.getElementById('high-score').innerText = String(highScore).padStart(6, '0');
    }
}

function updateLivesDisplay() {
    const container = document.getElementById('lives-container');
    container.innerHTML = '';
    for (let i = 0; i < lives; i++) {
        const life = document.createElement('div');
        life.className = 'life-icon';
        container.appendChild(life);
    }
}

function checkWinCondition() {
    if (dotsEaten >= totalDots) {
        gameState = 'VICTORY';
        document.getElementById('victory-screen').classList.remove('hidden');
    }
}

function resetPositions() {
    pacman.reset();
    ghosts.forEach(ghost => ghost.reset());
}

function handleCollisions() {
    ghosts.forEach(ghost => {
        // Calculate distance between Pac-Man and Ghost
        const dist = Math.hypot(pacman.x - ghost.x, pacman.y - ghost.y);
        if (dist < TILE_SIZE / 1.5) {
            if (ghost.mode === 'frightened') {
                // Eat Ghost
                ghost.mode = 'eaten';
                sounds.playEatGhost();
                const points = 200 * ghostEatenMultiplier;
                score += points;
                ghostEatenMultiplier *= 2;
                updateScore();
                
                // Draw floating score text (optional, but let's keep it simple)
            } else if (ghost.mode !== 'eaten' && ghost.mode !== 'house') {
                // Pac-Man Dies
                gameState = 'DYING';
                stateTimer = 0;
                sounds.playDeath();
            }
        }
    });
}

// --- Drawing Functions ---

function drawMap() {
    for (let r = 0; r < MAP_HEIGHT; r++) {
        for (let c = 0; c < MAP_WIDTH; c++) {
            const tile = map[r][c];
            const x = c * TILE_SIZE;
            const y = r * TILE_SIZE;

            if (tile === 1) {
                // Draw Wall
                ctx.fillStyle = '#000033';
                ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
                ctx.strokeStyle = '#1111ff';
                ctx.lineWidth = 2;
                ctx.strokeRect(x + 2, y + 2, TILE_SIZE - 4, TILE_SIZE - 4);
            } else if (tile === 2) {
                // Draw Dot
                ctx.fillStyle = '#ffb8ae';
                ctx.beginPath();
                ctx.arc(x + TILE_SIZE / 2, y + TILE_SIZE / 2, 3, 0, 2 * Math.PI);
                ctx.fill();
            } else if (tile === 3) {
                // Draw Power Pellet (pulsing)
                if (Math.floor(globalTimer / 15) % 2 === 0) {
                    ctx.fillStyle = '#ffb8ae';
                    ctx.beginPath();
                    ctx.arc(x + TILE_SIZE / 2, y + TILE_SIZE / 2, 7, 0, 2 * Math.PI);
                    ctx.fill();
                }
            } else if (tile === 4) {
                // Draw Ghost Gate
                ctx.fillStyle = '#ffb8ff';
                ctx.fillRect(x, y + TILE_SIZE / 2 - 2, TILE_SIZE, 4);
            }
        }
    }
}

// --- Main Game Loop ---

function update() {
    globalTimer++;

    if (gameState === 'PLAYING') {
        pacman.update();

        // Update Ghost Mode Timer (Chase vs Scatter)
        // 20s chase, 7s scatter cycle
        const cycleTime = globalTimer % 1620; // 27 seconds at 60fps
        let currentGlobalMode = 'chase';
        if (cycleTime < 420) { // First 7 seconds
            currentGlobalMode = 'scatter';
        }

        // Update frightened timer
        if (frightenedTimer > 0) {
            frightenedTimer--;
            if (frightenedTimer === 0) {
                ghosts.forEach(ghost => {
                    if (ghost.mode === 'frightened') {
                        ghost.mode = currentGlobalMode;
                    }
                });
            }
        }

        ghosts.forEach(ghost => {
            // If frightened timer is active, keep frightened mode unless eaten
            if (frightenedTimer > 0 && ghost.mode !== 'eaten' && ghost.mode !== 'house') {
                ghost.mode = 'frightened';
            } else if (ghost.mode !== 'eaten' && ghost.mode !== 'house') {
                ghost.mode = currentGlobalMode;
            }
            ghost.update(pacman);
        });

        handleCollisions();
    } else if (gameState === 'DYING') {
        stateTimer++;
        if (stateTimer > 120) { // 2 seconds delay
            lives--;
            updateLivesDisplay();
            if (lives <= 0) {
                gameState = 'GAMEOVER';
                document.getElementById('game-over-screen').classList.remove('hidden');
                document.getElementById('final-score-text').innerText = `SCORE: ${score}`;
            } else {
                resetPositions();
                gameState = 'PLAYING';
            }
        }
    }
}

function draw() {
    // Clear Canvas
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    drawMap();

    if (gameState !== 'DYING' || Math.floor(stateTimer / 10) % 2 === 0) {
        pacman.draw(ctx);
    }

    if (gameState !== 'DYING') {
        ghosts.forEach(ghost => ghost.draw(ctx));
    }
}

function gameLoop() {
    update();
    draw();
    requestAnimationFrame(gameLoop);
}

// --- Keyboard & Control Event Listeners ---

const keyMap = {
    'ArrowUp': { x: 0, y: -1 },
    'KeyW': { x: 0, y: -1 },
    'ArrowDown': { x: 0, y: 1 },
    'KeyS': { x: 0, y: 1 },
    'ArrowLeft': { x: -1, y: 0 },
    'KeyA': { x: -1, y: 0 },
    'ArrowRight': { x: 1, y: 0 },
    'KeyD': { x: 1, y: 0 }
};

window.addEventListener('keydown', e => {
    // Prevent scrolling with arrow keys
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
        e.preventDefault();
    }

    // Initialize Audio Context on first interaction
    sounds.init();

    // Handle Mute Toggle
    if (e.code === 'KeyM') {
        sounds.muted = !sounds.muted;
        document.getElementById('sound-status').innerText = sounds.muted ? 'OFF' : 'ON';
        document.getElementById('sound-status').style.color = sounds.muted ? '#ff0000' : '#00ff00';
        return;
    }

    // Handle Game States
    if (gameState === 'START') {
        if (e.code === 'Enter' || e.code === 'Space') {
            startGame();
        }
    } else if (gameState === 'GAMEOVER') {
        if (e.code === 'Enter' || e.code === 'Space') {
            restartGame();
        }
    } else if (gameState === 'VICTORY') {
        if (e.code === 'Enter' || e.code === 'Space') {
            nextLevel();
        }
    } else if (gameState === 'PLAYING') {
        if (e.code === 'Escape') {
            gameState = 'PAUSED';
            document.getElementById('pause-screen').classList.remove('hidden');
        } else if (keyMap[e.code]) {
            pacman.nextDirX = keyMap[e.code].x;
            pacman.nextDirY = keyMap[e.code].y;
        }
    } else if (gameState === 'PAUSED') {
        if (e.code === 'Escape') {
            gameState = 'PLAYING';
            document.getElementById('pause-screen').classList.add('hidden');
        }
    }
});

// Click to Start support
document.getElementById('start-screen').addEventListener('click', () => {
    sounds.init();
    startGame();
});

document.getElementById('game-over-screen').addEventListener('click', () => {
    restartGame();
});

document.getElementById('victory-screen').addEventListener('click', () => {
    nextLevel();
});

// --- Game State Controllers ---

function startGame() {
    document.getElementById('start-screen').classList.add('hidden');
    initMap();
    resetPositions();
    score = 0;
    lives = 3;
    level = 1;
    updateScore();
    updateLivesDisplay();
    sounds.playStart();
    
    // Delay starting the game slightly to let the intro music play
    gameState = 'PLAYING';
}

function restartGame() {
    document.getElementById('game-over-screen').classList.add('hidden');
    startGame();
}

function nextLevel() {
    document.getElementById('victory-screen').classList.add('hidden');
    level++;
    initMap();
    resetPositions();
    sounds.playStart();
    gameState = 'PLAYING';
}

// Initialize Map and Lives on load
initMap();
updateLivesDisplay();

// Start the game loop
requestAnimationFrame(gameLoop);
