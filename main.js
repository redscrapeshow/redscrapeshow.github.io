/*
*/

import {config} from './config.js';
import {setVerbose as setScrapeVerbose} from './scrape.js';
import {setVerbose as setPreloadVerbose} from './preload.js';
import {loadTheShow, runTheShow} from './exhibit.js';
import {getLoadout, styleUpSettingsScreen} from './settings.js';

setScrapeVerbose(false);
setPreloadVerbose(false);

document.addEventListener('DOMContentLoaded', async () => {
  styleUpSettingsScreen();
  const settings = document.querySelector('.settings');
  const mainViewport = document.querySelector('.main-viewport');
  const invalidNotice = document.querySelector('#invalid-notice');
  const loadingIndicator = createLoadingIndicator();
  document.body.removeChild(mainViewport);
  while (true) {
    await asyncLaunch();
    loadingIndicator.waxOn();
    invalidNotice.style.display = 'none';
    const loadout = getLoadout();
    let state = undefined;
    try {
      state = await loadTheShow({
        settings: loadout.settings,
        subreddits: loadout.subreddits,
      });
    } catch (error) {
      if (error instanceof config.NoValidGalleryError) {
        console.warn(error);
        loadingIndicator.waxOff();
        invalidNotice.style.display = 'list-item';
        continue;
      } else {
        throw error;
      }
    }
    loadingIndicator.waxOff();
    document.body.removeChild(settings);
    document.body.appendChild(mainViewport);
    await runTheShow({state, settings: loadout.settings});
    document.body.removeChild(mainViewport);
    document.body.appendChild(settings);
    setTimeout(() => document.querySelector('textarea').focus(), 0);
  }
});

const asyncLaunch = () => new Promise(resolve => {
  const launchButton = document.querySelector('#launch');
  const launch = () => {
    document.removeEventListener('click', launch);
    resolve();
  };
  launchButton.addEventListener('click', launch);
});

const createLoadingIndicator = () => {
  const left = document.querySelector('#loading-left');
  const right = document.querySelector('#loading-right');
  left.appendChild(createLoadingSvg());
  right.appendChild(createLoadingSvg());
  const waxOn = () => {
    left.style.display = 'block';
    right.style.display = 'block';
  };
  const waxOff = () => {
    left.style.display = 'none';
    right.style.display = 'none';
  };
  return {waxOn, waxOff};
};

const points =
    pts => pts.reduce((r, pt, i) => r + (i === 0 ? '' : ' ') + ptToStr(pt), '');
const ptToStr = pt => `${pt.x * 100},${-pt.y * 100}`;
const polar = (r, th) => ({x: r * Math.cos(th), y: r * Math.sin(th)});

const createLoadingSvg = () => {
  const svg = document.createElementNS(config.XMLNS, 'svg');
  svg.style.display = 'block';
  svg.setAttribute('width', '100%');
  svg.setAttribute('height', '100%');
  svg.setAttribute('viewBox', '-100 -100 200 200');
  const big = document.createElementNS(config.XMLNS, 'polygon');
  big.setAttribute('points', points([
    polar(1, 0),
    polar(1, 2 * Math.PI / 3),
    polar(1, -2 * Math.PI / 3),
  ]));
  big.setAttribute('fill', 'none');
  big.classList.add('big');
  svg.appendChild(big);
  const little = document.createElementNS(config.XMLNS, 'polygon');
  little.setAttribute('points', points([
    polar(Math.cos(Math.PI / 3), Math.PI),
    polar(Math.cos(Math.PI / 3), Math.PI / 3),
    polar(Math.cos(Math.PI / 3), -Math.PI / 3),
  ]));
  little.setAttribute('fill', 'none');
  little.classList.add('little');
  svg.appendChild(little);
  return svg;
};
