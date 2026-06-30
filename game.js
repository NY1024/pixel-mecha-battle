/* ============================================================
 * PIXEL MECHA BATTLE - 像素机甲对战
 * 复古像素风双人机甲对战游戏
 * ============================================================ */

// ============ 常量配置 ============
const CANVAS_W = 960;
const CANVAS_H = 540;
const GROUND_Y = 460;
const GRAVITY = 0.6;
const FRICTION = 0.82;

const MECHA_W = 48;
const MECHA_H = 72;
const MOVE_SPEED = 2.8;
const JUMP_POWER = 12;
const ATTACK_RANGE = 52;
const ATTACK_DURATION = 14;
const ATTACK_ACTIVE_START = 5;
const ATTACK_ACTIVE_END = 11;
const ATTACK_COOLDOWN = 26;
const BLOCK_DURATION = 50;
const BLOCK_COOLDOWN = 8;
const I_FRAME = 18;
const HITSTUN = 14;

const MAX_HP = 100;
const ATTACK_DAMAGE = 12;
const ROUND_TIME = 90;
const WIN_ROUNDS = 2;

// 颜色配置
const P1_COLORS = {
  body: '#4060c0', bodyDark: '#2a4080', bodyLight: '#6080e0',
  accent: '#ffd040', accentDark: '#c0a020', visor: '#00e0ff',
  joint: '#1a2a50', outline: '#0a0a1a',
};
const P2_COLORS = {
  body: '#c04040', bodyDark: '#802a2a', bodyLight: '#e06060',
  accent: '#ffd040', accentDark: '#c0a020', visor: '#ff4000',
  joint: '#501a1a', outline: '#1a0a0a',
};

// ============ 游戏状态 ============
let canvas, ctx;
let gameState = 'menu'; // menu, playing, roundEnd, gameOver
let currentRound = 1;
let p1Score = 0;
let p2Score = 0;
let roundTimer = ROUND_TIME;
let timerTick = 0;
let screenShake = 0;
let hitFlash = 0;
let flashColor = null;
let particles = [];
let floatTexts = [];
let frameCount = 0;
let menuPulse = 0;
let endTimer = 0;
let endText = '';

const keys = {};

// ============ 玩家类 ============
class Fighter {
  constructor(x, facing, colors, controls, name) {
    this.startX = x;
    this.x = x;
    this.y = GROUND_Y;
    this.vx = 0;
    this.vy = 0;
    this.facing = facing;
    this.colors = colors;
    this.controls = controls;
    this.name = name;
    this.hp = MAX_HP;
    this.state = 'idle';
    this.stateTimer = 0;
    this.attackCooldown = 0;
    this.blockCooldown = 0;
    this.iFrame = 0;
    this.hitstun = 0;
    this.onGround = true;
    this.animFrame = 0;
    this.hasHit = false;
    this.blocking = false;
    this.flashHit = 0;
    this.legAnim = 0;
  }

  reset(x, facing) {
    this.x = x;
    this.y = GROUND_Y;
    this.vx = 0;
    this.vy = 0;
    this.facing = facing;
    this.hp = MAX_HP;
    this.state = 'idle';
    this.stateTimer = 0;
    this.attackCooldown = 0;
    this.blockCooldown = 0;
    this.iFrame = 0;
    this.hitstun = 0;
    this.onGround = true;
    this.animFrame = 0;
    this.hasHit = false;
    this.blocking = false;
    this.flashHit = 0;
  }

  update(opponent) {
    // 计时器递减
    if (this.stateTimer > 0) this.stateTimer--;
    if (this.attackCooldown > 0) this.attackCooldown--;
    if (this.blockCooldown > 0) this.blockCooldown--;
    if (this.iFrame > 0) this.iFrame--;
    if (this.hitstun > 0) this.hitstun--;
    if (this.flashHit > 0) this.flashHit--;
    this.animFrame++;

    const canAct = this.hitstun === 0 && (this.state === 'idle' || this.state === 'walk' || this.state === 'jump');

    // 处理输入
    if (canAct) {
      this.handleInput(opponent);
    }

    // 重力
    if (!this.onGround) {
      this.vy += GRAVITY;
    }

    // 位置更新
    this.x += this.vx;
    this.y += this.vy;

    // 摩擦
    if (this.onGround) this.vx *= FRICTION;

    // 地面碰撞
    if (this.y >= GROUND_Y) {
      this.y = GROUND_Y;
      this.vy = 0;
      if (!this.onGround) {
        this.onGround = true;
        if (this.state === 'jump') this.setState('idle');
      }
    } else {
      this.onGround = false;
    }

    // 场景边界
    if (this.x < MECHA_W / 2) this.x = MECHA_W / 2;
    if (this.x > CANVAS_W - MECHA_W / 2) this.x = CANVAS_W - MECHA_W / 2;

    // 自动面向对手（非攻击/受击时）
    if (canAct && this.onGround) {
      this.facing = opponent.x > this.x ? 1 : -1;
    }

    // 攻击命中检测
    if (this.state === 'attack' && !this.hasHit &&
        this.stateTimer >= ATTACK_ACTIVE_START &&
        this.stateTimer <= ATTACK_ACTIVE_END) {
      this.checkHit(opponent);
    }

    // 状态超时恢复
    if (this.state === 'attack' && this.stateTimer === 0) {
      this.setState('idle');
      this.hasHit = false;
    }
    if (this.state === 'block' && this.stateTimer === 0) {
      this.setState('idle');
      this.blocking = false;
    }
    if (this.state === 'hit' && this.stateTimer === 0) {
      this.setState('idle');
    }

    // 行走动画
    if (this.state === 'walk' && this.onGround) {
      this.legAnim += Math.abs(this.vx) * 0.3;
    } else if (this.state === 'idle' && this.onGround) {
      this.legAnim += 0.08;
    }
  }

  handleInput(opponent) {
    const c = this.controls;
    let moving = false;

    // 移动
    if (keys[c.left]) {
      this.vx = -MOVE_SPEED;
      moving = true;
    } else if (keys[c.right]) {
      this.vx = MOVE_SPEED;
      moving = true;
    }

    // 跳跃
    if (keys[c.jump] && this.onGround) {
      this.vy = -JUMP_POWER;
      this.onGround = false;
      this.setState('jump');
    }

    // 攻击
    if (keys[c.attack] && this.attackCooldown === 0) {
      this.setState('attack');
      this.hasHit = false;
      this.attackCooldown = ATTACK_COOLDOWN;
      this.vx *= 0.3;
      return;
    }

    // 防御
    if (keys[c.block] && this.blockCooldown === 0 && this.onGround) {
      this.setState('block');
      this.blocking = true;
      this.blockCooldown = BLOCK_DURATION + BLOCK_COOLDOWN;
      this.vx = 0;
      return;
    }

    // 状态切换
    if (this.onGround) {
      if (moving) {
        if (this.state !== 'walk') this.setState('walk');
      } else {
        if (this.state === 'walk') this.setState('idle');
      }
    }
  }

  setState(s) {
    this.state = s;
    if (s === 'attack') this.stateTimer = ATTACK_DURATION;
    else if (s === 'block') this.stateTimer = BLOCK_DURATION;
    else if (s === 'hit') this.stateTimer = HITSTUN;
    else this.stateTimer = 0;
  }

  checkHit(opponent) {
    const reach = this.x + this.facing * ATTACK_RANGE;
    const dx = Math.abs(opponent.x - reach);
    const dy = Math.abs(opponent.y - this.y);
    if (dx < 28 && dy < 60 && opponent.iFrame === 0) {
      this.hasHit = true;
      if (opponent.blocking && opponent.facing !== this.facing) {
        // 被格挡
        opponent.vx = this.facing * 3;
        opponent.blockCooldown = Math.max(opponent.blockCooldown, 6);
        spawnBlockSpark(opponent.x - this.facing * 30, opponent.y - 40);
        screenShake = Math.max(screenShake, 3);
        addFloatText(opponent.x, opponent.y - 80, 'BLOCK!', '#80c0ff');
        playBlockSound();
      } else {
        opponent.takeDamage(ATTACK_DAMAGE, this.facing);
      }
    }
  }

  takeDamage(dmg, dir) {
    this.hp -= dmg;
    this.hp = Math.max(0, this.hp);
    this.iFrame = I_FRAME;
    this.hitstun = HITSTUN + 4;
    this.flashHit = 8;
    this.vx = dir * 5;
    this.vy = -3;
    this.onGround = false;
    this.setState('hit');
    screenShake = Math.max(screenShake, 8);
    hitFlash = 6;
    flashColor = this.colors.bodyLight;
    spawnHitParticles(this.x, this.y - 36);
    addFloatText(this.x, this.y - 80, '-' + dmg, '#ff6060');
    playHitSound();
  }

  // ============ 像素机甲绘制 ============
  draw(ctx) {
    ctx.save();
    ctx.translate(Math.round(this.x), Math.round(this.y));
    ctx.scale(this.facing, 1);

    const c = this.colors;
    const flash = this.flashHit > 0 && this.animFrame % 2 === 0;
    const bodyCol = flash ? '#ffffff' : c.body;
    const bodyDk = flash ? '#ffffff' : c.bodyDark;
    const bodyLt = flash ? '#ffffff' : c.bodyLight;

    const p = 3; // 像素大小
    const ox = -24; // 原点偏移x
    const oy = -68; // 原点偏移y（脚底为原点）

    // 腿部动画偏移
    let legOffsetL = 0, legOffsetR = 0;
    if (this.state === 'walk') {
      legOffsetL = Math.sin(this.legAnim) * 3;
      legOffsetR = Math.sin(this.legAnim + Math.PI) * 3;
    } else if (this.state === 'idle') {
      legOffsetL = Math.sin(this.legAnim) * 0.5;
      legOffsetR = Math.sin(this.legAnim + Math.PI) * 0.5;
    } else if (this.state === 'jump') {
      legOffsetL = -2;
      legOffsetR = -2;
    }

    // ---- 绘制函数 ----
    function px(x, y, w, h, color) {
      ctx.fillStyle = color;
      ctx.fillRect(ox + x * p, oy + y * p, w * p, h * p);
    }

    // ---- 腿部 ----
    // 左腿
    px(6, 50 + legOffsetL, 4, 6, bodyDk);
    px(5, 55 + legOffsetL, 6, 3, c.joint);
    // 右腿
    px(10, 50 + legOffsetR, 4, 6, bodyDk);
    px(9, 55 + legOffsetR, 6, 3, c.joint);

    // ---- 身体躯干 ----
    // 主体
    px(5, 28, 12, 14, bodyCol);
    // 暗部
    px(5, 40, 12, 2, bodyDk);
    // 亮部
    px(5, 28, 12, 2, bodyLt);
    // 装甲条纹
    px(6, 33, 10, 1, c.accent);
    px(6, 35, 10, 1, c.accentDark);
    // 胸口核心
    px(9, 36, 4, 4, c.visor);
    px(10, 37, 2, 2, '#ffffff');

    // ---- 肩膀 ----
    px(2, 26, 5, 6, bodyLt);
    px(15, 26, 5, 6, bodyLt);
    px(2, 31, 5, 1, bodyDk);
    px(15, 31, 5, 1, bodyDk);
    // 肩甲尖角
    px(1, 25, 2, 2, c.accent);
    px(19, 25, 2, 2, c.accent);

    // ---- 手臂 ----
    let armAngle = 0;
    let armY = 33;
    let armExtended = false;

    if (this.state === 'attack') {
      const progress = 1 - (this.stateTimer - ATTACK_ACTIVE_START) / (ATTACK_ACTIVE_END - ATTACK_ACTIVE_START);
      armAngle = Math.sin(progress * Math.PI) * 1;
      armY = 33 - Math.sin(progress * Math.PI) * 2;
      armExtended = this.stateTimer >= ATTACK_ACTIVE_START && this.stateTimer <= ATTACK_ACTIVE_END;
    } else if (this.state === 'block') {
      armY = 30;
    } else if (this.state === 'hit') {
      armY = 35;
    }

    // 后臂（左手，在身后）
    px(2, armY + 1, 3, 7, bodyDk);
    if (this.state === 'block') {
      px(4, armY - 1, 4, 9, c.accent);
    }

    // 前臂（右手，攻击臂）
    if (this.state === 'attack' && armExtended) {
      // 攻击时手臂伸出
      px(17, armY, 12, 5, bodyCol);
      px(17, armY, 12, 1, bodyLt);
      // 剑/光刃
      px(28, armY - 2, 3, 9, c.visor);
      px(29, armY - 4, 1, 13, '#ffffff');
      // 攻击光效
      ctx.globalAlpha = 0.5;
      px(30, armY - 6, 6, 13, c.visor);
      ctx.globalAlpha = 0.2;
      px(32, armY - 10, 10, 21, c.visor);
      ctx.globalAlpha = 1;
    } else if (this.state === 'block') {
      // 防御时手臂前举
      px(15, armY, 6, 5, bodyCol);
      px(15, armY, 6, 1, bodyLt);
      // 盾牌
      px(19, armY - 3, 4, 10, c.accent);
      px(20, armY - 2, 2, 8, c.accentDark);
      px(20, armY + 1, 2, 2, c.visor);
    } else {
      // 普通手臂
      px(15, armY, 4, 7, bodyCol);
      px(15, armY, 4, 1, bodyLt);
      // 拳头
      px(15, armY + 6, 4, 3, bodyDk);
    }

    // ---- 头部 ----
    let headY = 12;
    if (this.state === 'walk') headY += Math.sin(this.legAnim * 2) * 0.5;
    if (this.state === 'hit') headY += 2;

    // 头盔主体
    px(6, headY, 10, 9, bodyCol);
    // 头盔顶部亮
    px(6, headY, 10, 2, bodyLt);
    // 头盔底部暗
    px(6, headY + 7, 10, 2, bodyDk);
    // 头盔尖角
    px(8, headY - 2, 2, 2, c.accent);
    px(12, headY - 2, 2, 2, c.accent);
    // 面甲
    px(7, headY + 3, 8, 3, c.joint);
    // 面甲发光眼/visor
    px(8, headY + 4, 6, 1, c.visor);
    if (this.animFrame % 20 < 14) {
      px(9, headY + 4, 4, 1, '#ffffff');
    }
    // 侧面通讯器
    px(5, headY + 4, 1, 2, c.accent);
    px(16, headY + 4, 1, 2, c.accent);

    // ---- 背包/排气口 ----
    px(3, 22, 3, 8, bodyDk);
    px(16, 22, 3, 8, bodyDk);
    // 排气闪烁
    if (this.animFrame % 10 < 5 && (this.state === 'idle' || this.state === 'walk')) {
      px(3, 20, 3, 2, c.visor);
      px(16, 20, 3, 2, c.visor);
    }

    // ---- 地面阴影 ----
    ctx.scale(this.facing, 1); // 恢复朝向
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    const shadowW = this.onGround ? 24 : 16;
    ctx.fillRect(-shadowW, -2, shadowW * 2, 4);

    ctx.restore();
  }
}

// ============ 粒子系统 ============
function spawnHitParticles(x, y) {
  for (let i = 0; i < 12; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 2 + Math.random() * 4;
    particles.push({
      x: x, y: y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 1,
      life: 20 + Math.random() * 10,
      maxLife: 30,
      size: 2 + Math.random() * 2,
      color: ['#ff8040', '#ffd040', '#ffffff', '#ff4040'][Math.floor(Math.random() * 4)],
      gravity: 0.2,
    });
  }
  // 冲击波环
  particles.push({
    x: x, y: y, vx: 0, vy: 0,
    life: 12, maxLife: 12,
    size: 5, ring: true,
    color: '#ffffff', gravity: 0,
  });
}

function spawnBlockSpark(x, y) {
  for (let i = 0; i < 8; i++) {
    const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI;
    const speed = 2 + Math.random() * 3;
    particles.push({
      x: x, y: y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 15, maxLife: 15,
      size: 2, color: '#80c0ff',
      gravity: 0.1,
    });
  }
}

function updateParticles() {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.vy += p.gravity;
    p.life--;
    if (p.life <= 0) particles.splice(i, 1);
  }
}

function drawParticles(ctx) {
  for (const p of particles) {
    const alpha = p.life / p.maxLife;
    ctx.globalAlpha = alpha;
    if (p.ring) {
      ctx.strokeStyle = p.color;
      ctx.lineWidth = 2;
      const r = (1 - alpha) * 30;
      ctx.beginPath();
      ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
      ctx.stroke();
    } else {
      ctx.fillStyle = p.color;
      ctx.fillRect(Math.round(p.x), Math.round(p.y), p.size, p.size);
    }
  }
  ctx.globalAlpha = 1;
}

// ============ 浮动文字 ============
function addFloatText(x, y, text, color) {
  floatTexts.push({ x, y, text, color, life: 40, maxLife: 40 });
}

function updateFloatTexts() {
  for (let i = floatTexts.length - 1; i >= 0; i--) {
    const f = floatTexts[i];
    f.y -= 1.2;
    f.life--;
    if (f.life <= 0) floatTexts.splice(i, 1);
  }
}

function drawFloatTexts(ctx) {
  ctx.textAlign = 'center';
  ctx.font = 'bold 18px "Courier New", monospace';
  for (const f of floatTexts) {
    const alpha = Math.min(1, f.life / 20);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = '#000000';
    ctx.fillText(f.text, f.x + 1, f.y + 1);
    ctx.fillStyle = f.color;
    ctx.fillText(f.text, f.x, f.y);
  }
  ctx.globalAlpha = 1;
}

// ============ 音效 ============
let audioCtx = null;
function initAudio() {
  if (!audioCtx) {
    try {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) {}
  }
}

function playTone(freq, duration, type, vol) {
  if (!audioCtx) return;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = type || 'square';
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(vol || 0.1, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start();
  osc.stop(audioCtx.currentTime + duration);
}

function playHitSound() {
  playTone(180, 0.1, 'sawtooth', 0.15);
  setTimeout(() => playTone(80, 0.15, 'square', 0.1), 30);
}

function playBlockSound() {
  playTone(600, 0.05, 'square', 0.08);
  playTone(900, 0.08, 'sine', 0.06);
}

function playSelectSound() {
  playTone(440, 0.06, 'square', 0.08);
  setTimeout(() => playTone(660, 0.08, 'square', 0.08), 50);
}

// ============ 背景绘制 ============
function drawBackground(ctx) {
  // 天空渐变
  const sky = ctx.createLinearGradient(0, 0, 0, GROUND_Y);
  sky.addColorStop(0, '#0a0a20');
  sky.addColorStop(0.4, '#1a1040');
  sky.addColorStop(0.7, '#2a1860');
  sky.addColorStop(1, '#3a2070');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, CANVAS_W, GROUND_Y);

  // 星星
  ctx.fillStyle = '#ffffff';
  for (let i = 0; i < 60; i++) {
    const sx = (i * 137) % CANVAS_W;
    const sy = (i * 83) % 200;
    const tw = Math.sin(frameCount * 0.05 + i) * 0.5 + 0.5;
    ctx.globalAlpha = tw * 0.8;
    ctx.fillRect(sx, sy, 2, 2);
  }
  ctx.globalAlpha = 1;

  // 远处城市轮廓
  ctx.fillStyle = '#1a0a30';
  for (let i = 0; i < 40; i++) {
    const bx = i * 24;
    const bh = 20 + (i * 37) % 80;
    ctx.fillRect(bx, GROUND_Y - bh, 22, bh);
    // 窗户灯光
    ctx.fillStyle = (i + Math.floor(frameCount / 30)) % 3 === 0 ? '#ffd040' : '#2a1860';
    for (let wy = 0; wy < bh - 6; wy += 8) {
      ctx.fillRect(bx + 4, GROUND_Y - bh + wy + 4, 3, 3);
      ctx.fillRect(bx + 12, GROUND_Y - bh + wy + 4, 3, 3);
    }
    ctx.fillStyle = '#1a0a30';
  }

  // 中景建筑
  ctx.fillStyle = '#0a0520';
  for (let i = 0; i < 20; i++) {
    const bx = i * 50 + 10;
    const bh = 40 + (i * 53) % 60;
    ctx.fillRect(bx, GROUND_Y - bh, 46, bh);
  }

  // 地面
  const groundGrad = ctx.createLinearGradient(0, GROUND_Y, 0, CANVAS_H);
  groundGrad.addColorStop(0, '#2a2a3a');
  groundGrad.addColorStop(0.3, '#1a1a2a');
  groundGrad.addColorStop(1, '#0a0a1a');
  ctx.fillStyle = groundGrad;
  ctx.fillRect(0, GROUND_Y, CANVAS_W, CANVAS_H - GROUND_Y);

  // 地面网格线
  ctx.strokeStyle = 'rgba(80, 100, 160, 0.3)';
  ctx.lineWidth = 1;
  // 横线
  for (let i = 0; i < 5; i++) {
    const y = GROUND_Y + i * 16 + i * i * 2;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(CANVAS_W, y);
    ctx.stroke();
  }
  // 透视纵线
  const vp = CANVAS_W / 2;
  for (let i = -10; i <= 10; i++) {
    const x = vp + i * 48;
    ctx.beginPath();
    ctx.moveTo(vp + i * 24, GROUND_Y);
    ctx.lineTo(x, CANVAS_H);
    ctx.stroke();
  }

  // 地面高亮线
  ctx.strokeStyle = '#5070a0';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, GROUND_Y);
  ctx.lineTo(CANVAS_W, GROUND_Y);
  ctx.stroke();
}

// ============ HUD 绘制 ============
function drawHUD(ctx) {
  // P1 血条（左）
  drawHealthBar(ctx, 20, 20, 320, true, p1, '#4060c0');
  // P2 血条（右）
  drawHealthBar(ctx, CANVAS_W - 340, 20, 320, false, p2, '#c04040');

  // 回合时间
  ctx.textAlign = 'center';
  ctx.font = 'bold 28px "Courier New", monospace';
  const timeStr = Math.ceil(Math.max(0, roundTimer)).toString().padStart(2, '0');
  const timeColor = roundTimer <= 10 ? '#ff4040' : '#ffffff';
  ctx.fillStyle = '#000000';
  ctx.fillText(timeStr, CANVAS_W / 2 + 2, 44);
  ctx.fillStyle = timeColor;
  ctx.fillText(timeStr, CANVAS_W / 2, 42);

  // 回合制
  ctx.font = 'bold 14px "Courier New", monospace';
  ctx.fillStyle = '#808090';
  ctx.fillText('ROUND ' + currentRound, CANVAS_W / 2, 62);

  // 得分点
  drawScoreDots(ctx, CANVAS_W / 2 - 50, 70, p1Score, '#4060c0');
  drawScoreDots(ctx, CANVAS_W / 2 + 20, 70, p2Score, '#c04040');
}

function drawHealthBar(ctx, x, y, w, leftAlign, fighter, color) {
  // 背景框
  ctx.fillStyle = '#1a1a2a';
  ctx.fillRect(x - 2, y - 2, w + 4, 24);
  ctx.strokeStyle = '#3a3a5a';
  ctx.lineWidth = 2;
  ctx.strokeRect(x - 2, y - 2, w + 4, 24);

  // 血条背景
  ctx.fillStyle = '#2a1010';
  ctx.fillRect(x, y, w, 20);

  // 血量
  const hpRatio = fighter.hp / MAX_HP;
  const hpW = Math.floor(w * hpRatio);
  const bx = leftAlign ? x : x + w - hpW;

  // 血条颜色根据血量变化
  let hpColor;
  if (hpRatio > 0.5) hpColor = color;
  else if (hpRatio > 0.25) hpColor = '#ffaa20';
  else hpColor = '#ff4040';

  ctx.fillStyle = hpColor;
  ctx.fillRect(bx, y, hpW, 20);

  // 血条高亮
  ctx.fillStyle = 'rgba(255,255,255,0.2)';
  ctx.fillRect(bx, y, hpW, 4);

  // 分段线
  ctx.strokeStyle = 'rgba(0,0,0,0.4)';
  ctx.lineWidth = 1;
  for (let i = 1; i < 10; i++) {
    const sx = x + (w / 10) * i;
    ctx.beginPath();
    ctx.moveTo(sx, y);
    ctx.lineTo(sx, y + 20);
    ctx.stroke();
  }

  // 名字
  ctx.font = 'bold 14px "Courier New", monospace';
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = leftAlign ? 'left' : 'right';
  const nameX = leftAlign ? x : x + w;
  ctx.fillText(fighter.name, nameX, y - 6);

  // HP数字
  ctx.font = 'bold 12px "Courier New", monospace';
  ctx.fillStyle = '#c0c0d0';
  ctx.fillText(Math.ceil(fighter.hp) + ' / ' + MAX_HP, nameX, y + 36);
}

function drawScoreDots(ctx, x, y, score, color) {
  for (let i = 0; i < WIN_ROUNDS; i++) {
    ctx.fillStyle = i < score ? color : '#2a2a3a';
    ctx.fillRect(x + i * 14, y, 10, 10);
    ctx.strokeStyle = '#4a4a6a';
    ctx.lineWidth = 1;
    ctx.strokeRect(x + i * 14, y, 10, 10);
  }
}

// ============ 菜单绘制 ============
function drawMenu(ctx) {
  // 暗色覆盖
  ctx.fillStyle = 'rgba(0, 0, 20, 0.6)';
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

  // 标题
  ctx.textAlign = 'center';
  const pulse = Math.sin(menuPulse) * 0.1 + 1;

  ctx.save();
  ctx.translate(CANVAS_W / 2, 160);
  ctx.scale(pulse, pulse);

  // 标题阴影
  ctx.font = 'bold 52px "Courier New", monospace';
  ctx.fillStyle = '#000020';
  ctx.fillText('PIXEL MECHA', 4, 4);
  ctx.fillText('BATTLE', 4, 64);

  // 标题主体
  ctx.fillStyle = '#5080ff';
  ctx.fillText('PIXEL MECHA', 0, 0);
  ctx.fillStyle = '#ffd040';
  ctx.fillText('BATTLE', 0, 60);

  ctx.restore();

  // 副标题
  ctx.font = '16px "Courier New", monospace';
  ctx.fillStyle = '#8080a0';
  ctx.fillText('像 素 机 甲 对 战', CANVAS_W / 2, 250);

  // 开始提示
  if (Math.floor(menuPulse * 2) % 2 === 0) {
    ctx.font = 'bold 22px "Courier New", monospace';
    ctx.fillStyle = '#ffffff';
    ctx.fillText('按 [空格] 开始对战', CANVAS_W / 2, 340);
  }

  // 控制说明
  ctx.font = '13px "Courier New", monospace';
  ctx.fillStyle = '#5080ff';
  ctx.textAlign = 'left';
  ctx.fillText('PLAYER 1', 160, 390);
  ctx.fillStyle = '#8080a0';
  ctx.fillText('A / D    移动', 160, 410);
  ctx.fillText('W        跳跃', 160, 428);
  ctx.fillText('F        攻击', 160, 446);
  ctx.fillText('G        防御', 160, 464);

  ctx.fillStyle = '#ff5050';
  ctx.textAlign = 'right';
  ctx.fillText('PLAYER 2', CANVAS_W - 160, 390);
  ctx.fillStyle = '#8080a0';
  ctx.fillText('← / →    移动', CANVAS_W - 160, 410);
  ctx.fillText('↑        跳跃', CANVAS_W - 160, 428);
  ctx.fillText('K        攻击', CANVAS_W - 160, 446);
  ctx.fillText('L        防御', CANVAS_W - 160, 464);

  // 版本信息
  ctx.textAlign = 'center';
  ctx.font = '11px "Courier New", monospace';
  ctx.fillStyle = '#404060';
  ctx.fillText('v1.0  © 2026  PIXEL MECHA BATTLE', CANVAS_W / 2, 510);
}

// ============ 结束画面 ============
function drawRoundEnd(ctx) {
  ctx.fillStyle = 'rgba(0, 0, 20, 0.5)';
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

  ctx.textAlign = 'center';
  ctx.font = 'bold 40px "Courier New", monospace';
  ctx.fillStyle = '#000000';
  ctx.fillText(endText, CANVAS_W / 2 + 2, CANVAS_H / 2 + 2);
  ctx.fillStyle = endText.includes('P1') ? '#5080ff' : (endText.includes('P2') ? '#ff5050' : '#ffd040');
  ctx.fillText(endText, CANVAS_W / 2, CANVAS_H / 2);

  if (endTimer < 120) {
    ctx.font = '16px "Courier New", monospace';
    ctx.fillStyle = '#8080a0';
    const dots = '.'.repeat(Math.floor(endTimer / 20) % 4);
    ctx.fillText('下一回合即将开始' + dots, CANVAS_W / 2, CANVAS_H / 2 + 50);
  }
}

function drawGameOver(ctx) {
  ctx.fillStyle = 'rgba(0, 0, 20, 0.7)';
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

  ctx.textAlign = 'center';

  // 胜利者
  const winner = p1Score > p2Score ? 'PLAYER 1' : 'PLAYER 2';
  const wColor = p1Score > p2Score ? '#5080ff' : '#ff5050';

  ctx.font = 'bold 20px "Courier New", monospace';
  ctx.fillStyle = '#8080a0';
  ctx.fillText('WINNER', CANVAS_W / 2, CANVAS_H / 2 - 60);

  const pulse = Math.sin(frameCount * 0.08) * 0.05 + 1;
  ctx.save();
  ctx.translate(CANVAS_W / 2, CANVAS_H / 2);
  ctx.scale(pulse, pulse);
  ctx.font = 'bold 48px "Courier New", monospace';
  ctx.fillStyle = '#000000';
  ctx.fillText(winner, 3, 3);
  ctx.fillStyle = wColor;
  ctx.fillText(winner, 0, 0);
  ctx.restore();

  // 比分
  ctx.font = 'bold 28px "Courier New", monospace';
  ctx.fillStyle = '#ffffff';
  ctx.fillText(p1Score + ' - ' + p2Score, CANVAS_W / 2, CANVAS_H / 2 + 50);

  // 重启提示
  if (Math.floor(frameCount * 0.05) % 2 === 0) {
    ctx.font = 'bold 18px "Courier New", monospace';
    ctx.fillStyle = '#ffd040';
    ctx.fillText('按 [空格] 重新开始', CANVAS_W / 2, CANVAS_H / 2 + 100);
  }
}

// ============ 游戏流程 ============
let p1, p2;

function initPlayers() {
  p1 = new Fighter(250, 1, P1_COLORS, {
    left: 'a', right: 'd', jump: 'w', attack: 'f', block: 'g'
  }, 'P1 BLUE');
  p2 = new Fighter(710, -1, P2_COLORS, {
    left: 'arrowleft', right: 'arrowright', jump: 'arrowup', attack: 'k', block: 'l'
  }, 'P2 RED');
}

function startRound() {
  p1.reset(250, 1);
  p2.reset(710, -1);
  roundTimer = ROUND_TIME;
  timerTick = 0;
  particles = [];
  floatTexts = [];
  gameState = 'playing';
}

function startGame() {
  currentRound = 1;
  p1Score = 0;
  p2Score = 0;
  startRound();
  playSelectSound();
}

function endRound(winner) {
  if (winner === 1) p1Score++;
  else if (winner === 2) p2Score++;

  if (p1Score >= WIN_ROUNDS || p2Score >= WIN_ROUNDS) {
    gameState = 'gameOver';
    endTimer = 0;
  } else {
    gameState = 'roundEnd';
    endTimer = 0;
    if (winner === 1) endText = 'P1 WINS ROUND!';
    else if (winner === 2) endText = 'P2 WINS ROUND!';
    else endText = 'DRAW!';
  }
}

function checkRoundEnd() {
  if (p1.hp <= 0 || p2.hp <= 0) {
    if (p1.hp <= 0 && p2.hp <= 0) endRound(0);
    else if (p1.hp <= 0) endRound(2);
    else endRound(1);
    return true;
  }
  if (roundTimer <= 0) {
    if (p1.hp > p2.hp) endRound(1);
    else if (p2.hp > p1.hp) endRound(2);
    else endRound(0);
    return true;
  }
  return false;
}

// ============ 主循环 ============
function gameLoop() {
  frameCount++;
  menuPulse += 0.05;

  // 屏幕震动
  let shakeX = 0, shakeY = 0;
  if (screenShake > 0) {
    shakeX = (Math.random() - 0.5) * screenShake;
    shakeY = (Math.random() - 0.5) * screenShake;
    screenShake *= 0.85;
    if (screenShake < 0.5) screenShake = 0;
  }

  ctx.save();
  ctx.translate(shakeX, shakeY);

  // 背景
  drawBackground(ctx);

  if (gameState === 'menu') {
    drawMenu(ctx);
  } else if (gameState === 'playing') {
    // 更新
    p1.update(p2);
    p2.update(p1);
    updateParticles();
    updateFloatTexts();

    // 倒计时
    timerTick++;
    if (timerTick >= 60) {
      timerTick = 0;
      roundTimer--;
    }

    // 绘制
    // 按y排序绘制（深度感）
    if (p1.y <= p2.y) {
      p2.draw(ctx);
      p1.draw(ctx);
    } else {
      p1.draw(ctx);
      p2.draw(ctx);
    }
    drawParticles(ctx);
    drawFloatTexts(ctx);
    drawHUD(ctx);

    // 回合结束检测
    checkRoundEnd();

    // 受击闪光
    if (hitFlash > 0) {
      ctx.globalAlpha = hitFlash * 0.06;
      ctx.fillStyle = flashColor || '#ffffff';
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
      ctx.globalAlpha = 1;
      hitFlash--;
    }
  } else if (gameState === 'roundEnd') {
    p1.update(p2);
    p2.update(p1);
    updateParticles();
    drawParticles(ctx);
    drawFloatTexts(ctx);
    drawHUD(ctx);
    drawRoundEnd(ctx);
    endTimer++;
    if (endTimer > 150) {
      currentRound++;
      startRound();
    }
  } else if (gameState === 'gameOver') {
    drawHUD(ctx);
    drawGameOver(ctx);
    endTimer++;
  }

  ctx.restore();

  requestAnimationFrame(gameLoop);
}

// ============ 输入处理 ============
window.addEventListener('keydown', (e) => {
  const key = e.key.toLowerCase();
  keys[key] = true;

  initAudio();

  if (gameState === 'menu' && key === ' ') {
    e.preventDefault();
    startGame();
  } else if (gameState === 'gameOver' && key === ' ') {
    e.preventDefault();
    gameState = 'menu';
  }

  // 阻止方向键滚动
  if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(key)) {
    e.preventDefault();
  }
});

window.addEventListener('keyup', (e) => {
  keys[e.key.toLowerCase()] = false;
});

// ============ 启动 ============
window.addEventListener('load', () => {
  canvas = document.getElementById('game-canvas');
  ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  initPlayers();
  gameLoop();
});
