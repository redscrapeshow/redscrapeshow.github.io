/*
*/

import {config} from './config.js';

const getLoadout = function() {
  const settings = {
    sortingMethod: '',
    sortingPeriod: '',
    shuffle: false,
    autoSkip: {enabled: false, timer: config.DEFAULT_AUTO_SKIP_TIMER},
    reverse: {enabled: false, range: 5, loop: false},
    imgOnly: false,
    noTrans: false,
    preloadRange: config.DEFAULT_PRELOAD_RANGE,
    videoSkip: 'loop',
  };
  const formData = new FormData(document.querySelector('#settings'));
  const data = new Map();
  for (const [name, value] of formData.entries()) {
    data.set(name, value);
  }
  const subreddits = [];
  for (let line of data.get('subreddits').split(/\n/)) {
    const subs = [];
    for (let item of line.split(/\s/)) {
      if (/^[A-Za-z0-9][A-Za-z0-9_]{2,20}$/.test(item)) {
        subs.push(item);
      }
    }
    if (subs.length > 0) {
      subreddits.push(subs);
    }
  }
  settings.sortingMethod = data.get('sortingMethod').toLowerCase();
  settings.sortingPeriod = data.get('sortingPeriod');
  settings.shuffle = data.has('shuffle');
  settings.autoSkip.enabled = data.has('skip');
  if ((n => isFinite(n) && Number(n) > 0)(data.get('timer'))) {
    settings.autoSkip.timer = Number(data.get('timer'));
  }
  settings.reverse.enabled = data.has('reverse');
  if ((n => isFinite(n) && Number.isInteger(Number(n)) && Number(n) > 1)(
      data.get('reverseStart'))) {
    settings.reverse.range = Number(data.get('reverseStart'));
  }
  settings.reverse.loop = data.has('reverseLoop');
  settings.imgOnly = data.has('imgOnly');
  settings.noTrans = data.has('noTrans');
  if ((n => isFinite(n) && Number.isInteger(Number(n)) && Number(n) >= 0)(
      data.get('preload'))) {
    settings.preloadRange = Number(data.get('preload'));
  }
  settings.videoSkip = data.get('videoSkip');
  return {settings, subreddits};
};

export {getLoadout};
