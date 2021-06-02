/*
*/

import {config} from './config.js';

const Display = class {

  constructor(viewport) {
    this.viewport = viewport;
    this.currentMedia = undefined;
    this.medias = new Set();
    this.captionFrame = document.createElement('div');
    this.captionFrame.className = 'caption-frame';
    this.viewport.appendChild(this.captionFrame);
    this.indicator = document.createElement('canvas');
    this.ctx = this.indicator.getContext('2d');
    this.indicator.className = 'indicator';
    if ('ResizeObserver' in window) {
      this.indicatorObserver = new ResizeObserver(entries => {
        if (!entries) return;
        for (const entry of entries) {
          if (!entry || !entry.contentRect) return;
          this.indicator.width = entry.contentRect.width;
          this.indicator.height = entry.contentRect.height;
          this.resetIndicatorProperties();
          this.drawIndicator();
        }
      });
      this.indicatorObserver.observe(this.indicator);
    } else {
      this.resetIndicatorProperties();
    }
    this.captionFrame.appendChild(this.indicator);
    this.titleLine = document.createElement('div');
    this.titleLine.className = 'title-line';
    this.captionFrame.appendChild(this.titleLine);
    this.subtitleLine = document.createElement('div');
    this.subtitleLine.className = 'subtitle-line';
    this.captionFrame.appendChild(this.subtitleLine);
    this.roundNumber = document.createElement('div');
    this.roundNumber.className = 'round-number';
    this.viewport.appendChild(this.roundNumber);
    this.progress = 0;
    this.loading = false;
    this.showProgress = false;
    this.theater = false;
    this.closed = false;
  }

  changeArtwork(artwork, animation = '') {
    if (this.closed) return;
    this.changeCaption(artwork.post);
    if (this.currentMedia) {
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
      this.currentMedia.controls = this.theater;
      this.currentMedia.currentTime = 0;
      this.currentMedia.play();
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
    this.viewport.removeChild(this.roundNumber);
    this.roundNumber = undefined;
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
    if ('ResizeObserver' in window) {
      this.indicatorObserver.disconnect();
    }
    this.captionFrame.removeChild(this.indicator);
    this.ctx = undefined;
    this.indicator = undefined;
    this.viewport.removeChild(this.captionFrame);
    this.captionFrame = undefined;
    this.viewport = undefined;
  }

  async preload(artwork) {
    if (artwork.unloaded) return;
    const media = (await artwork).media;
    if (this.closed) return;
    if (this.medias.has(media)) return;
    this.medias.add(media);
    const frame = document.createElement('div');
    frame.className = 'media-frame';
    frame.style.visibility = 'hidden';
    this.viewport.appendChild(frame);
    media.className = 'media';
    frame.appendChild(media);
  }

  async unload(artwork) {
    const media = (await artwork).media;
    if (!this.medias.has(media)) return;
    this.viewport.removeChild(media.parentNode);
    media.parentNode.removeChild(media);
    this.medias.delete(media);
  }

  changeCaption(post) {
    this.titleLine.innerHTML = anchor(post.permalink, post.title);
    const authorRef = `https://www.reddit.com/user/${post.author}/posts`;
    const authorText =
        `/u/${post.author}${(post.flair ? ` (${post.flair})` : ``)}`;
    const subredditRef = `https://www.reddit.com/r/${post.subreddit}`;
    this.subtitleLine.innerHTML =
        `by ${anchor(authorRef, authorText)}` +
        ` ${createAgeString(post.date)}` +
        ` on ${anchor(subredditRef, `/r/${post.subreddit}`)}` +
        ` ❤${post.upvotes.toLocaleString('en-US')}`;
  }
  
  setProgress(progress) {
    this.showProgress = true;
    this.progress = progress;
    this.drawIndicator();
  }
  
  hideProgress() {
    this.showProgress = false;
    this.drawIndicator();
  }
  
  setLoading(loading) {
    this.loading = loading;
  }
  
  resetIndicatorProperties() {
    const bodyStyle = window.getComputedStyle(document.body);
    this.ctx.strokeStyle = bodyStyle.getPropertyValue('--indicator');
    this.ctx.lineWidth = this.ctx.canvas.height / 4;
    this.ctx.lineCap = 'round';
    this.ctx.shadowColor = bodyStyle.getPropertyValue('--indicator-shadow');
    this.ctx.shadowBlur = this.ctx.canvas.height / 4;
  }
  
  drawIndicator() {
    if (this.closed) return;
    const w = this.ctx.canvas.width;
    const h = this.ctx.canvas.height;
    this.ctx.clearRect(0, 0, w, h);
    if (this.theater) return;
    if (this.loading) {
      const d = config.LOADING_INDICATOR_CYCLE_DURATION * 1000;
      const offset = this.ctx.lineWidth / 2 + this.ctx.shadowBlur + w / 4;
      const f = t => config.EASE_IN_OUT_INDIC(t < 1/2 ? 2 * t : 2 * (1 - t));
      const t1 = f((performance.now() % d) / d);
      const t2 = f(((performance.now() - d / 10) % d) / d);
      this.ctx.beginPath();
      this.ctx.moveTo(offset + t2 * (w - 2 * offset), h / 2);
      this.ctx.lineTo(offset + t1 * (w - 2 * offset), h / 2);
      this.ctx.stroke();
    } else if (this.showProgress) {
      const offset = this.ctx.lineWidth / 2 + this.ctx.shadowBlur;
      this.ctx.beginPath();
      this.ctx.moveTo(offset + this.progress * (w / 2 - offset), h / 2);
      this.ctx.lineTo(w - offset - this.progress * (w / 2 - offset), h / 2);
      this.ctx.stroke();
    }
  }
  
  setRound(n) {
    if (this.closed) return;
    this.roundNumber.textContent = `${n}`;
  }
  
  goTheater() {
    if (!this.theater && !this.closed) {
      this.viewport.removeChild(this.captionFrame);
      this.viewport.removeChild(this.roundNumber);
      this.currentMedia.controls = true;
      this.theater = true;
    }
  }
  
  goRegular() {
    if (this.theater && !this.closed) {
      this.viewport.appendChild(this.captionFrame);
      this.viewport.appendChild(this.roundNumber);
      this.currentMedia.controls = false;
      this.theater = false;
    }
  }

};

const transitionCss = animation =>
    `${animation} ${config.TRANSITION_DURATION}s cubic-bezier(.22, 1, .36, 1)
    forwards`;

const anchor = (ref, txt) => `<a target="_blank" href="${ref}">${txt}</a>`;

const createAgeString = function(birthday) {
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

export {Display};
