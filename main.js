/*
TODO: multiple galleries screen partition -- DONE
TODO: settings -- DONE
TODO: controls for mobile, settings for mobile -- DONE
TODO: settings <-> exhibition back and forth -- DONE
TODO: invalid subreddit selection notification -- DONE
TODO: structure and positioning css
TODO: mobile first responsive design
TODO: on mobile, remove the double tap and swipe right / left interactions
  and replace them with unobstrusive buttons in a corner respecting orientation
  could put this buttons in html, and hide them with css media query
  if doing this, put buttons in separate div with higher z-index than main-vp
  that way, when we clean main-vp the buttons won't get destroyed
TODO: cancel swipe detection if user is using two fingers (eg zooming)
TODO: detect orientation changes and redistribute viewports accordingly
TODO: redo the indicator to use stroke + fill instead of shadows
TODO: color design
TODO: remove unneeded dosis weights from html head
TODO: see what we can do about flairs
TODO: what about scraping lighter img / video for mobile
TODO: timer for gfycat loading (clearTimeout)
TODO? comment code?
*/

import {config} from './config.js';
import {setVerbose as setScrapeVerbose} from './scrape.js';
import {setVerbose as setPreloadVerbose} from './preload.js';
import {runTheShow} from './exhibit.js';
import {getLoadout} from './settings.js';

setScrapeVerbose(true);
setPreloadVerbose(true);

window.addEventListener('load', () => {
  const settings = document.querySelector('#settings');
  const mainViewport = document.querySelector('#main-viewport');
  const launchButton = document.querySelector('#launch');
  const invalidNotice = document.querySelector('#invalid-input');
  document.body.removeChild(mainViewport);
  const cycle = async function() {
    launchButton.removeEventListener('click', cycle);
    invalidNotice.style.display = 'none';
    const loadout = getLoadout();
    let successful = false;
    await runTheShow(loadout, success => {
      successful = success;
      if (success) {
        document.body.removeChild(settings);
        document.body.appendChild(mainViewport);
      } else {
        invalidNotice.style.display = 'list-item';
      }
    });
    if (successful) {
      document.body.removeChild(mainViewport);
      document.body.appendChild(settings);
    }
    launchButton.addEventListener('click', cycle);
  }
  launchButton.addEventListener('click', cycle);
});
