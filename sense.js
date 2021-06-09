/*
*/

import {config} from './config.js';

export const goWoke = ({eventHandler, timer, ui}) => {
  const listeners = {
    keydown: createKeydownListener({eventHandler}),
    touchStart: undefined,
    touchMove: undefined,
  };
  const swipeListeners = createSwipeListeners({eventHandler});
  listeners.touchStart = swipeListeners.touchStartListener;
  listeners.touchMove = swipeListeners.touchMoveListener;
  window.addEventListener('keydown', listeners.keydown);
  const viewport = document.querySelector('.main-viewport');
  viewport.addEventListener('touchstart', listeners.touchStart);
  viewport.addEventListener('touchmove', listeners.touchMove);
  timer.callback = () => void eventHandler.handle('right');
  const actionByButtonName = new Map();
  actionByButtonName.set('swipe-up', 'up');
  actionByButtonName.set('swipe-down', 'down');
  actionByButtonName.set('pause-resume-timer', 'togglePause');
  actionByButtonName.set('toggle-caption', 'toggleCaption');
  actionByButtonName.set('back-to-settings', 'escape');
  for (const button of ui.callbackByButton.keys()) {
    const action = actionByButtonName.get(button.name);
    ui.callbackByButton.set(button, () => void eventHandler.handle(action));
  }
  return listeners;
};

export const goSleep = function({eventListeners}) {
  window.removeEventListener('keydown', eventListeners.keydown);
  const vp = document.querySelector('.main-viewport');
  vp.removeEventListener('touchstart', eventListeners.touchStart);
  vp.removeEventListener('touchmove', eventListeners.touchMove);
};

const createKeydownListener = ({eventHandler}) => event => {
  if (event.repeat) return;
  if (['ArrowDown', 'Down'].indexOf(event.key) !== -1) {
    eventHandler.handle('down');
  } else if (['ArrowUp', 'Up'].indexOf(event.key) !== -1) {
    eventHandler.handle('up');
  } else if (['ArrowRight', 'Right'].indexOf(event.key) !== -1) {
    eventHandler.handle('right');
  } else if (['ArrowLeft', 'Left'].indexOf(event.key) !== -1) {
    eventHandler.handle('left');
  } else if ([' ', 'Spacebar'].indexOf(event.key) !== - 1) {
    eventHandler.handle('togglePause');
  } else if (['Enter'].indexOf(event.key) !== -1) {
    eventHandler.handle('toggleCaption');
  } else if (['Backspace', 'Escape', 'Esc'].indexOf(event.key) !== -1) {
    eventHandler.handle('escape');
  }
};

const createSwipeListeners = ({eventHandler}) => {
  const swipeThreshold = window.innerHeight * config.SWIPE_THRESHOLD_FRACTION;
  let firstContactY = undefined;
  let swiped = false;
  let complex = false;
  return {
    touchStartListener(event) {
      if (event.touches.length > 1) return complex = true;
      complex = false;
      swiped = false;
      firstContactY = event.touches[0].clientY;
    },
    touchMoveListener(event) {
      if (swiped || complex) return;
      const y = event.touches[0].clientY;
      if (Math.abs(y - firstContactY) >= swipeThreshold) {
        swiped = true;
        eventHandler.handle(y < firstContactY ? 'down' : 'up');
      }
    },
  };
};
