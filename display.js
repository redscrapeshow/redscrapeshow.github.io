/*
*/

import {config} from './config.js';

export const Display = class {

  constructor({viewport}) {
    this.closed = false;
    this.viewport = viewport;
    this.currentMedia = undefined;
    this.medias = new Set();
    this.captionFrame = document.createElement('div');
    this.captionFrame.className = 'caption-frame';
    this.viewport.appendChild(this.captionFrame);
    this.titleLine = document.createElement('div');
    this.titleLine.className = 'title-line';
    this.captionFrame.appendChild(this.titleLine);
    this.subtitleLine = document.createElement('div');
    this.subtitleLine.className = 'subtitle-line';
    this.captionFrame.appendChild(this.subtitleLine);
    this.hideCaption = false;
  }

  changeArtwork({artwork, animation = ''}) {
    if (this.closed) return;
    this.changeCaption({post: artwork.post});
    if (this.currentMedia) {
      if (this.currentMedia instanceof HTMLVideoElement) {
        this.currentMedia.muted = true;
      }
      if (animation) {
        for (const media of this.medias) {
          media.parentNode.style.visibility = 'hidden';
        }
        const takeAwayFrame = document.createElement('div');
        takeAwayFrame.className = 'media-frame';
        this.viewport.appendChild(takeAwayFrame);
        const usedFrame = this.currentMedia.parentNode;
        takeAwayFrame.appendChild(this.currentMedia);
        this.viewport.removeChild(usedFrame);
        takeAwayFrame.style.animation = transitionCss(animation + '-out');
        setTimeout(function() {
          if (takeAwayFrame.firstChild &&
              takeAwayFrame.firstChild instanceof HTMLVideoElement) {
            takeAwayFrame.firstChild.pause();
          }
        }, config.TRANSITION_DURATION * 1000);
      } else {
        this.currentMedia.parentNode.style.visibility = 'hidden';
        if (this.currentMedia instanceof HTMLVideoElement) {
          this.currentMedia.pause();
        }
      }
    }
    if (this.medias.has(artwork.media)) {
      if (animation) {
        const bringInFrame = document.createElement('div');
        bringInFrame.className = 'media-frame';
        this.viewport.appendChild(bringInFrame);
        const usedFrame = artwork.media.parentNode;
        bringInFrame.appendChild(artwork.media);
        this.viewport.removeChild(usedFrame);
        bringInFrame.style.animation = transitionCss(animation + '-in');
      } else {
        artwork.media.parentNode.style.visibility = 'visible';
      }
    } else {
      this.medias.add(artwork.media);
      const frame = document.createElement('div');
      frame.className = 'media-frame';
      frame.appendChild(artwork.media);
      artwork.media.className = 'media';
      if (animation) {
        frame.style.animation = transitionCss(animation + '-in');
      }
      this.viewport.appendChild(frame);
    }
    this.currentMedia = artwork.media;
    if (this.currentMedia instanceof HTMLVideoElement) {
      this.currentMedia.currentTime = 0;
      this.currentMedia.muted = false;
      this.currentMedia.play();
      if (this.hideCaption) this.currentMedia.controls = true;
    }
  }
  
  close() {
    this.closed = true;
    for (let media of this.medias) {
      if (media.parentNode) {
        if (media.parentNode.parentNode) {
          media.parentNode.parentNode.removeChild(media.parentNode);
        }
        media.parentNode.removeChild(media);
      }
    }
    this.medias.clear();
    this.currentMedia = undefined;
    while (this.subtitleLine.firstChild) {
      this.subtitleLine.removeChild(this.subtitleLine.firstChild);
    }
    this.captionFrame.removeChild(this.subtitleLine);
    this.subtitleLine = undefined;
    while (this.titleLine.firstChild) {
      this.titleLine.removeChild(this.titleLine.firstChild);
    }
    this.captionFrame.removeChild(this.titleLine);
    this.titleLine = undefined;
    if (this.captionFrame.parentNode) {
      this.viewport.removeChild(this.captionFrame);
    }
    this.captionFrame = undefined;
    if (this.viewport.parentNode) {
      this.viewport.parentNode.removeChild(this.viewport);
    }
    this.viewport = undefined;
  }

  preload({artwork}) {
    if (!this.closed && !artwork.unloaded && !this.medias.has(artwork.media)) {
      const frame = document.createElement('div');
      frame.className = 'media-frame';
      frame.style.visibility = 'hidden';
      this.viewport.appendChild(frame);
      artwork.media.className = 'media';
      frame.appendChild(artwork.media);
      this.medias.add(artwork.media);
    }
  }

  async unload({artwork}) {
    const media = (await artwork).media;
    if (!this.medias.has(media)) return;
    this.viewport.removeChild(media.parentNode);
    media.parentNode.removeChild(media);
    this.medias.delete(media);
  }

  changeCaption({post}) {
    this.titleLine.innerHTML = anchor(post.permalink, post.title);
    const authorRef = `https://www.reddit.com/user/${post.author}`;
    const authorText =
        `/u/${post.author}${(post.flair ? ` (${post.flair})` : ``)}`;
    const subredditRef = `https://www.reddit.com/r/${post.subreddit}`;
    this.subtitleLine.innerHTML =
        `by ${anchor(authorRef, authorText)}` +
        ` ${createAgeString({birthday: post.date})}` +
        ` on ${anchor(subredditRef, `/r/${post.subreddit}`)}` +
        ` ❤${post.upvotes.toLocaleString('en-US')}`;
  }
  
  toggleCaption() {
    this.hideCaption = !this.hideCaption;
    if (this.hideCaption) {
      this.captionFrame.parentNode.removeChild(this.captionFrame);
      if (this.currentMedia instanceof HTMLVideoElement) {
        this.currentMedia.controls = true;
      }
    } else {
      this.viewport.appendChild(this.captionFrame);
      if (this.currentMedia instanceof HTMLVideoElement) {
        this.currentMedia.controls = false;
      }
    }
  }
  
};

const transitionCss = animation =>
    `${animation} ${config.TRANSITION_DURATION}s cubic-bezier(.22, 1, .36, 1)
    forwards`;

const anchor = (ref, txt) => `<a target="_blank" href="${ref}">${txt}</a>`;

const createAgeString = function({birthday}) {
  const now = new Date(Date.now());
  const age = now - birthday;
  const minutes = age / 60000;
  const hours = minutes / 60;
  const midnight =
      now -
      ((now.getHours() * 60 + now.getMinutes()) * 60 +
      now.getSeconds()) * 1000 -
      now.getMilliseconds();
  const days = Math.ceil((midnight - birthday) / 1000 / 3600 / 24);
  if (minutes < 1) {
    return `just now`;
  } else if (minutes < 60) {
    return `${Math.round(minutes)} minute${minutes >= 1.5 ? 's' : ''} ago`;
  } else if (hours < 24) {
    return `${Math.round(hours)} hour${hours >= 1.5 ? 's' : ''} ago`;
  } else if (days <= 1) {
    return `yesterday`;
  } else if (days <= 31) {
    return `${days} days ago`;
  } else {
    return `${birthday.getFullYear()}-` +
        `${birthday.getMonth() + 1}`.padStart(2, '0') + `-` +
        `${birthday.getDate()}`.padStart(2, '0');
  }
};
