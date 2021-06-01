/*
*/

import {config} from './config.js';

let verbose = true;
const setVerbose = value => void (verbose = value);

const loadMediaFromRedditPost = async function(post) {
  const urlRegexsToLoader = new Map();
  urlRegexsToLoader.set(config.IMAGE_URL_REGEXS, loadImage);
  urlRegexsToLoader.set(config.IMGUR_VIDEO_URL_REGEXS, loadVideoFromImgur);
  urlRegexsToLoader.set(config.VREDDIT_URL_REGEXS, loadVideoFromVReddit);
  urlRegexsToLoader.set(config.GFYCAT_URL_REGEXS, loadVideoFromGfycat);
  urlRegexsToLoader.set(config.REDGIFS_URL_REGEXS, loadVideoFromRedgifs);
  for (const [regexs, loader] of urlRegexsToLoader) {
    if (regexs.some(regex => regex.test(post.url))) {
      try {
        return await loader(post);
      } catch (error) {
        if (error instanceof config.MediaLoadingError) {
          error = new config.MediaLoadingError(post.url, post.subreddit);
        }
        throw error;
      }
    }
  }
};

const convertToHttps =
    s => s.slice(0, 5) === "http:" ? "https" + s.slice(4) : s;

const mediaRejectCallback =
    reject => (() => void reject(new config.MediaLoadingError()));

const loadImage = async function(post) {
  return new Promise(function(resolve, reject) {
    if (verbose) {
      console.log(`loading image from r/${post.subreddit} (at ${post.url})`);
    }
    const media = document.createElement('img');
    media.addEventListener('load', function() {
      if (verbose) {
        console.log(`successfully loaded image from r/${post.subreddit} ` +
            `(at ${post.url})`);
      }
      resolve(media);
    });
    media.addEventListener('error', mediaRejectCallback(reject));
    media.src = convertToHttps(post.url);
  });
};

const loadVideoFromImgur = async function(post) {
  return loadVideoFromSources([
    convertToHttps(post.url.replace(/\.\w+$/, '.mp4')),
    convertToHttps(post.url.replace(/\.\w+$/, '.webm')),
  ]);
};

const loadVideoFromVReddit = async function(post) {
  return loadVideoFromSources([post.vredditVideoUrl]);
};

const loadVideoFromGfycat = async function(post) {
  return loadVideoFromSources(await getSourcesFromGfycatSite(post, 'gfycat'));
};

const loadVideoFromRedgifs = async function(post) {
  return loadVideoFromSources(await getSourcesFromGfycatSite(post, 'redgifs'));
};

const getSourcesFromGfycatSite = async function(post, gfycatSite = 'gfycat') {
  if (post.gfySources && post.gfySources.length) return post.gfySources;
  return new Promise(function(resolve, reject) {
    const gfycatId = post.url.match(/\/([A-Za-z]+)$/)[1];
    const sourceRequestUrl =
        `https://api.${gfycatSite}.com/v1/gfycats/${gfycatId}`;
    const sourceRequest = new XMLHttpRequest();
    sourceRequest.responseType = 'json';
    sourceRequest.open('GET', sourceRequestUrl);
    sourceRequest.addEventListener('error', mediaRejectCallback(reject));
    sourceRequest.addEventListener('abort', mediaRejectCallback(reject));
    sourceRequest.addEventListener('timeout', mediaRejectCallback(reject));
    sourceRequest.addEventListener('load', function () {
      const sources = [];
      if (sourceRequest.response && sourceRequest.response.gfyItem) {
        const gfyItem = sourceRequest.response.gfyItem;
        if (gfyItem.mp4Url) sources.push(gfyItem.mp4Url);
        if (gfyItem.webmUrl) sources.push(gfyItem.webmUrl);
      }
      if (!sources.length) return void mediaRejectCallback(reject)();
      post.gfySources = sources;
      if (verbose) {
        console.log(`Successfully retrieved sources for ${gfycatSite} video ` +
            `from r/${post.subreddit} (at ${post.url})`);
      }
      resolve(sources);
    });
    if (verbose) {
      console.log(`Requesting sources for ${gfycatSite} video from ` +
          `r/${post.subreddit} (at ${post.url})`);
    }
    sourceRequest.send();
  });
};

const loadVideoFromSources = async function(sources) {
  return new Promise(function(resolve, reject) {
    const video = document.createElement('video');
    video.controls = false;
    video.loop = true;
    video.muted = false;
    video.addEventListener('canplay', function() {
      if (verbose) {
        console.log(`Enough loaded to play video from ${sources}`);
      }
      resolve(video);
    });
    video.addEventListener('error', mediaRejectCallback(reject));
    for (const sourceUrl of sources) {
      const sourceElement = document.createElement('source');
      sourceElement.src = sourceUrl;
      sourceElement.addEventListener('error', mediaRejectCallback(reject));
      video.appendChild(sourceElement);
    }
    if (verbose) {
      console.log(`Loading video from ${sources}`);
    }
    video.load();
  });
};

export {loadMediaFromRedditPost, setVerbose};
