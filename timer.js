/*
*/

import {config} from './config.js';

export const Timer = class {

  constructor({settings}) {
    this.defaultDuration = settings.autoSkip.timer * 1000;
    this.videoSkip = settings.videoSkip;
    this.enabled = settings.autoSkip.enabled;
    this.callback = () => {};
    this.duration = undefined;
    this.timeoutId = undefined;
    this.timestamp = undefined;
    this.elapsed = 0;
  }
  
  start({state}) {
    if (!this.enabled) return;
    if (!this.elapsed) this.determineDuration({state});
    this.timestamp = performance.now();
    this.timeoutId = setTimeout(this.callback, this.duration - this.elapsed);
  }
  
  stop() {
    clearTimeout(this.timeoutId);
    this.timestamp = undefined;
    this.elapsed = 0;
  }
  
  disable() {
    this.enabled = false;
    this.stop();
  }
  
  toggle({state}) {
    if (this.enabled) {
      clearTimeout(this.timeoutId);
      this.enabled = false;
      if (this.timestamp) this.elapsed += performance.now() - this.timestamp;
      this.timestamp = undefined;
    } else {
      this.enabled = true;
      this.start({state});
    }
  }

  determineDuration({state}) {
    const displays = [...state.displayByGallery.values()];
    const medias = displays.map(display => display.currentMedia);
    const durations = [];
    for (const media of medias) {
      if (media instanceof HTMLVideoElement) durations.push(media.duration);
    }
    if (durations.length === 0) return this.duration = this.defaultDuration;
    const maxDuration = Math.max(...durations) * 1000;
    const hash = {
      'cut': this.defaultDuration,
      'once': maxDuration,
      'loop': maxDuration * Math.ceil(this.defaultDuration / maxDuration),
    };
    this.duration = hash[this.videoSkip];
  }
  
  progress() {
    /* states:
    running, uninterrupted:
        enabled, elapsed = 0, timestamp exists, duration computed
    running, had been interrupted:
        enabled, elapsed != 0, timestamp exists, duration computed
    paused:
        disabled, elapsed != 0, timestamp null, duration computed
    stopped:
        disabled, elapsed = 0, timestamp null, duration null
    init:
        enabled/disabled, elapsed = 0, timestamp null, duration null
    */
    if (!this.timestamp && this.elapsed === 0) return 0;
    if (!this.timestamp) return this.elapsed / this.duration;
    return (this.elapsed + performance.now() - this.timestamp) / this.duration;
  }

};
