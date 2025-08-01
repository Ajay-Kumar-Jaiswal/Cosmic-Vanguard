const canvas = document.getElementById('gameCanvas');
        const ctx = canvas.getContext('2d');

        // Game state
        let gameState = {
            running: false,
            score: 0,
            level: 1,
            lives: 7,
            enemies: [],
            bullets: [],
            particles: [],
            backgroundStars: [],
            powerups: [],
            combo: 0,
            maxCombo: 0,
            comboTimer: 0,
            bossFight: false,
            boss: null,
            shakeIntensity: 0,
            cameraShake: { x: 0, y: 0 },
            enemiesKilled: 0
        };

        // Player object
        const player = {
            x: canvas.width / 2,
            y: canvas.height - 80,
            width: 35,
            height: 35,
            speed: 7,
            color: '#00ffff',
            trail: [],
            shield: 0,
            rapidFire: 0,
            tripleShot: 0,
            invulnerable: 0
        };

        // Input handling
        const keys = {};
        let lastShotTime = 0;
        
        document.addEventListener('keydown', (e) => {
            keys[e.code] = true;
            if (e.code === 'Space') e.preventDefault();
        });
        
        document.addEventListener('keyup', (e) => {
            keys[e.code] = false;
        });

        // Initialize stars
        function initStars() {
            gameState.backgroundStars = [];
            for (let i = 0; i < 80; i++) {
                gameState.backgroundStars.push({
                    x: Math.random() * canvas.width,
                    y: Math.random() * canvas.height,
                    size: Math.random() * 2 + 0.5,
                    speed: Math.random() * 2 + 0.5,
                    opacity: Math.random() * 0.6 + 0.3,
                    twinkle: Math.random() * 100
                });
            }
        }

        // Create enemy (simplified types)
        function createEnemy() {
            if (gameState.bossFight && gameState.boss) return;
            
            const types = ['basic', 'fast', 'heavy'];
            const type = types[Math.floor(Math.random() * types.length)];
            
            let enemy = {
                x: Math.random() * (canvas.width - 40),
                y: -40,
                width: 30,
                height: 30,
                type: type,
                health: 1,
                points: 15
            };

            switch (type) {
                case 'basic':
                    enemy.speed = 2.5 + gameState.level * 0.3;
                    enemy.color = '#ff6b6b';
                    break;
                case 'fast':
                    enemy.speed = 4 + gameState.level * 0.4;
                    enemy.color = '#ffa500';
                    enemy.width = 25;
                    enemy.height = 25;
                    enemy.points = 25;
                    break;
                case 'heavy':
                    enemy.speed = 1.8 + gameState.level * 0.2;
                    enemy.color = '#8b5cf6';
                    enemy.width = 40;
                    enemy.height = 40;
                    enemy.health = 2;
                    enemy.points = 40;
                    break;
            }

            gameState.enemies.push(enemy);
        }

        // Create boss
        function createBoss() {
            if (gameState.boss) return;
            
            gameState.boss = {
                x: canvas.width / 2 - 60,
                y: -120,
                width: 120,
                height: 80,
                health: 30 + gameState.level * 5,
                maxHealth: 30 + gameState.level * 5,
                speed: 1.5,
                color: '#ff0000',
                points: 1000,
                movePattern: 0,
                direction: 1
            };
            
            showBossWarning();
            updateBossHealth();
        }

        // Show boss warning
        function showBossWarning() {
            const warning = document.getElementById('bossWarning');
            warning.classList.add('show');
            setTimeout(() => {
                warning.classList.remove('show');
            }, 3000);
        }

        // Update boss health bar
        function updateBossHealth() {
            const bossHealthUI = document.getElementById('bossHealth');
            const bossHealthBar = document.getElementById('bossHealthBar');
            
            if (gameState.boss) {
                bossHealthUI.classList.add('show');
                const healthPercent = (gameState.boss.health / gameState.boss.maxHealth) * 100;
                bossHealthBar.style.width = healthPercent + '%';
            } else {
                bossHealthUI.classList.remove('show');
            }
        }

        // Create power-ups (reduced types for clarity)
        function createPowerup() {
            if (Math.random() < 0.006) {
                const types = ['shield', 'rapidfire', 'tripleshot', 'health'];
                const type = types[Math.floor(Math.random() * types.length)];
                
                gameState.powerups.push({
                    x: Math.random() * (canvas.width - 30),
                    y: -30,
                    width: 30,
                    height: 30,
                    type: type,
                    speed: 2.5,
                    color: getPowerupColor(type),
                    pulse: 0
                });
            }
        }

        function getPowerupColor(type) {
            const colors = {
                'shield': '#00ffff',
                'rapidfire': '#ff6b6b',
                'tripleshot': '#ffa500',
                'health': '#00ff00'
            };
            return colors[type];
        }

        // Shooting
        function shoot() {
            const currentCooldown = player.rapidFire > 0 ? 80 : 160;
            
            if (player.tripleShot > 0) {
                gameState.bullets.push(
                    createBullet(player.x + player.width / 2 - 2, player.y, 0),
                    createBullet(player.x + player.width / 2 - 2, player.y, -1.5),
                    createBullet(player.x + player.width / 2 - 2, player.y, 1.5)
                );
            } else {
                gameState.bullets.push(createBullet(player.x + player.width / 2 - 2, player.y, 0));
            }
        }

        function createBullet(x, y, angle) {
            return {
                x: x, y: y, width: 4, height: 10,
                speed: 9, angle: angle, color: '#00ff00'
            };
        }

        // Explosions
        function createExplosion(x, y, color = '#ff6b6b', intensity = 1) {
            gameState.shakeIntensity = Math.max(gameState.shakeIntensity, intensity * 3);
            
            for (let i = 0; i < 12 * intensity; i++) {
                gameState.particles.push({
                    x: x, y: y,
                    vx: (Math.random() - 0.5) * 10 * intensity,
                    vy: (Math.random() - 0.5) * 10 * intensity,
                    size: Math.random() * 4 + 2,
                    color: color,
                    life: 30, maxLife: 30
                });
            }
        }

        // Combo system
        function updateCombo() {
            if (gameState.comboTimer > 0) {
                gameState.comboTimer--;
                if (gameState.comboTimer <= 0) {
                    gameState.combo = 0;
                    updateComboDisplay();
                }
            }
        }

        function addCombo() {
            gameState.combo++;
            gameState.maxCombo = Math.max(gameState.maxCombo, gameState.combo);
            gameState.comboTimer = 120;
            
            if (gameState.combo >= 3) {
                showComboDisplay();
            }
            updateComboDisplay();
        }

        function showComboDisplay() {
            const display = document.getElementById('comboDisplay');
            display.textContent = `${gameState.combo}x COMBO!`;
            display.classList.add('show');
            setTimeout(() => {
                display.classList.remove('show');
            }, 1500);
        }

        function updateComboDisplay() {
            const comboHud = document.getElementById('comboHud');
            const comboSpan = document.getElementById('combo');
            
            if (gameState.combo >= 2) {
                comboHud.style.display = 'block';
                comboSpan.textContent = gameState.combo;
            } else {
                comboHud.style.display = 'none';
            }
        }

        // Apply power-ups
        function applyPowerup(type) {
            switch (type) {
                case 'shield':
                    player.shield = 480;
                    break;
                case 'rapidfire':
                    player.rapidFire = 480;
                    break;
                case 'tripleshot':
                    player.tripleShot = 360;
                    break;
                case 'health':
                    gameState.lives = Math.min(gameState.lives + 2, 10);
                    break;
            }
            updatePowerStatus();
        }

        function updatePowerStatus() {
            const powerStatus = document.getElementById('powerStatus');
            powerStatus.innerHTML = '';
            
            const powers = [
                { active: player.shield > 0, time: player.shield, name: '🛡️ Shield', class: 'power-shield' },
                { active: player.rapidFire > 0, time: player.rapidFire, name: '🔥 Rapid Fire', class: 'power-rapid' },
                { active: player.tripleShot > 0, time: player.tripleShot, name: '⚡ Triple Shot', class: 'power-triple' }
            ];
            
            powers.forEach(power => {
                if (power.active) {
                    const div = document.createElement('div');
                    div.className = `power-item ${power.class} active`;
                    div.innerHTML = `${power.name} <span>${Math.ceil(power.time / 60)}s</span>`;
                    powerStatus.appendChild(div);
                }
            });
        }

        function updateLivesDisplay() {
            const livesDisplay = document.getElementById('livesDisplay');
            livesDisplay.innerHTML = '';
            
            for (let i = 0; i < Math.min(gameState.lives, 10); i++) {
                const lifeIcon = document.createElement('div');
                lifeIcon.className = 'life-icon';
                livesDisplay.appendChild(lifeIcon);
            }
            
            if (gameState.lives > 10) {
                const extraText = document.createElement('span');
                extraText.textContent = `+${gameState.lives - 10}`;
                extraText.style.marginLeft = '10px';
                livesDisplay.appendChild(extraText);
            }
        }

        function checkCollision(obj1, obj2) {
            return obj1.x < obj2.x + obj2.width &&
                   obj1.x + obj1.width > obj2.x &&
                   obj1.y < obj2.y + obj2.height &&
                   obj1.y + obj1.height > obj2.y;
        }

        // Main update function
        function update() {
            if (!gameState.running) return;

            // Continuous shooting
            if (keys['Space'] && gameState.running) {
                const currentTime = Date.now();
                const currentCooldown = player.rapidFire > 0 ? 80 : 160;
                if (currentTime - lastShotTime > currentCooldown) {
                    shoot();
                    lastShotTime = currentTime;
                }
            }

            // Player movement
            const moveSpeed = player.speed;
            if (keys['ArrowLeft'] || keys['KeyA']) {
                player.x = Math.max(0, player.x - moveSpeed);
            }
            if (keys['ArrowRight'] || keys['KeyD']) {
                player.x = Math.min(canvas.width - player.width, player.x + moveSpeed);
            }
            if (keys['ArrowUp'] || keys['KeyW']) {
                player.y = Math.max(0, player.y - moveSpeed);
            }
            if (keys['ArrowDown'] || keys['KeyS']) {
                player.y = Math.min(canvas.height - player.height, player.y + moveSpeed);
            }

            // Update power-up timers
            if (player.shield > 0) player.shield--;
            if (player.rapidFire > 0) player.rapidFire--;
            if (player.tripleShot > 0) player.tripleShot--;
            if (player.invulnerable > 0) player.invulnerable--;

            // Update player trail
            player.trail.push({ x: player.x + player.width / 2, y: player.y + player.height / 2 });
            if (player.trail.length > 8) player.trail.shift();

            // Update background stars
            gameState.backgroundStars.forEach(star => {
                star.y += star.speed;
                star.twinkle += 0.08;
                if (star.y > canvas.height) {
                    star.y = -5;
                    star.x = Math.random() * canvas.width;
                }
            });

            // Boss spawning
            if (gameState.level % 5 === 0 && !gameState.bossFight && !gameState.boss && gameState.enemies.length === 0) {
                gameState.bossFight = true;
                createBoss();
            }

            // Spawn enemies or power-ups
            if (!gameState.bossFight) {
                if (Math.random() < 0.025 + gameState.level * 0.008) {
                    createEnemy();
                }
                createPowerup();
            }

            updateCombo();

            // Camera shake
            if (gameState.shakeIntensity > 0) {
                gameState.cameraShake.x = (Math.random() - 0.5) * gameState.shakeIntensity;
                gameState.cameraShake.y = (Math.random() - 0.5) * gameState.shakeIntensity;
                gameState.shakeIntensity *= 0.9;
                if (gameState.shakeIntensity < 0.1) gameState.shakeIntensity = 0;
            }

            // Update boss
            if (gameState.boss) {
                gameState.boss.y += gameState.boss.speed;
                if (gameState.boss.y > 30) gameState.boss.y = 30;
                
                gameState.boss.movePattern += 0.04;
                gameState.boss.x += Math.sin(gameState.boss.movePattern) * 2;
                gameState.boss.x = Math.max(0, Math.min(canvas.width - gameState.boss.width, gameState.boss.x));
                
                updateBossHealth();
            }

            // Update enemies
            gameState.enemies.forEach((enemy, enemyIndex) => {
                enemy.y += enemy.speed;

                if (enemy.y > canvas.height) {
                    gameState.enemies.splice(enemyIndex, 1);
                    return;
                }

                // Player collision
                if (!player.invulnerable && checkCollision(enemy, player)) {
                    if (player.shield > 0) {
                        player.shield = 0;
                        player.invulnerable = 90;
                        updatePowerStatus();
                    } else {
                        createExplosion(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2, '#ff6b6b', 1.5);
                        gameState.enemies.splice(enemyIndex, 1);
                        gameState.lives--;
                        player.invulnerable = 90;
                        
                        if (gameState.lives <= 0) {
                            endGame();
                        }
                    }
                    updateLivesDisplay();
                }
            });

            // Update bullets
            gameState.bullets.forEach((bullet, bulletIndex) => {
                bullet.y -= bullet.speed;
                bullet.x += bullet.angle;

                if (bullet.y < 0 || bullet.x < 0 || bullet.x > canvas.width) {
                    gameState.bullets.splice(bulletIndex, 1);
                    return;
                }

                // Boss collision
                if (gameState.boss && checkCollision(bullet, gameState.boss)) {
                    gameState.boss.health--;
                    gameState.bullets.splice(bulletIndex, 1);
                    createExplosion(bullet.x, bullet.y, '#ff6b6b');
                    
                    if (gameState.boss.health <= 0) {
                        createExplosion(gameState.boss.x + gameState.boss.width / 2, gameState.boss.y + gameState.boss.height / 2, '#ff0000', 2);
                        gameState.score += gameState.boss.points;
                        gameState.enemiesKilled++;
                        gameState.boss = null;
                        gameState.bossFight = false;
                        updateBossHealth();
                    }
                    return;
                }

                // Enemy collision
                gameState.enemies.forEach((enemy, enemyIndex) => {
                    if (checkCollision(bullet, enemy)) {
                        enemy.health--;
                        gameState.bullets.splice(bulletIndex, 1);
                        
                        if (enemy.health <= 0) {
                            createExplosion(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2, enemy.color);
                            let points = enemy.points;
                            if (gameState.combo > 0) {
                                points = Math.floor(points * (1 + gameState.combo * 0.15));
                            }
                            gameState.score += points;
                            gameState.enemiesKilled++;
                            addCombo();
                            gameState.enemies.splice(enemyIndex, 1);
                        }
                    }
                });
            });

            // Update power-ups
            gameState.powerups.forEach((powerup, index) => {
                powerup.y += powerup.speed;
                powerup.pulse += 0.15;
                
                if (powerup.y > canvas.height) {
                    gameState.powerups.splice(index, 1);
                    return;
                }
                
                if (checkCollision(powerup, player)) {
                    applyPowerup(powerup.type);
                    createExplosion(powerup.x + powerup.width / 2, powerup.y + powerup.height / 2, powerup.color);
                    gameState.powerups.splice(index, 1);
                }
            });

            // Update particles
            gameState.particles.forEach((particle, index) => {
                particle.x += particle.vx;
                particle.y += particle.vy;
                particle.vx *= 0.98;
                particle.vy *= 0.98;
                particle.life--;
                
                if (particle.life <= 0) {
                    gameState.particles.splice(index, 1);
                }
            });

            // Level progression
            if (gameState.score > gameState.level * 800) {
                gameState.level++;
            }

            updateHUD();
        }

        // Render function
        function render() {
            ctx.save();
            ctx.translate(gameState.cameraShake.x, gameState.cameraShake.y);
            
            ctx.clearRect(-10, -10, canvas.width + 20, canvas.height + 20);

            // Background stars
            gameState.backgroundStars.forEach(star => {
                const twinkle = Math.sin(star.twinkle) * 0.4 + 0.6;
                ctx.globalAlpha = star.opacity * twinkle;
                ctx.fillStyle = '#ffffff';
                ctx.shadowColor = '#ffffff';
                ctx.shadowBlur = 2;
                ctx.fillRect(star.x, star.y, star.size, star.size);
            });
            ctx.globalAlpha = 1;
            ctx.shadowBlur = 0;

            if (!gameState.running) {
                ctx.restore();
                return;
            }

            // Player trail
            if (player.trail.length > 1) {
                ctx.save();
                ctx.strokeStyle = player.shield > 0 ? 'rgba(0, 255, 255, 0.6)' : 'rgba(0, 255, 255, 0.4)';
                ctx.lineWidth = player.shield > 0 ? 4 : 2;
                ctx.shadowColor = '#00ffff';
                ctx.shadowBlur = 8;
                ctx.beginPath();
                player.trail.forEach((point, index) => {
                    if (index === 0) ctx.moveTo(point.x, point.y);
                    else ctx.lineTo(point.x, point.y);
                });
                ctx.stroke();
                ctx.restore();
            }

            // Player
            ctx.save();
            if (player.invulnerable > 0 && Math.floor(player.invulnerable / 8) % 2) {
                ctx.globalAlpha = 0.5;
            }
            
            if (player.shield > 0) {
                ctx.shadowColor = '#00ffff';
                ctx.shadowBlur = 15;
                ctx.strokeStyle = 'rgba(0, 255, 255, 0.8)';
                ctx.lineWidth = 2;
                ctx.strokeRect(player.x - 3, player.y - 3, player.width + 6, player.height + 6);
            }
            
            ctx.fillStyle = player.color;
            ctx.shadowColor = player.color;
            ctx.shadowBlur = 12;
            
            // Ship shape
            ctx.beginPath();
            ctx.moveTo(player.x + player.width / 2, player.y);
            ctx.lineTo(player.x, player.y + player.height);
            ctx.lineTo(player.x + player.width / 2, player.y + player.height * 0.8);
            ctx.lineTo(player.x + player.width, player.y + player.height);
            ctx.closePath();
            ctx.fill();
            ctx.restore();

            // Boss
            if (gameState.boss) {
                const boss = gameState.boss;
                ctx.save();
                ctx.fillStyle = boss.color;
                ctx.shadowColor = boss.color;
                ctx.shadowBlur = 20;
                
                ctx.beginPath();
                ctx.moveTo(boss.x + boss.width / 2, boss.y);
                ctx.lineTo(boss.x, boss.y + boss.height / 2);
                ctx.lineTo(boss.x + boss.width / 4, boss.y + boss.height);
                ctx.lineTo(boss.x + boss.width * 3/4, boss.y + boss.height);
                ctx.lineTo(boss.x + boss.width, boss.y + boss.height / 2);
                ctx.closePath();
                ctx.fill();
                ctx.restore();
            }

            // Enemies
            gameState.enemies.forEach(enemy => {
                ctx.save();
                ctx.fillStyle = enemy.color;
                ctx.shadowColor = enemy.color;
                ctx.shadowBlur = 8;
                
                if (enemy.type === 'heavy') {
                    ctx.fillRect(enemy.x, enemy.y, enemy.width, enemy.height);
                } else {
                    ctx.beginPath();
                    ctx.moveTo(enemy.x + enemy.width / 2, enemy.y + enemy.height);
                    ctx.lineTo(enemy.x, enemy.y);
                    ctx.lineTo(enemy.x + enemy.width, enemy.y);
                    ctx.closePath();
                    ctx.fill();
                }
                ctx.restore();
            });

            // Bullets
            gameState.bullets.forEach(bullet => {
                ctx.save();
                ctx.fillStyle = bullet.color;
                ctx.shadowColor = bullet.color;
                ctx.shadowBlur = 6;
                ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
                ctx.restore();
            });

            // Power-ups
            gameState.powerups.forEach(powerup => {
                ctx.save();
                const pulse = Math.sin(powerup.pulse) * 0.2 + 1;
                ctx.scale(pulse, pulse);
                ctx.fillStyle = powerup.color;
                ctx.shadowColor = powerup.color;
                ctx.shadowBlur = 12;
                
                const adjustedX = powerup.x / pulse;
                const adjustedY = powerup.y / pulse;
                
                switch (powerup.type) {
                    case 'shield':
                        ctx.strokeStyle = powerup.color;
                        ctx.lineWidth = 3;
                        ctx.strokeRect(adjustedX + 5, adjustedY + 5, 20, 20);
                        break;
                    case 'health':
                        ctx.fillRect(adjustedX + 12, adjustedY + 7, 6, 16);
                        ctx.fillRect(adjustedX + 7, adjustedY + 12, 16, 6);
                        break;
                    default:
                        ctx.fillRect(adjustedX + 5, adjustedY + 5, 20, 20);
                        break;
                }
                ctx.restore();
            });

            // Particles
            gameState.particles.forEach(particle => {
                ctx.save();
                const alpha = particle.life / particle.maxLife;
                ctx.globalAlpha = alpha;
                ctx.fillStyle = particle.color;
                ctx.fillRect(particle.x - particle.size / 2, particle.y - particle.size / 2, particle.size, particle.size);
                ctx.restore();
            });

            ctx.restore();
        }

        function updateHUD() {
            document.getElementById('score').textContent = gameState.score;
            document.getElementById('level').textContent = gameState.level;
            updateLivesDisplay();
            updatePowerStatus();
        }

        function gameLoop() {
            update();
            render();
            requestAnimationFrame(gameLoop);
        }

        function startGame() {
            document.getElementById('startScreen').style.display = 'none';
            gameState.running = true;
            gameState.score = 0;
            gameState.level = 1;
            gameState.lives = 7;
            gameState.enemies = [];
            gameState.bullets = [];
            gameState.particles = [];
            gameState.powerups = [];
            gameState.combo = 0;
            gameState.maxCombo = 0;
            gameState.comboTimer = 0;
            gameState.bossFight = false;
            gameState.boss = null;
            gameState.enemiesKilled = 0;
            
            player.x = canvas.width / 2;
            player.y = canvas.height - 80;
            player.trail = [];
            player.shield = 0;
            player.rapidFire = 0;
            player.tripleShot = 0;
            player.invulnerable = 0;
            
            updateHUD();
        }

        function endGame() {
            gameState.running = false;
            document.getElementById('finalScore').textContent = gameState.score;
            document.getElementById('finalLevel').textContent = gameState.level;
            document.getElementById('maxCombo').textContent = gameState.maxCombo;
            document.getElementById('enemiesKilled').textContent = gameState.enemiesKilled;
            document.getElementById('gameOver').style.display = 'block';
        }

        function restartGame() {
            document.getElementById('gameOver').style.display = 'none';
            startGame();
        }

        // Initialize
        initStars();
        gameLoop();