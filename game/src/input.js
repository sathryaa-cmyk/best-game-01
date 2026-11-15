// Keyboard and mouse state, in the game's own 1280x720 coordinates.
// The canvas scales to the window, so mouse positions are converted here;
// `pressed` is edge-triggered (true only on the frame the key went down)
// and cleared by the main loop after each fixed step.
export class Input {
  constructor(canvas) {
    this.keys = new Set();
    this.pressed = new Set();
    this.mouse = { x: 640, y: 360, down: false, movedAt: -1, clicked: false };
    this._now = 0;
    window.addEventListener('keydown', (event) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(event.code)) event.preventDefault();
      if (!event.repeat) {
        this.keys.add(event.code);
        this.pressed.add(event.code);
      }
    });
    window.addEventListener('keyup', (event) => {
      this.keys.delete(event.code);
    });
    window.addEventListener('blur', () => {
      this.keys.clear();
      this.mouse.down = false;
    });
    canvas.addEventListener('pointermove', (event) => {
      const pos = this.toGame(event);
      this.mouse.x = pos.x;
      this.mouse.y = pos.y;
      this.mouse.movedAt = this._now;
    });
    canvas.addEventListener('pointerdown', (event) => {
      const pos = this.toGame(event);
      this.mouse.x = pos.x;
      this.mouse.y = pos.y;
      this.mouse.down = true;
      this.mouse.clicked = true;
      this.mouse.movedAt = this._now;
    });
    window.addEventListener('pointerup', () => {
      this.mouse.down = false;
    });
  }

  /** Advance the clock the mouse-freshness check reads. */
  tick(now) {
    this._now = now;
  }

  toGame(event) {
    const rect = event.target.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * 1280,
      y: ((event.clientY - rect.top) / rect.height) * 720,
    };
  }

  down(code) {
    return this.keys.has(code);
  }

  wasPressed(code) {
    return this.pressed.has(code);
  }

  /** The mouse steers only while it has moved recently. */
  mouseFresh(seconds = 3) {
    return this._now - this.mouse.movedAt < seconds;
  }

  /** -1, 0 or 1 on each axis from WASD or the arrow keys. */
  axis() {
    const left = this.down('ArrowLeft') || this.down('KeyA');
    const right = this.down('ArrowRight') || this.down('KeyD');
    const up = this.down('ArrowUp') || this.down('KeyW');
    const down = this.down('ArrowDown') || this.down('KeyS');
    return { x: (right ? 1 : 0) - (left ? 1 : 0), y: (down ? 1 : 0) - (up ? 1 : 0) };
  }

  endStep() {
    this.pressed.clear();
    this.mouse.clicked = false;
  }
}
