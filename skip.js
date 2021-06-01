/*
*/

import {config} from './config.js';

const Skipper = class {

  constructor(settings, displays, proceed) {
    this.settings = settings;
    this.displays = displays;
    this.proceed = () => proceed(settings.reverse.enabled ? -1 : 1);
    this.enabled = settings.autoSkip.enabled;
    this.duration = settings.autoSkip.timer * 1000;
    this.timeoutId = undefined;
    this.timerStart = undefined;
    this.elapsed = 0;
  }
  
  destroy() {
    void this.displays.splice(0, this.displays.length);
    this.proceed = undefined;
  }
  
  start() {
    if (!this.enabled) return;
    if (this.elapsed === 0) this.determineDuration();
    this.timerStart = performance.now();
    this.timeoutId = setTimeout(this.proceed, this.duration - this.elapsed);
    const skipper = this;
    window.requestAnimationFrame(function updateProgress() {
      if (!skipper.timerStart) return;
      const progress =
          (skipper.elapsed + performance.now() - skipper.timerStart) /
              skipper.duration;
      for (const display of skipper.displays) {
        display.setProgress(progress);
      }
      window.requestAnimationFrame(updateProgress);
    });
  }
  
  stop() {
    this.timerStart = undefined;
    this.elapsed = 0;
    clearTimeout(this.timeoutId);
    for (const display of this.displays) {
      display.hideProgress();
    }
  }
  
  toggle() {
    this.enabled = !this.enabled;
    if (this.enabled) {
      this.start();
    } else {
      clearTimeout(this.timeoutId);
      if (this.timerStart) {
        this.elapsed += performance.now() - this.timerStart;
      }
      this.timerStart = undefined;
    }
  }
  
  disable() {
    this.enabled = false;
    this.stop();
  }
  
  determineDuration() {
    const videoDurations = [];
    for (const display of this.displays) {
      if (display.currentMedia instanceof HTMLVideoElement) {
        videoDurations.push(display.currentMedia.duration);
      }
    }
    if (videoDurations.length === 0 || this.settings.videoSkip === 'cut') {
      this.duration = this.settings.autoSkip.timer * 1000;
    } else {
      const maxDuration = Math.max(...videoDurations);
      if (this.settings.videoSkip === 'once') {
        this.duration = maxDuration * 1000;
      } else if (this.settings.videoSkip === 'loop') {
        this.duration = maxDuration * 1000;
        while (this.duration < this.settings.autoSkip.timer * 1000) {
          this.duration += maxDuration * 1000;
        }
      }
    }
  }

};

export {Skipper};
