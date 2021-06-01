/*
*/

import {config} from './config.js';
import {createScraper} from './scrape.js';
import {loadMediaFromRedditPost} from './preload.js';

const Gallery = class {

  constructor(subreddits, settings) {
    this.settings = settings;
    this.artworksByScraper = new Map();
    this.firstRecycledIndexByScraper = new Map();
    for (const subreddit of subreddits) {
      const scraper = createScraper({
        subredditName: subreddit,
        sortingMethod: settings.sortingMethod,
        sortingPeriod: settings.sortingPeriod,
        imgOnly: settings.imgOnly,
      });
      this.artworksByScraper.set(scraper, []);
      this.firstRecycledIndexByScraper.set(scraper, undefined);
    }
    this.shuffledSequence = [];
    this.curator = undefined;
    this.closed = false;
  }

  async getArtwork(n) {
    if (!this.curator) this.curator = this.generateCurator();
    while (n >= this.numberOfArtworks()) {
      await this.curator.next();
      if (this.closed) return;
    }
    const roundIndex = this.roundIndexOfNthArtwork(n);
    const scraper = this.scraperOfNthArtwork(n);
    const artwork = this.artworksByScraper.get(scraper)[roundIndex];
    let media = undefined;
    if (artwork.unloaded) {
      try {
        media = await loadMediaFromRedditPost(artwork.post);
      } catch (error) {
        if (error instanceof config.MediaLoadingError) {
          console.warn(error);
          artwork.media = document.createElement('p');
          artwork.media.textContent =
              `for some reason, ${artwork.post.url} could not be reached again`;
        } else {
          throw error;
        }
      }
      if (this.closed) return unloadMedia(media);
      artwork.media = media;
      artwork.unloaded = false;
    }
    return artwork;
  }

  async getLastArtworkOfRound(roundNumber) {
    await this.getArtwork(this.artworksByScraper.size - 1);
    if (this.closed) return;
    return this.getArtwork((roundNumber + 1) * this.artworksByScraper.size - 1);
  }

  unloadMediaOfArtwork(n) {
    const scraper = this.scraperOfNthArtwork(n);
    const roundIndex = this.roundIndexOfNthArtwork(n);
    if (roundIndex < this.artworksByScraper.get(scraper).length) {
      const artwork = this.artworksByScraper.get(scraper)[roundIndex];
      if (artwork.media) {
        unloadMedia(artwork.media);
        artwork.unloaded = true;
      }
    }
  }
  
  close() {
    this.closed = true;
    void this.shuffledSequence.splice(0, this.shuffledSequence.length);
    for (const stash of this.artworksByScraper.values()) {
      for (const artwork of stash) {
        unloadMedia(artwork.media);
        if (artwork.media.parentNode) {
          artwork.media.parentNode.removeChild(artwork.media);
        }
        artwork.media = undefined;
        artwork.post = undefined;
      }
      void stash.splice(0, stash.length);
    }
    this.artworksByScraper.clear();
    this.curator = undefined;
  }

  numberOfArtworks() {
    return [...this.artworksByScraper.values()].reduce(
        (total, artworks) => total + artworks.length, 0);
  }

  roundIndexOfNthArtwork(n) {
    return Math.floor(n / this.artworksByScraper.size);
  }

  scraperOfNthArtwork(n) {
    const scrapers = [...this.artworksByScraper.keys()];
    if (!this.settings.shuffle) {
      return scrapers[n % this.artworksByScraper.size];
    } else {
      for (
          let r = Math.floor(this.shuffledSequence.length / scrapers.length);
          r <= Math.floor(n / scrapers.length);
          r++) {
        const currentRoundSequence = this.shuffledSequence.slice(
            r * scrapers.length,
            (r + 1) * scrapers.length);
        const availableScrapers = [];
        for (const scraper of scrapers) {
          if (currentRoundSequence.indexOf(scraper) === -1) {
            availableScrapers.push(scraper);
          }
        }
        while (availableScrapers.length > 0 && 
            n >= this.shuffledSequence.length) {
          const rndIndex = Math.floor(Math.random() * availableScrapers.length);
          this.shuffledSequence.push(availableScrapers.splice(rndIndex, 1)[0]);
        }
      }
      return this.shuffledSequence[n];
    }
  }

  async* generateCurator() {
    while (true) {
      if (this.artworksByScraper.size === 0) {
        throw new config.AllSubredditsInvalidError();
      }
      const n = this.numberOfArtworks();
      const scraper = this.scraperOfNthArtwork(n);
      const artwork = {
        index: undefined,
        media: undefined,
        post: undefined,
        unloaded: false,
      };
      try {
        const scraperYield = await scraper.next();
        if (scraperYield.done) {
          throw new config.EndOfSubredditError(scraperYield.value);
        }
        artwork.post = scraperYield.value;
      } catch (error) {
        if (error instanceof config.EndOfSubredditError &&
            this.artworksByScraper.get(scraper).length > 0) {
          if (!this.firstRecycledIndexByScraper.get(scraper)) {
            this.firstRecycledIndexByScraper.set(
                scraper, this.artworksByScraper.get(scraper).length);
          }
          artwork.post = this.artworksByScraper.get(scraper)[
              this.artworksByScraper.get(scraper).length %
                  this.firstRecycledIndexByScraper.get(scraper)].post;
        } else if (error instanceof config.InvalidSubredditError ||
            error instanceof config.EndOfSubredditError) {
          console.warn(error);
          this.artworksByScraper.delete(scraper);
          if (this.settings.shuffle) {
            this.shuffledSequence = this.shuffledSequence.slice(0, n);
          }
          continue;
        } else {
          throw error;
        }
      }
      if (this.closed) return;
      let media = undefined;
      try {
        media = await loadMediaFromRedditPost(artwork.post);
      } catch (error) {
        if (error instanceof config.MediaLoadingError) {
          console.warn(error);
          continue;
        } else {
          throw error;
        }
      }
      if (this.closed) return unloadMedia(media);
      artwork.media = media;
      artwork.index = n;
      this.artworksByScraper.get(scraper).push(artwork);
      yield artwork;
    }
  }

};

const unloadMedia = function(media) {
  if (media instanceof HTMLImageElement) {
    media.src = '';
  } else if (media instanceof HTMLVideoElement) {
    while (media.firstChild) {
      media.removeChild(media.lastChild);
    }
    media.load();
  }
};

export {Gallery};
