/*
*/

import {config} from './config.js';

export const MainUI = class {

  constructor({state, settings, timer}) {
    this.state = state;
    this.settings = settings;
    this.timer = timer;
    this.createdElements = [];
    this.callbackByButton = new Map();
    this.listenerByButton = new Map();
    this.positioner = document.createElement('div');
    this.positioner.className = 'ui-positioner';
    document.body.appendChild(this.positioner);
    this.createdElements.push(this.positioner);
    this.container = document.createElement('div');
    this.container.className = 'ui';
    this.positioner.appendChild(this.container);
    this.createdElements.push(this.container);
    if (settings.showNav) {
      this.swipeUpButton = this.addSimpleButton({
        name: 'swipe-up',
        symbol: config.SWIPE_UP,
      });
    }
    this.timerWidget = this.addSimpleButton({
      name: 'pause-resume-timer',
      symbol: '',
    });
    this.timerWidget.classList.add('timer-widget');
    if (settings.showNav) {
      this.swipeDownButton = this.addSimpleButton({
        name: 'swipe-down',
        symbol: config.SWIPE_DOWN,
      });
      this.toggleCaptionButton = this.addSimpleButton({
        name: 'toggle-caption',
        symbol: config.HIDE_CAPTION,
      });
      this.settingsButton = this.addSimpleButton({
        name: 'back-to-settings',
        symbol: config.BACK_TO_SETTINGS,
      });
    }
    if (settings.reverse.enabled) this.createRoundIndicator();
    this.drawing = false;
    this.progressing = false;
    this.underTimer = false;
    this.loading = false;
    const style = window.getComputedStyle(document.body);
    this.colorWhite = style.getPropertyValue('--white');
    this.colorBlack = style.getPropertyValue('--black');
    this.colorGrey = style.getPropertyValue('--grey');
    this.colorPrimary = style.getPropertyValue('--primary');
    this.colorPrimaryLight = style.getPropertyValue('--primary-light');
    this.colorSecondary = style.getPropertyValue('--secondary');
    this.colorSecondaryLight = style.getPropertyValue('--secondary-light');
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d');
    this.timerWidget.appendChild(this.canvas);
    this.resizeListener = () => void this.requestDraw();
    this.resizeListener();
    window.addEventListener('resize', this.resizeListener);
    this.hovered = false;
    this.active = false;
    this.activeTimeout = undefined;
    this.hoverListener = () => void this.hoverTimerWidget();
    this.unhoverListener = () => void this.unhoverTimerWidget();
    this.activeListener = () => void this.activeTimerWidget();
    this.timerWidget.addEventListener('mouseover', this.hoverListener);
    this.timerWidget.addEventListener('mouseout', this.unhoverListener);
    this.timerWidget.addEventListener('click', this.activeListener);
  }
  
  destroy() {
    this.progressing = false;
    this.loading = false;
    window.removeEventListener('resize', this.resizeListener);
    this.timerWidget.removeEventListener('mouseover', this.hoverListener);
    this.timerWidget.removeEventListener('mouseout', this.unhoverListener);
    this.timerWidget.removeEventListener('click', this.activeListener);
    for (const [button, listener] of this.listenerByButton) {
      button.removeEventListener('click', listener);
    }
    for (const element of this.createdElements) {
      element.parentNode.removeChild(element);
    }
  }
  
  launchTimer() {
    this.progressing = true;
    this.underTimer = true;
    this.requestDraw();
  }
  
  stopTimer() {
    this.progressing = false;
    this.underTimer = false;
    this.requestDraw();
  }
  
  toggleTimer() {
    this.progressing = !this.progressing;
    if (this.progressing) this.underTimer = true;
    this.requestDraw();
  }
  
  startLoading() {
    this.loading = true;
    this.requestDraw();
  }
  
  stopLoading() {
    this.loading = false;
    this.requestDraw();
  }
  
  refreshRoundNumber() {
    if (!this.settings.reverse.enabled) return;
    const roundSize =
        (this.state.reverseStartIndex + 1) / this.settings.reverse.range;
    const roundNumber = Math.ceil((this.state.currentIndex + 1) / roundSize);
    let text = `#${roundNumber}`;
    if (roundSize > 1) {
      const positionInRound = this.state.currentIndex % roundSize + 1;
      text += `<span style="margin-left:.25em"><sup>${positionInRound}</sup>` +
          `⁄<sub>${roundSize}</sub></span>`;
    }
    this.roundIndicator.innerHTML = text;
  }
  
  toggleToggleCaptionSymbol() {
    if (this.toggleCaptionButton.textContent === config.SHOW_CAPTION) {
      this.toggleCaptionButton.textContent = config.HIDE_CAPTION;
    } else if (this.toggleCaptionButton.textContent === config.HIDE_CAPTION) {
      this.toggleCaptionButton.textContent = config.SHOW_CAPTION;
    }
  }
  
  addSimpleButton({name, symbol}) {
    const button = document.createElement('button');
    button.setAttribute('name', name);
    button.textContent = symbol;
    this.container.appendChild(button);
    this.createdElements.push(button);
    this.callbackByButton.set(button, () => {});
    this.listenerByButton.set(button,
        () => this.callbackByButton.get(button)());
    button.addEventListener('click', this.listenerByButton.get(button));
    return button;
  }
  
  createRoundIndicator() {
    this.roundIndicator = document.createElement('div');
    this.roundIndicator.className = 'round-number';
    this.container.appendChild(this.roundIndicator);
    this.createdElements.push(this.roundIndicator);
    this.refreshRoundNumber();
  }
  
  hoverTimerWidget() {
    this.hovered = true;
    this.requestDraw();
  }
  
  unhoverTimerWidget() {
    this.hovered = false;
    this.requestDraw();
  }
  
  activeTimerWidget() {
    if (this.activeTimeout !== undefined) clearTimeout(this.activeTimeout);
    this.active = true;
    this.requestDraw();
    this.activeTimeout = setTimeout(() => {
      this.active = false;
      this.requestDraw();
      this.activeTimeout = undefined;
    }, 100);
  }
  
  draw() {
    if (this.canvas.width !== this.timerWidget.clientWidth ||
        this.canvas.height !== this.timerWidget.clientHeight) {
      this.canvas.width = this.timerWidget.clientWidth;
      this.canvas.height = this.timerWidget.clientHeight;
      this.ctx.lineCap = 'round';
      this.ctx.lineJoin = 'round';
    }
    const w = this.canvas.width;
    const h = this.canvas.height;
    this.ctx.clearRect(0, 0, w, h);
    if (this.loading) {
      const barW = Math.max(Math.round(w / 10), 1);
      const barX = barW % 2 === 0 ? Math.round(w / 2) : Math.floor(w / 2) + .5;
      const cycle = config.LOADING_CYCLE_DURATION * 1000;
      const ease = config.LOADING_EASE_IN_OUT;
      const f = t => ease((t => t < 1/2 ? 2 * t : 2 * (1 - t))(t));
      const t1 = f((performance.now() % cycle) / cycle);
      const t2 = f(((performance.now() - cycle / 10) % cycle) / cycle);
      const size = h / 2;
      this.ctx.beginPath();
      this.ctx.moveTo(barX, size * t1 + (h - size) / 2);
      this.ctx.lineTo(barX, size * t2 + (h - size) / 2);
      this.ctx.strokeStyle = this.colorWhite;
      this.ctx.globalAlpha = .5;
      this.ctx.lineWidth = barW + 1;
      this.ctx.stroke();
      this.ctx.strokeStyle = this.colorPrimary;
      this.ctx.globalAlpha = 1;
      this.ctx.lineWidth = barW;
      this.ctx.stroke();
    } else if (this.underTimer) {
      const inner = this.active ? this.colorSecondary :
          this.hovered ? this.colorPrimaryLight : this.colorPrimary;
      const t = this.timer.progress();
      const barW = Math.max(Math.round(w / 10), 1);
      const barX = barW % 2 === 0 ? Math.round(w / 2) : Math.floor(w / 2) + .5;
      const startY = (barW + 1) / 2;
      this.ctx.beginPath();
      this.ctx.moveTo(barX, startY);
      this.ctx.lineTo(barX, startY + t * (h - 2 * startY));
      this.ctx.strokeStyle = this.colorWhite;
      this.ctx.globalAlpha = .5;
      this.ctx.lineWidth = barW + 1;
      this.ctx.stroke();
      this.ctx.strokeStyle = inner;
      this.ctx.globalAlpha = 1;
      this.ctx.lineWidth = barW;
      this.ctx.stroke();
      const t0 = 1 - config.TRANSITION_DURATION * 2000 / this.timer.duration;
      const u = Math.max(0, (t - t0) / (1 - t0));
      const minR = barW * 1.5;
      const maxR = barW * 2.25;
      const r = minR + Math.pow(u, 5) * (maxR - minR);
      this.ctx.beginPath();
      this.ctx.arc(barX, h - maxR - 2, r, 0, 2 * Math.PI);
      this.ctx.strokeStyle = this.colorWhite;
      this.ctx.globalAlpha = .5;
      this.ctx.lineWidth = 2;
      this.ctx.stroke();
      this.ctx.fillStyle = inner;
      this.ctx.globalAlpha = 1;
      this.ctx.fill();
    }
    this.drawing = false;
    if (this.loading || this.progressing) this.requestDraw();
  }
  
  requestDraw() {
    if (!this.drawing) {
      this.drawing = true;
      window.requestAnimationFrame(() => this.draw());
    }
  }

};
