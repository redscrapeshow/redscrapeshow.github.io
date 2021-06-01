/*
*/

import {config} from './config.js';

let handler = undefined;

const goWoke = function(newHandler) {
  document.querySelector('#log').textContent = 'flappette';
  handler = newHandler;
  window.addEventListener('keydown', keydownHandler);
  const vp = document.querySelector('#main-viewport');
  vp.addEventListener('touchstart', touchStartHandler);
  vp.addEventListener('touchmove', touchMoveHandler);
};

const goSleep = function() {
  handler = undefined;
  window.removeEventListener('keydown', keydownHandler);
  const vp = document.querySelector('#main-viewport');
  vp.removeEventListener('touchstart', touchStartHandler);
  vp.removeEventListener('touchmove', touchMoveHandler);
};

const keydownHandler = function(event) {
  if (event.repeat) return;
  if (['ArrowDown', 'Down'].indexOf(event.key) !== -1) {
    handler('down');
  } else if (['ArrowUp', 'Up'].indexOf(event.key) !== -1) {
    handler('up');
  } else if (['ArrowRight', 'Right'].indexOf(event.key) !== -1) {
    handler('right');
  } else if (['ArrowLeft', 'Left'].indexOf(event.key) !== -1) {
    handler('left');
  } else if ([' ', 'Spacebar'].indexOf(event.key) !== - 1) {
    handler('togglePause');
  } else if (['Enter'].indexOf(event.key) !== -1) {
    handler('toggleTheater');
  } else if (['Backspace', 'Escape', 'Esc'].indexOf(event.key) !== -1) {
    handler('escape');
  }
};

const firstContact = {t: -Infinity, x: undefined, y: undefined};
let swiped = false;

const touchStartHandler = function(event) {
  swiped = false;
  firstContact.x = event.changedTouches[0].clientX;
  firstContact.y = event.changedTouches[0].clientY;
  if (performance.now() - firstContact.t < config.DOUBLE_TAP_INTERVAL_IN_MS) {
    handler('togglePause');
  }
  firstContact.t = performance.now();
};

const swipeThreshold = Math.min(window.innerHeight, window.innerWidth) *
    config.SWIPE_THRESHOLD_FRACTION;

const touchMoveHandler = function(event) {
  document.querySelector('#log').textContent = 'yay';
  if (swiped) return;
  const x = event.changedTouches[0].x;
  const y = event.changedTouches[0].y;
  document.querySelector('#log').textContent = `${x} ${y} ${firstContact.x} ${firstContact.y} ${swipeThreshold}`;
  if (Math.abs(y - firstContact.y) >= swipeThreshold) {
    swiped = true;
    handler(y > firstContact.y ? 'down' : 'up');
  } else if (Math.abs(x - firstContact.x) >= swipeThreshold) {
    swiped = true;
    handler(x > firstContact.x ? 'swipeRight' : 'swipeLeft');
  }
};

export {goWoke, goSleep};
