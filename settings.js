/*
*/

import {config} from './config.js';

export const getLoadout = () => {
  const settings = {
    sortingMethod: '',
    sortingPeriod: '',
    shuffle: false,
    autoSkip: {enabled: false, timer: config.DEFAULT_AUTO_SKIP_TIMER},
    reverse: {enabled: false, range: 5, loop: false},
    imgOnly: false,
    showNav: true,
    noTrans: false,
    preloadRange: config.DEFAULT_PRELOAD_RANGE,
    videoSkip: 'loop',
  };
  const formData = new FormData(document.querySelector('.settings'));
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
  settings.sortingPeriod =
      data.has('sortingPeriod') ? data.get('sortingPeriod') : '';
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
  settings.showNav = data.has('showNav');
  settings.noTrans = data.has('noTrans');
  if ((n => isFinite(n) && Number.isInteger(Number(n)) && Number(n) >= 0)(
      data.get('preload'))) {
    settings.preloadRange = Number(data.get('preload'));
  }
  settings.videoSkip = data.get('videoSkip');
  return {settings, subreddits};
};

export const styleUpSettingsScreen = () => {
  const textArea = document.querySelector('textarea');
  const adjust = () => textArea.rows = textArea.value.split('\n').length;
  adjust();
  textArea.addEventListener('input', adjust);
  const sortingMethod = document.querySelector('select[name=sortingMethod]');
  const sortingPeriod = document.querySelector('select[name=sortingPeriod]');
  const updateSortingPeriodStatus = () => {
    if (['top', 'controversial'].indexOf(sortingMethod.value) !== -1) {
      sortingPeriod.parentNode.classList.remove('period-disabled');
      sortingPeriod.disabled = false;
    } else {
      sortingPeriod.parentNode.classList.add('period-disabled');
      sortingPeriod.disabled = true;
    }
  };
  updateSortingPeriodStatus();
  sortingMethod.addEventListener('input', updateSortingPeriodStatus);
  let advanced = false;
  const toggleAdvanced = () => {
    advanced = !advanced;
    document.querySelector('#advanced-options').className =
        advanced ? 'advanced-visible' : 'advanced-hidden';
  };
  document.querySelector('#advanced').addEventListener('click', toggleAdvanced);
  if (window.matchMedia('(hover: hover)').matches) {
    document.querySelector('.keyboard-help').style.display = 'block';
    document.querySelector('input[name="showNav"]').removeAttribute('checked');
  }
};
