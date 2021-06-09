/*
*/

import {config} from './config.js';
import {Gallery} from './collect.js';
import {Display} from './display.js';
import {Timer} from './timer.js';
import {MainUI} from './exhibit-ui.js';
import {createViewports} from './viewport.js';
import {goWoke, goSleep} from './sense.js';

export const loadTheShow = async ({settings, subreddits}) => {
  const state = {
    artworkByGalleryByIndex: new Map(),
    closed: undefined,
    currentIndex: undefined,
    displayByGallery: undefined,
    reverseStartIndex: undefined,
  };
  await setUpGalleries({state, settings, subreddits});
  if (state.artworkByGalleryByIndex.get(0).size === 0) {
    state.artworkByGalleryByIndex.clear();
    throw new config.NoValidGalleryError();
  }
  if (settings.reverse.enabled) await loadLastArtworks({state, settings});
  return state;
};

export const runTheShow = async ({state, settings}) => {
  state.closed = false;
  setUpDisplays({state});
  await displayFirstArtworks({state, settings});
  refreshPreloadRange({state, settings});
  const timer = new Timer({settings});
  const ui = new MainUI({state, settings, timer});
  const eventHandler = createEventHandler({state, settings, timer, ui});
  const eventListeners = goWoke({eventHandler, timer, ui});
  if (settings.autoSkip.enabled) {
    timer.start({state});
    ui.launchTimer();
  }
  return new Promise(resolve => void eventHandler.setClosingSequence(() => {
    state.closed = true;
    goSleep({eventListeners});
    ui.destroy();
    timer.disable();
    for (const stashes of state.artworkByGalleryByIndex.values()) {
      stashes.clear();
    }
    state.artworkByGalleryByIndex.clear();
    for (const [gallery, display] of state.displayByGallery) {
      display.close();
      gallery.close();
    }
    state.displayByGallery.clear();
    resolve();
  }));
};

const setUpGalleries = async ({state, settings, subreddits}) => {
  state.artworkByGalleryByIndex.set(0, new Map());
  const galleries =
      subreddits.map(line => new Gallery({subreddits: line, settings}));
  for (const gallery of galleries) {
    state.artworkByGalleryByIndex.get(0).set(gallery, gallery.getArtwork(0));
  }
  const firstPromises = [...state.artworkByGalleryByIndex.get(0).values()];
  const firstLoadResults = await Promise.allSettled(firstPromises);
  for (let i = 0; i < firstLoadResults.length; i++) {
    if (firstLoadResults[i].status === 'rejected') {
      console.warn(firstLoadResults[i].reason);
      state.artworkByGalleryByIndex.get(0).delete(galleries[i]);
    }
  }
};

const loadLastArtworks = async ({state, settings}) => {
  const reverseStartArtworks = [];
  for (const gallery of state.artworkByGalleryByIndex.get(0).keys()) {
    reverseStartArtworks.push(
        gallery.getLastArtworkOfRound(settings.reverse.range - 1));
  }
  const lastIndexes =
      (await Promise.all(reverseStartArtworks)).map(artwork => artwork.index);
  state.reverseStartIndex = Math.max(...lastIndexes);
  for (let i = 1; i <= state.reverseStartIndex; i++) {
    state.artworkByGalleryByIndex.set(i, new Map());
    for (const gallery of state.artworkByGalleryByIndex.get(0).keys()) {
      state.artworkByGalleryByIndex.get(i).set(gallery, gallery.getArtwork(i));
    }
  }
  return Promise.all(
      [...state.artworkByGalleryByIndex.get(state.reverseStartIndex).values()]);
};

const setUpDisplays = ({state}) => {
  state.displayByGallery = new Map();
  const galleries = [...state.artworkByGalleryByIndex.get(0).keys()];
  const vps = createViewports({quantity: galleries.length});
  for (let i = 0; i < galleries.length; i++) {
    state.displayByGallery.set(galleries[i], new Display({viewport: vps[i]}));
  }
};

const displayFirstArtworks = async ({state, settings}) => {
  const animation = settings.noTrans ? '' :
      settings.reverse.enabled ? 'slide-down' : 'slide-up';
  state.currentIndex = settings.reverse.enabled ? state.reverseStartIndex : 0;
  for (const [gallery, artwork] of
      state.artworkByGalleryByIndex.get(state.currentIndex)) {
    const display = state.displayByGallery.get(gallery);
    display.changeArtwork({artwork: await artwork, animation});
  }
};

const resolveCurrentArtworks = async ({state}) => {
  if (!state.artworkByGalleryByIndex.has(state.currentIndex)) {
    state.artworkByGalleryByIndex.set(state.currentIndex, new Map());
    for (const gallery of state.displayByGallery.keys()) {
      state.artworkByGalleryByIndex.get(state.currentIndex).set(
        gallery, gallery.getArtwork(state.currentIndex));
    }
  }
  const resolvedArtworks = await Promise.all(
      [...state.artworkByGalleryByIndex.get(state.currentIndex).values()]);
  const galleries = [...state.displayByGallery.keys()];
  const resolvedArtworkByGallery = new Map();
  for (let i = 0; i < resolvedArtworks.length; i++) {
    resolvedArtworkByGallery.set(galleries[i], resolvedArtworks[i]);
  }
  return resolvedArtworkByGallery;
};

const refreshPreloadRange = async ({state, settings}) => {
  if (state.closed) return;
  const preloadSequence = determinePreloadIndexes({state, settings});
  const unloadSequence = determineUnloadIndexes({state, preloadSequence});
  for (const i of unloadSequence) {
    if (state.artworkByGalleryByIndex.has(i)) {
      for (const [gallery, artwork] of state.artworkByGalleryByIndex.get(i)) {
        state.displayByGallery.get(gallery).unload({artwork});
        gallery.unloadMediaOfArtwork(i);
      }
      state.artworkByGalleryByIndex.delete(i);
    }
  }
  for (const i of preloadSequence) {
    if (!state.artworkByGalleryByIndex.has(i)) {
      state.artworkByGalleryByIndex.set(i, new Map());
      for (const gal of state.displayByGallery.keys()) {
        state.artworkByGalleryByIndex.get(i).set(gal, gal.getArtwork(i));
      }
    }
    const artworkPromises = [...state.artworkByGalleryByIndex.get(i).values()];
    const displays = [...state.displayByGallery.values()];
    const preloadedArtworks = await Promise.all(artworkPromises);
    for (let i = 0; i < preloadedArtworks.length; i++) {
      displays[i].preload({artwork: preloadedArtworks[i]});
    }
  }
};

const adjustIndexIfNegative = (index, {state, settings}) => {
  if (index >= 0) {
    return index;
  } else if (settings.reverse.enabled && settings.reverse.loop) {
    const reverseSize = state.reverseStartIndex + 1;
    return index + reverseSize * Math.ceil(-index / reverseSize);
  } else {
    return 0;
  }
};

const determinePreloadIndexes = ({state, settings}) => {
  const forward = new Set();
  const backward = new Set();
  for (let i = 1; i <= settings.preloadRange; i++) {
    forward.add(state.currentIndex + i);
    backward.add(
        adjustIndexIfNegative(state.currentIndex - i, {state, settings}));
  }
  backward.delete(state.currentIndex);
  return new Set(settings.reverse.enabled ?
      [...backward, ...forward] : [...forward, ...backward]);
};

const determineUnloadIndexes = ({state, preloadSequence}) => {
  const furthestIndex = Math.max(...state.artworkByGalleryByIndex.keys());
  const unloadIndexes = new Set();
  for (let i = 0; i <= furthestIndex; i++) {
    if (!preloadSequence.has(i) && i !== state.currentIndex) {
      unloadIndexes.add(i);
    }
  }
  return unloadIndexes;
};

const createProceedFunction = ({state, settings, timer, ui}) => {
  let summedUpChange = 0;
  let proceeding = false;
  return async ({change}) => {
    if (state.closed) return;
    summedUpChange += change;
    if (proceeding) return;
    proceeding = true;
    timer.stop();
    ui.stopTimer();
    ui.startLoading();
    const indexBeforeProceeding = state.currentIndex;
    let resolvedArtworks = new Map();
    while (summedUpChange !== 0) {
      const stepChange = summedUpChange;
      state.currentIndex = adjustIndexIfNegative(
          state.currentIndex + stepChange, {state, settings});
      resolvedArtworks.clear();
      resolvedArtworks = await resolveCurrentArtworks({state});
      if (state.closed) return resolvedArtworks.clear();
      summedUpChange -= stepChange;
    }
    if (state.currentIndex !== indexBeforeProceeding) {
      const animation = settings.noTrans ? '' :
          state.currentIndex > indexBeforeProceeding ? 'slide-up' :
          'slide-down';
      for (const [gallery, display] of state.displayByGallery) {
        const artwork = resolvedArtworks.get(gallery);
        display.changeArtwork({artwork, animation});
      }
    }
    refreshPreloadRange({state, settings});
    proceeding = false;
    ui.refreshRoundNumber();
    if (settings.reverse.enabled &&
        !settings.reverse.loop &&
        state.currentIndex === 0) {
      timer.disable();
    }
    ui.stopLoading();
    if (timer.enabled) {
      timer.start({state});
      ui.launchTimer();
    }
  };
};

const createEventHandler = ({state, settings, timer, ui}) => {
  let close = () => {}
  const proceed = createProceedFunction({state, settings, timer, ui});
  const eventHandlers = {
    'down': () => void proceed({change: 1}),
    'up': () => void proceed({change: -1}),
    'right': () => void proceed({change: settings.reverse.enabled ? -1 : 1}),
    'left': () => void proceed({change: settings.reverse.enabled ? 1 : -1}),
    'togglePause': () => {
      timer.toggle({state});
      ui.toggleTimer();
    },
    'toggleCaption': () => {
      for (const display of state.displayByGallery.values()) {
        display.toggleCaption();
      }
      ui.toggleToggleCaptionSymbol();
    },
    'escape': () => void close(),
  };
  return {
    handle: event => void eventHandlers[event](),
    setClosingSequence: _close => close = _close,
  };
};
