// Emberfall's look: every pixel is drawn in code — a night garden in deep
// indigo, warm amber embers, violet wisps, and the Keeper's lantern light.
// Screens (title, upgrade, pause, victory, game over) are drawn here too,
// so the screenshots show the whole game, not just play.
import { VIEW, COLORS, TOTAL_WAVES } from './config.js';
import {
  SCREEN_TITLE, SCREEN_PLAY, SCREEN_UPGRADE, SCREEN_PAUSE,
  SCREEN_VICTORY, SCREEN_OVER,
} from './world.js';

// Fixed click targets, shared with main.js so clicks land on the buttons
// the player sees. All coordinates are in the 1280x720 game space.
export const TITLE_BUTTON = { x: 470, y: 512, w: 340, h: 64 };
export const END_AGAIN_BUTTON = { x: 470, y: 528, w: 340, h: 60 };
export const END_TITLE_BUTTON = { x: 520, y: 604, w: 240, h: 44 };
export const PAUSE_RESUME_BUTTON = { x: 470, y: 372, w: 340, h: 56 };
export const PAUSE_QUIT_BUTTON = { x: 520, y: 444, w: 240, h: 44 };

export function upgradeCardRect(index) {
  return { x: 170 + index * 320, y: 296, w: 300, h: 236 };
}

export function inside(rect, x, y) {
  return x >= rect.x && x <= rect.x + rect.w && y >= rect.y && y <= rect.y + rect.h;
}

function fmtTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

function glowCircle(ctx, x, y, r, inner, outer) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, inner);
  g.addColorStop(1, outer);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}

function drawBackground(ctx, world) {
  const g = ctx.createLinearGradient(0, 0, 0, VIEW.height);
  g.addColorStop(0, COLORS.skyTop);
  g.addColorStop(0.55, COLORS.skyMid);
  g.addColorStop(1, COLORS.skyBottom);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);

  for (const star of world.stars) {
    const tw = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(world.time * 1.4 + star.phase));
    ctx.globalAlpha = tw * 0.9;
    ctx.fillStyle = '#dfe6ff';
    ctx.beginPath();
    ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // Distant garden hills.
  ctx.fillStyle = '#14102e';
  ctx.beginPath();
  ctx.moveTo(0, 660);
  ctx.bezierCurveTo(220, 590, 420, 650, 640, 620);
  ctx.bezierCurveTo(860, 590, 1060, 650, 1280, 615);
  ctx.lineTo(1280, 720);
  ctx.lineTo(0, 720);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#0e0b22';
  ctx.beginPath();
  ctx.moveTo(0, 700);
  ctx.bezierCurveTo(300, 660, 700, 705, 1280, 672);
  ctx.lineTo(1280, 720);
  ctx.lineTo(0, 720);
  ctx.closePath();
  ctx.fill();

  // Fireflies drifting through the garden.
  for (const f of world.fireflies) {
    const x = f.x + Math.sin(world.time * f.speed + f.phase) * 30;
    const y = f.y + Math.cos(world.time * f.speed * 0.8 + f.phase) * 18;
    const a = 0.25 + 0.45 * (0.5 + 0.5 * Math.sin(world.time * 2 + f.phase * 3));
    ctx.globalAlpha = a;
    glowCircle(ctx, x, y, 9, 'rgba(190,255,170,0.9)', 'rgba(190,255,170,0)');
    ctx.globalAlpha = 1;
  }
}

function drawEmber(ctx, e, time) {
  const gold = e.kind === 'gold';
  const pulse = 1 + 0.12 * Math.sin(time * 5 + e.phase);
  const r = e.r * pulse * (gold ? 1.25 : 1);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  glowCircle(ctx, e.x, e.y, r * 3.2, gold ? 'rgba(255,214,80,0.55)' : 'rgba(255,179,71,0.4)', 'rgba(255,179,71,0)');
  ctx.restore();
  const g = ctx.createRadialGradient(e.x - 2, e.y - 2, 0, e.x, e.y, r);
  g.addColorStop(0, gold ? '#fff7ae' : COLORS.emberCore);
  g.addColorStop(0.55, gold ? '#ffd94d' : COLORS.ember);
  g.addColorStop(1, gold ? '#ff9d2e' : '#e07b1f');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(e.x, e.y, r, 0, Math.PI * 2);
  ctx.fill();
}

function drawWisp(ctx, w, time) {
  const color = w.kind === 'mote' ? COLORS.mote : w.kind === 'brute' ? COLORS.brute : COLORS.wisp;
  // Trailing tail.
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const tailLen = 3;
  for (let i = 1; i <= tailLen; i += 1) {
    const t = i / (tailLen + 1);
    const x = w.x - w.vx * 0.03 * i;
    const y = w.y - w.vy * 0.03 * i;
    ctx.globalAlpha = 0.35 * (1 - t);
    glowCircle(ctx, x, y, w.r * (1 - t * 0.5), color, 'rgba(0,0,0,0)');
  }
  ctx.restore();
  ctx.globalAlpha = 1;
  // Body: dark orb with a violet rim.
  const g = ctx.createRadialGradient(w.x - 4, w.y - 5, 2, w.x, w.y, w.r);
  g.addColorStop(0, '#2a1b52');
  g.addColorStop(0.7, '#1a1038');
  g.addColorStop(1, color);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(w.x, w.y, w.r, 0, Math.PI * 2);
  ctx.fill();
  if (w.kind === 'brute') {
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    for (let i = 0; i < 8; i += 1) {
      const a = (i / 8) * Math.PI * 2 + time * 0.5;
      ctx.beginPath();
      ctx.moveTo(w.x + Math.cos(a) * w.r * 0.9, w.y + Math.sin(a) * w.r * 0.9);
      ctx.lineTo(w.x + Math.cos(a) * (w.r + 9), w.y + Math.sin(a) * (w.r + 9));
      ctx.stroke();
    }
  }
  // Eyes: two pale dots that track the Keeper.
  const ex = w.vx * 0.01;
  const ey = w.vy * 0.01;
  ctx.fillStyle = '#efe6ff';
  ctx.beginPath();
  ctx.arc(w.x - 6 + ex, w.y - 3 + ey, 2.6, 0, Math.PI * 2);
  ctx.arc(w.x + 6 + ex, w.y - 3 + ey, 2.6, 0, Math.PI * 2);
  ctx.fill();
}

function drawPickup(ctx, pk, time) {
  const bob = Math.sin(time * 3 + pk.phase) * 4;
  const y = pk.y + bob;
  const blink = pk.life < 2 ? (Math.sin(time * 12) > 0 ? 1 : 0.35) : 1;
  ctx.save();
  ctx.globalAlpha = blink;
  ctx.globalCompositeOperation = 'lighter';
  glowCircle(ctx, pk.x, y, 34, 'rgba(142,242,255,0.5)', 'rgba(142,242,255,0)');
  ctx.restore();
  ctx.globalAlpha = blink;
  ctx.strokeStyle = '#8ef2ff';
  ctx.fillStyle = '#0e2a33';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(pk.x, y, pk.r, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#bff6ff';
  ctx.font = 'bold 15px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const glyph = pk.kind === 'shield' ? 'S' : pk.kind === 'magnet' ? 'M' : 'H';
  ctx.fillText(glyph, pk.x, y + 1);
  ctx.globalAlpha = 1;
  ctx.font = '11px system-ui, sans-serif';
  ctx.fillStyle = '#8ef2ff';
  ctx.fillText(pk.kind.toUpperCase(), pk.x, y + pk.r + 14);
}

function drawPlayer(ctx, world) {
  const p = world.player;
  const blink = p.invulnLeft > 0 && Math.sin(world.time * 24) > 0;
  ctx.save();
  if (blink) ctx.globalAlpha = 0.35;
  // Lantern light: a warm pool around the Keeper.
  ctx.globalCompositeOperation = 'lighter';
  glowCircle(ctx, p.x, p.y, 150, 'rgba(255,214,120,0.10)', 'rgba(255,214,120,0)');
  ctx.restore();
  ctx.save();
  if (blink) ctx.globalAlpha = 0.35;
  // Cloak, cut a little larger than the collision circle so the Keeper
  // reads at a glance against the dark garden.
  const facing = p.dirX >= 0 ? 1 : -1;
  ctx.fillStyle = '#6b4fa0';
  ctx.strokeStyle = '#a582e0';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(p.x, p.y - 22);
  ctx.quadraticCurveTo(p.x + 16 * facing, p.y - 6, p.x + 13, p.y + 17);
  ctx.quadraticCurveTo(p.x, p.y + 22, p.x - 13, p.y + 17);
  ctx.quadraticCurveTo(p.x - 16 * facing, p.y - 6, p.x, p.y - 22);
  ctx.fill();
  ctx.stroke();
  // Hood.
  ctx.fillStyle = '#7d5fc0';
  ctx.beginPath();
  ctx.arc(p.x, p.y - 12, 11, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#ffd97a';
  ctx.beginPath();
  ctx.arc(p.x + 3 * facing, p.y - 12, 4.5, 0, Math.PI * 2);
  ctx.fill();
  // The lantern, swinging at the Keeper's side.
  const swing = Math.sin(world.time * 3.2) * 4 + p.vx * 0.012;
  const lx = p.x + 20 * facing + swing;
  const ly = p.y + 2;
  ctx.strokeStyle = '#6b5433';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(p.x + 10 * facing, p.y - 2);
  ctx.lineTo(lx, ly - 6);
  ctx.stroke();
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  glowCircle(ctx, lx, ly, 26, 'rgba(255,233,168,0.9)', 'rgba(255,233,168,0)');
  ctx.restore();
  ctx.fillStyle = '#ffe9a8';
  ctx.beginPath();
  ctx.arc(lx, ly, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#8a6d2f';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  // Shield ring.
  if (p.shield) {
    ctx.strokeStyle = 'rgba(142,242,255,0.85)';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 30 + Math.sin(world.time * 4) * 2, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
}

function drawParticles(ctx, world) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (const pt of world.particles) {
    ctx.globalAlpha = Math.max(0, pt.life / pt.maxLife);
    ctx.fillStyle = pt.color;
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
  ctx.globalAlpha = 1;
}

function drawFloaters(ctx, world) {
  ctx.save();
  ctx.font = 'bold 16px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (const f of world.floaters) {
    ctx.globalAlpha = Math.max(0, Math.min(1, f.life));
    ctx.fillStyle = f.color;
    ctx.fillText(f.text, f.x, f.y);
  }
  ctx.restore();
  ctx.globalAlpha = 1;
}

function drawFlame(ctx, x, y, lit, size = 9) {
  if (lit) {
    const g = ctx.createRadialGradient(x, y - 2, 0, x, y, size * 1.6);
    g.addColorStop(0, '#fff3c4');
    g.addColorStop(0.5, '#ffb347');
    g.addColorStop(1, 'rgba(224,123,31,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, size * 1.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffd97a';
    ctx.beginPath();
    ctx.ellipse(x, y - 1, size * 0.55, size * 0.85, 0, 0, Math.PI * 2);
    ctx.fill();
  } else {
    // A spent flame: a small dim ember-dot, not a ring that reads as a 0.
    ctx.fillStyle = 'rgba(245,238,218,0.28)';
    ctx.beginPath();
    ctx.arc(x, y - 1, 3.5, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawHud(ctx, world) {
  const p = world.player;
  ctx.save();
  // Top bar.
  ctx.fillStyle = 'rgba(8,8,24,0.55)';
  ctx.fillRect(0, 0, VIEW.width, 64);
  ctx.fillStyle = COLORS.hud;
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.font = 'bold 13px system-ui, sans-serif';
  ctx.globalAlpha = 0.75;
  ctx.fillText('SCORE', 24, 18);
  ctx.fillText('BEST', 24, 46);
  ctx.globalAlpha = 1;
  ctx.font = 'bold 24px system-ui, sans-serif';
  ctx.fillText(String(world.score), 92, 19);
  ctx.font = 'bold 15px system-ui, sans-serif';
  ctx.globalAlpha = 0.75;
  ctx.fillText(String(Math.max(world.best, world.score)), 92, 46);
  ctx.globalAlpha = 1;

  // Wave + quota, centred.
  ctx.textAlign = 'center';
  ctx.font = 'bold 15px system-ui, sans-serif';
  ctx.fillText(`WAVE ${world.wave} / ${TOTAL_WAVES}`, 640, 18);
  const quotaTotal = 6 + world.wave * 2;
  const got = quotaTotal - world.quotaLeft;
  const barW = 260;
  const barX = 640 - barW / 2;
  ctx.fillStyle = 'rgba(245,238,218,0.25)';
  ctx.fillRect(barX, 34, barW, 10);
  ctx.fillStyle = COLORS.ember;
  ctx.fillRect(barX, 34, (barW * got) / quotaTotal, 10);
  ctx.font = '12px system-ui, sans-serif';
  ctx.globalAlpha = 0.85;
  ctx.fillText(`EMBERS ${got} / ${quotaTotal}`, 640, 56);
  ctx.globalAlpha = 1;

  // Flames, right.
  for (let i = 0; i < p.maxFlames; i += 1) {
    drawFlame(ctx, 1152 + i * 24, 22, i < p.flames);
  }
  if (p.shield) {
    ctx.fillStyle = '#8ef2ff';
    ctx.font = 'bold 12px system-ui, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText('SHIELD', 1256, 46);
  }

  // Combo meter under the top bar, left.
  if (world.combo > 1) {
    ctx.textAlign = 'left';
    ctx.font = 'bold 17px system-ui, sans-serif';
    ctx.fillStyle = '#ffd94d';
    ctx.fillText(`COMBO x${world.mult}  (${world.combo})`, 24, 92);
    const cw = 150;
    ctx.fillStyle = 'rgba(245,238,218,0.25)';
    ctx.fillRect(24, 102, cw, 6);
    ctx.fillStyle = '#ffd94d';
    ctx.fillRect(24, 102, cw * (world.comboTimer / p.comboWindow), 6);
  }

  // Dash readiness, bottom-left.
  const dashReady = p.dashCdLeft <= 0;
  ctx.textAlign = 'left';
  ctx.font = 'bold 12px system-ui, sans-serif';
  ctx.globalAlpha = 0.85;
  ctx.fillStyle = dashReady ? '#ffe9a8' : 'rgba(245,238,218,0.55)';
  ctx.fillText(dashReady ? 'DASH READY  [SPACE / CLICK]' : 'DASH …', 24, 696);
  ctx.globalAlpha = 1;
  if (!dashReady) {
    const dw = 110;
    ctx.fillStyle = 'rgba(245,238,218,0.25)';
    ctx.fillRect(24, 704, dw, 5);
    ctx.fillStyle = '#ffe9a8';
    ctx.fillRect(24, 704, dw * (1 - p.dashCdLeft / p.dashCooldown), 5);
  }

  // Active timed effects, bottom-right.
  ctx.textAlign = 'right';
  ctx.font = 'bold 12px system-ui, sans-serif';
  if (p.magnetUntil > world.time) {
    ctx.fillStyle = '#8ef2ff';
    ctx.fillText(`MAGNET ${Math.ceil(p.magnetUntil - world.time)}s`, 1256, 676);
  }
  if (p.hourglassUntil > world.time) {
    ctx.fillStyle = '#c9b8ff';
    ctx.fillText(`SLOW TIME ${Math.ceil(p.hourglassUntil - world.time)}s`, 1256, 696);
  }
  ctx.restore();
}

function drawBanner(ctx, world) {
  if (world.bannerTimer <= 0 || !world.banner) return;
  const a = Math.min(1, world.bannerTimer / 0.6, (2.2 - world.bannerTimer) / 0.3 + 0.2);
  ctx.save();
  ctx.globalAlpha = Math.max(0, Math.min(1, a));
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = 'bold 44px Georgia, serif';
  ctx.fillStyle = '#ffe9a8';
  ctx.shadowColor = 'rgba(255,179,71,0.8)';
  ctx.shadowBlur = 24;
  ctx.fillText(world.banner, 640, 300);
  ctx.restore();
}

function panel(ctx, x, y, w, h) {
  ctx.fillStyle = 'rgba(10,10,30,0.72)';
  ctx.strokeStyle = 'rgba(255,217,122,0.35)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 14);
  ctx.fill();
  ctx.stroke();
}

function button(ctx, rect, label, enabled = true) {
  ctx.save();
  ctx.fillStyle = enabled ? '#ffb347' : 'rgba(245,238,218,0.25)';
  ctx.beginPath();
  ctx.roundRect(rect.x, rect.y, rect.w, rect.h, 10);
  ctx.fill();
  ctx.fillStyle = enabled ? '#241a05' : 'rgba(245,238,218,0.6)';
  ctx.font = 'bold 19px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, rect.x + rect.w / 2, rect.y + rect.h / 2 + 1);
  ctx.restore();
}

function drawTitle(ctx, world) {
  ctx.save();
  ctx.fillStyle = 'rgba(6,6,20,0.62)';
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffe9a8';
  ctx.font = 'bold 92px Georgia, serif';
  ctx.shadowColor = 'rgba(255,179,71,0.9)';
  ctx.shadowBlur = 34;
  ctx.fillText('EMBERFALL', 640, 190);
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#c9b8ff';
  ctx.font = 'italic 26px Georgia, serif';
  ctx.fillText('Keeper of the Last Lantern', 640, 252);
  ctx.fillStyle = COLORS.hud;
  ctx.font = '17px system-ui, sans-serif';
  ctx.fillText('The dark sends its wisps. Gather the falling embers, clear all 10 waves,', 640, 316);
  ctx.fillText('and rekindle the dawn — before your last flame goes out.', 640, 342);
  ctx.font = '15px system-ui, sans-serif';
  ctx.globalAlpha = 0.9;
  ctx.fillText('Move — WASD / arrows or mouse      Dash (banishes wisps) — SPACE or click', 640, 402);
  ctx.fillText('P — pause      M — sound on/off      R — restart', 640, 428);
  ctx.globalAlpha = 1;
  if (world.best > 0) {
    ctx.font = 'bold 16px system-ui, sans-serif';
    ctx.fillStyle = '#ffd94d';
    ctx.fillText(`BEST SCORE  ${world.best}`, 640, 470);
  }
  button(ctx, TITLE_BUTTON, 'BEGIN THE KEEP');
  ctx.font = '13px system-ui, sans-serif';
  ctx.globalAlpha = 0.7;
  ctx.fillStyle = COLORS.hud;
  ctx.fillText('An original game — its art, sound and code were made for make.fun', 640, 612);
  ctx.restore();
}

function drawUpgrade(ctx, world) {
  ctx.save();
  ctx.fillStyle = 'rgba(6,6,20,0.6)';
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffe9a8';
  ctx.font = 'bold 46px Georgia, serif';
  ctx.fillText(`WAVE ${world.wave} CLEARED`, 640, 150);
  ctx.fillStyle = COLORS.hud;
  ctx.font = '19px system-ui, sans-serif';
  ctx.fillText(`Score ${world.score}   ·   Flames ${world.player.flames}/${world.player.maxFlames}`, 640, 200);
  ctx.font = 'bold 21px system-ui, sans-serif';
  ctx.fillText('Choose a blessing — press 1, 2 or 3, or click a card', 640, 248);
  world.blessings.forEach((b, i) => {
    const r = upgradeCardRect(i);
    panel(ctx, r.x, r.y, r.w, r.h);
    ctx.fillStyle = '#ffd94d';
    ctx.font = 'bold 15px system-ui, sans-serif';
    ctx.fillText(`BLESSING ${i + 1}`, r.x + r.w / 2, r.y + 34);
    ctx.fillStyle = '#ffe9a8';
    ctx.font = 'bold 25px Georgia, serif';
    ctx.fillText(b.name, r.x + r.w / 2, r.y + 78);
    ctx.fillStyle = COLORS.hud;
    ctx.font = '16px system-ui, sans-serif';
    const words = b.desc.split(' ');
    let line = '';
    let y = r.y + 128;
    for (const word of words) {
      if ((line + ' ' + word).trim().length > 26) {
        ctx.fillText(line.trim(), r.x + r.w / 2, y);
        y += 24;
        line = word;
      } else {
        line += ' ' + word;
      }
    }
    ctx.fillText(line.trim(), r.x + r.w / 2, y);
    ctx.fillStyle = 'rgba(245,238,218,0.6)';
    ctx.font = '13px system-ui, sans-serif';
    ctx.fillText(`press ${i + 1}`, r.x + r.w / 2, r.y + r.h - 26);
  });
  ctx.restore();
}

function drawPause(ctx) {
  ctx.save();
  ctx.fillStyle = 'rgba(6,6,20,0.66)';
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffe9a8';
  ctx.font = 'bold 54px Georgia, serif';
  ctx.fillText('PAUSED', 640, 250);
  ctx.fillStyle = COLORS.hud;
  ctx.font = '16px system-ui, sans-serif';
  ctx.fillText('WASD / arrows or mouse to move · SPACE or click to dash', 640, 310);
  button(ctx, PAUSE_RESUME_BUTTON, 'RESUME');
  button(ctx, PAUSE_QUIT_BUTTON, 'QUIT TO TITLE');
  ctx.restore();
}

function drawEnd(ctx, world, victory) {
  ctx.save();
  ctx.fillStyle = 'rgba(6,6,20,0.68)';
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = victory ? '#ffe9a8' : '#ff8a9a';
  ctx.font = 'bold 58px Georgia, serif';
  ctx.shadowColor = victory ? 'rgba(255,179,71,0.9)' : 'rgba(255,90,110,0.7)';
  ctx.shadowBlur = 26;
  ctx.fillText(victory ? 'DAWN REKINDLED' : 'THE LIGHT FADES', 640, 180);
  ctx.shadowBlur = 0;
  ctx.fillStyle = COLORS.hud;
  ctx.font = '18px system-ui, sans-serif';
  ctx.fillText(
    victory
      ? 'Ten waves weathered — the garden glows again. The Keeper did it.'
      : 'The last flame is out, and the wisps close in. The garden waits for another Keeper.',
    640, 238,
  );
  const rows = [
    ['SCORE', String(world.score)],
    ['BEST', String(world.best)],
    ['WAVE REACHED', victory ? '10 / 10' : `${world.wave} / ${TOTAL_WAVES}`],
    ['EMBERS GATHERED', String(world.collected)],
    ['WISPS BANISHED', String(world.banished)],
    ['TIME', fmtTime(world.time)],
  ];
  ctx.font = 'bold 16px system-ui, sans-serif';
  rows.forEach(([label, value], i) => {
    const y = 292 + i * 32;
    ctx.globalAlpha = 0.7;
    ctx.textAlign = 'right';
    ctx.fillText(label, 600, y);
    ctx.globalAlpha = 1;
    ctx.textAlign = 'left';
    ctx.fillText(value, 660, y);
  });
  button(ctx, END_AGAIN_BUTTON, 'PLAY AGAIN  (R)');
  button(ctx, END_TITLE_BUTTON, 'TITLE SCREEN');
  ctx.restore();
}

/** Draw one frame of the game for the world's current screen. */
export function drawWorld(ctx, world) {
  ctx.save();
  if (world.shake > 0) {
    ctx.translate((Math.random() * 2 - 1) * world.shake, (Math.random() * 2 - 1) * world.shake);
  }
  drawBackground(ctx, world);
  for (const e of world.embers) drawEmber(ctx, e, world.time);
  for (const pk of world.pickups) drawPickup(ctx, pk, world.time);
  for (const w of world.wisps) drawWisp(ctx, w, world.time);
  drawPlayer(ctx, world);
  drawParticles(ctx, world);
  drawFloaters(ctx, world);
  if (world.flash > 0) {
    ctx.fillStyle = `rgba(255,60,80,${world.flash * 0.32})`;
    ctx.fillRect(-20, -20, VIEW.width + 40, VIEW.height + 40);
  }
  // Low-flame warning vignette.
  if (world.player.flames === 1 && world.screen === SCREEN_PLAY) {
    const pulse = 0.1 + 0.07 * Math.sin(world.time * 4);
    const g = ctx.createRadialGradient(640, 360, 260, 640, 360, 640);
    g.addColorStop(0, 'rgba(255,60,80,0)');
    g.addColorStop(1, `rgba(255,60,80,${pulse})`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  }
  ctx.restore();

  if (world.screen === SCREEN_PLAY || world.screen === SCREEN_PAUSE) drawHud(ctx, world);
  drawBanner(ctx, world);
  if (world.screen === SCREEN_TITLE) drawTitle(ctx, world);
  if (world.screen === SCREEN_UPGRADE) drawUpgrade(ctx, world);
  if (world.screen === SCREEN_PAUSE) drawPause(ctx);
  if (world.screen === SCREEN_VICTORY) drawEnd(ctx, world, true);
  if (world.screen === SCREEN_OVER) drawEnd(ctx, world, false);
}
