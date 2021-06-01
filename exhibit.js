/*
for viewports https://mathoverflow.net/questions/206166/
breaking-a-rectangle-into-smaller-rectangles-with-small-diagonals/206254#206254
*/

import {config} from './config.js';
import {Gallery} from './collect.js';
import {Display} from './display.js';
import {Skipper} from './skip.js';
import {goWoke, goSleep} from './sense.js';

let closed = true;
let settings = undefined;
let goBack = undefined;
const artworkByGalleryByIndex = new Map();
let displayByGallery = new Map();
let currentIndex = 0;
let reverseStartIndex = undefined;
let loading = false;
let skipper = undefined;
let theater = false;

const runTheShow = async function(loadout, _goBack) {
  closed = false;
  settings = loadout.settings;
  goBack = _goBack;
  setLoading(true);
  await setUpGalleries(loadout.subreddits);
  if (artworkByGalleryByIndex.get(0).size === 0) {
    setLoading(false);
    artworkByGalleryByIndex.clear();
    goBack();
    goBack = undefined;
    return;
  }
  setUpDisplays();
  await displayFirstArtworks();
  setLoading(false);
  refreshPreloadRange();
  skipper = new Skipper(settings, [...displayByGallery.values()], proceed);
  if (settings.autoSkip.enabled) skipper.start();
  const eventHandlers = {
    'down': () => proceed(1),
    'up': () => proceed(-1),
    'right': () => proceed(settings.reverse.enabled ? -1 : 1),
    'left': () => proceed(settings.reverse.enabled ? 1 : -1),
    'togglePause': () => skipper.toggle(),
    'toggleTheater': () => (theater ? goRegular : goTheater)(),
    'swipeRight': goTheater,
    'swipeLeft': () => (theater ? goRegular : closeTheShow)(),
    'escape': closeTheShow,
  };
  goWoke(event => void eventHandlers[event]());
};

const closeTheShow = function(eventHandler) {
  closed = true;
  goSleep();
  settings = undefined;
  loading = false;
  currentIndex = 0;
  reverseStartIndex = undefined;
  theater = false;
  skipper.destroy();
  skipper = undefined;
  for (const artworkByGallery of artworkByGalleryByIndex.values()) {
    artworkByGallery.clear();
  }
  artworkByGalleryByIndex.clear();
  for (const [gallery, display] of displayByGallery) {
    display.close();
    gallery.close();
  }
  displayByGallery.clear();
  const mainVP = document.querySelector('#main-viewport');
  while (mainVP.firstChild) {
    mainVP.removeChild(mainVP.firstChild);
  }
  goBack();
  goBack = undefined;
};

const setUpGalleries = async function(subredditList) {
  artworkByGalleryByIndex.set(0, new Map());
  const galleries = subredditList.map(line => new Gallery(line, settings));
  for (const gallery of galleries) {
    artworkByGalleryByIndex.get(0).set(gallery, gallery.getArtwork(0));
  }
  const firstLoadResults =
      await Promise.allSettled([...artworkByGalleryByIndex.get(0).values()]);
  for (let i = 0; i < firstLoadResults.length; i++) {
    if (firstLoadResults[i].status === 'rejected') {
      console.warn(firstLoadResults[i].reason);
      artworkByGalleryByIndex.get(0).delete(galleries[i]);
    }
  }
  void galleries.splice(0, galleries.length);
};

const setUpDisplays = function() {
  const galleries = [...artworkByGalleryByIndex.get(0).keys()];
  if (galleries.length === 1) {
    return displayByGallery.set(
        galleries[0], new Display(document.querySelector('#main-viewport')));
  }
  let rows = Math.floor(Math.sqrt(galleries.length));
  let columns = Math.floor(Math.sqrt(galleries.length));
  if (!Number.isInteger(Math.sqrt(galleries.length))) columns++;
  if (rows * columns < galleries.length) rows++;
  const deficientRows = rows * columns - galleries.length;
  const rowH = 1 / rows;
  const landscape = window.innerWidth >= window.innerHeight;
  let i = 0;
  for (let row = 0; row < rows; row++) {
    const nColumns = row < deficientRows ? columns - 1 : columns;
    for (let column = 0; column < nColumns; column++) {
      let vp = undefined;
      const colW = row < deficientRows ? 1 / (columns - 1) : 1 / columns;
      if (landscape) {
        vp = createViewport(column * colW, row * rowH, colW, rowH);
      } else {
        vp = createViewport(row * rowH, column * colW, rowH, colW);
      }
      displayByGallery.set(galleries[i], new Display(vp));
      i += 1;
    }
  }
};

const createViewport = function(x, y, w, h) {
  const vp = document.createElement('div');
  document.querySelector('#main-viewport').appendChild(vp);
  vp.style.position = 'absolute';
  vp.style.overflow = 'hidden';
  vp.style.left = `${x * 100}%`;
  vp.style.right = `${(1 - (x + w)) * 100}%`;
  vp.style.top = `${y * 100}%`;
  vp.style.bottom = `${(1 - (y + h)) * 100}%`;
  return vp;
};

const displayFirstArtworks = async function() {
  if (settings.reverse.enabled) {
    const firstGallery = [...displayByGallery.keys()][0];
    const lastArtworkFirstGallery =
        firstGallery.getLastArtworkOfRound(settings.reverse.range - 1);
    reverseStartIndex = (await lastArtworkFirstGallery).index;
    for (let i = 1; i <= reverseStartIndex; i++) {
      artworkByGalleryByIndex.set(i, new Map());
      for (const gallery of displayByGallery.keys()) {
        artworkByGalleryByIndex.get(i).set(gallery, gallery.getArtwork(i));
      }
    }
    const lastArtworks = await Promise.allSettled(
        [...artworkByGalleryByIndex.get(reverseStartIndex).values()]);
    for (let i = 0; i < lastArtworks.length; i++) {
      const display = [...displayByGallery.values()][i];
      display.setRound(settings.reverse.range);
      display.changeArtwork(
          lastArtworks[i].value, settings.noTrans ? '' : 'slide-down');
    }
    currentIndex = reverseStartIndex;
  } else {
    for (const [gallery, artwork] of artworkByGalleryByIndex.get(0)) {
      displayByGallery.get(gallery).changeArtwork(
          await artwork, settings.noTrans ? '' : 'slide-up');
    }
    currentIndex = 0;
  }
};

const refreshPreloadRange = async function() {
  if (closed) return;
  const forward = [];
  const backward = [];
  for (let i = 1; i <= settings.preloadRange; i++) {
    forward.push(currentIndex + i);
    if (currentIndex - i >= 0) {
      backward.push(currentIndex - i);
    } else if (settings.reverse.enabled && settings.reverse.loop) {
      let negativeIndex = currentIndex - i;
      while (negativeIndex < 0) {
        negativeIndex += (reverseStartIndex + 1);
      }
      backward.push(negativeIndex);
    }
  }
  const preloadIndexes = settings.reverse.enabled ?
      [...backward, ...forward] : [...forward, ...backward];
  const furthestIndex = Math.max(...artworkByGalleryByIndex.keys());
  for (let n = 0; n <= furthestIndex; n++) {
    if (n === currentIndex || preloadIndexes.indexOf(n) !== -1) continue;
    if (artworkByGalleryByIndex.has(n)) {
      const nthArtworkByGallery = artworkByGalleryByIndex.get(n);
      artworkByGalleryByIndex.delete(n);
      for (const [gallery, artwork] of nthArtworkByGallery) {
        displayByGallery.get(gallery).unload(artwork);
        gallery.unloadMediaOfArtwork(n);
      }
    }
  }
  for (const index of preloadIndexes) {
    if (!artworkByGalleryByIndex.has(index)) {
      const artworkByGallery = new Map();
      for (const gallery of displayByGallery.keys()) {
        artworkByGallery.set(gallery, gallery.getArtwork(index));
      }
      artworkByGalleryByIndex.set(index, artworkByGallery);
    }
    const preloadedArtworks = await Promise.allSettled(
        [...artworkByGalleryByIndex.get(index).values()]);
    if (closed) return;
    if (!artworkByGalleryByIndex.get(index)) return;
    for (let i = 0; i < preloadedArtworks.length; i++) {
      const gallery = [...artworkByGalleryByIndex.get(index).keys()][i];
      displayByGallery.get(gallery).preload(preloadedArtworks[i].value);
    }
  }
};

let summedUpChange = 0;
let proceeding = false;
const proceed = async function(change) {
  if (closed) return;
  summedUpChange += change;
  if (proceeding) return;
  proceeding = true;
  skipper.stop();
  setLoading(true);
  const indexBeforeProceeding = currentIndex;
  const newArtworkByGallery = new Map();
  while (summedUpChange !== 0) {
    const change = summedUpChange;
    currentIndex += change;
    if (currentIndex < 0) {
      if (settings.reverse.enabled && settings.reverse.loop) {
        while (currentIndex < 0) {
          currentIndex += (reverseStartIndex + 1);
        }
      } else {
        currentIndex = 0;
      }
    }
    if (!artworkByGalleryByIndex.has(currentIndex)) {
      artworkByGalleryByIndex.set(currentIndex, new Map());
      const currentArtworkByGallery = artworkByGalleryByIndex.get(currentIndex);
      for (const gallery of displayByGallery.keys()) {
        currentArtworkByGallery.set(gallery, gallery.getArtwork(currentIndex));
      }
    }
    const newArtworks = await Promise.allSettled(
        [...artworkByGalleryByIndex.get(currentIndex).values()]);
    if (closed) return;
    for (let i = 0; i < newArtworks.length; i++) {
      newArtworkByGallery.set(
          [...artworkByGalleryByIndex.get(currentIndex).keys()][i],
          newArtworks[i].value);
    }
    summedUpChange -= change;
  }
  for (const [gallery, display] of displayByGallery) {
    const newArtwork = newArtworkByGallery.get(gallery);
    if (newArtwork.index > indexBeforeProceeding) {
      display.changeArtwork(newArtwork, settings.noTrans ? '' : 'slide-up');
    } else if (newArtwork.index < indexBeforeProceeding) {
      display.changeArtwork(newArtwork, settings.noTrans ? '' : 'slide-down');
    }
  }
  refreshPreloadRange(displayByGallery);
  proceeding = false;
  setLoading(false);
  if (settings.reverse.enabled) {
    updateRoundNumber();
    if (!settings.reverse.loop && currentIndex == 0) {
      skipper.disable();
    }
  }
  skipper.start();
};

const setLoading = function(l) {
  loading = l;
  if (loading) {
    window.requestAnimationFrame(function updateLoading() {
      if (closed) return;
      for (const display of displayByGallery.values()) {
        display.setLoading(loading);
        display.drawIndicator();
      }
      if (loading) window.requestAnimationFrame(updateLoading);
    });
  }
};

const updateRoundNumber = function() {
  const roundIndex =
      [...displayByGallery.keys()][0].roundIndexOfNthArtwork(currentIndex);
  for (const display of displayByGallery.values()) {
    display.setRound(roundIndex + 1);
  }
};

const goTheater = function() {
  theater = true;
  for (const display of displayByGallery.values()) {
    display.goTheater();
  }
};

const goRegular = function() {
  theater = false;
  for (const display of displayByGallery.values()) {
    display.goRegular();
  }
};

export {runTheShow};
