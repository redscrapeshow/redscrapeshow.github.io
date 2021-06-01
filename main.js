/*
TODO: multiple galleries screen partition -- DONE
TODO: settings -- DONE
TODO: settings <-> exhibition back and forth -- DONE
TODO: color design + css
TODO: see what we can do about flairs
TODO: what about scraping lighter img / video for mobile
TODO: controls for mobile, settings for mobile -- DONE
TODO: timer for gfycat loading (clearTimeout)
*/

import {config} from './config.js';
import {setVerbose as setScrapeVerbose} from './scrape.js';
import {setVerbose as setPreloadVerbose} from './preload.js';
import {runTheShow} from './exhibit.js';
import {getLoadout} from './settings.js';

setScrapeVerbose(true);
setPreloadVerbose(true);

const launchApp = function() {
  document.querySelector('#settings').style.visibility = 'visible';
  document.querySelector('#main-viewport').style.visibility = 'hidden';
  document.querySelector('#launch').addEventListener('click', function run() {
    document.querySelector('#launch').removeEventListener('click', run);
    document.querySelector('#settings').style.visibility = 'hidden';
    document.querySelector('#main-viewport').style.visibility = 'visible';
    runTheShow(getLoadout(), launchApp);
  });
};

window.addEventListener('load', launchApp);
