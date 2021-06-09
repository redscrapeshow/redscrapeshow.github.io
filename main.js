/*
TODO: multiple galleries screen partition -- DONE
TODO: settings -- DONE
TODO: controls for mobile, settings for mobile -- DONE
TODO: settings <-> exhibition back and forth -- DONE
TODO: invalid subreddit selection notification -- DONE
TODO: fix the uneven galleries reverse last index behavior -- DONE
TODO: turn the main callback loop into an async loop -- DONE
TODO: structure and positioning css -- DONE
TODO: detect orientation changes and remake viewports accordingly -- DONE
TODO: redo checkboxes because those toggles are hideous -- DONE
TODO: transition to active state for button feel -- DONE
TODO: settings loading indicator in svg -- DONE
TODO: clean up exhibit with modularity -- DONE
TODO: apply google js style guide for functions and parameters -- DONE
TODO: complete rework of controls: -- DONE
    new exhibition layout -- DONE
    create UI elements and place them -- DONE
    bind UI elements to event handlers -- DONE
    handle caption toggling -- DONE
    new timer UI with svg and blackjack (c'est de la bite svg go canvas) -- DONE
    change toggle caption text content when activated -- DONE
    video control mode (yeah no not worth it + unsettling) -- DONE
    connect mouse controls -- DONE
    connect touch controls -- DONE
    connect keyboard controls -- DONE
    let's get graphic! (don't forget pseudo for timer) -- DONE
TODO: (?) hover to learn about controls -- DONE
TODO: remake settings flexbox to not suck so much -- DONE
TODO: color design -- DONE
TODO: see what we can do about flairs
TODO: what about scraping lighter img / video for mobile
TODO: timer for gfycat loading (clearTimeout)
TODO: mobile first responsive design
TODO: clean unneeded config items
TODO? documentation?
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
