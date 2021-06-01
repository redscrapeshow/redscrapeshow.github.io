/*
*/

const config = {
  NUMBER_OF_LISTINGS_BEFORE_GIVING_UP: 5,
  IMAGE_URL_REGEXS: [/\.jpg$/, /\.jpeg$/, /\.png$/, /\.gif$/],
  IMGUR_VIDEO_URL_REGEXS: [/\.gifv$/],
  VREDDIT_URL_REGEXS: [/\/\/v\.redd\.it\//],
  GFYCAT_URL_REGEXS: [
    /gfycat\.com\/[A-Za-z]+$/,
    /gfycat\.com\/gifs\/detail\/[A-Za-z]+$/,
  ],
  REDGIFS_URL_REGEXS: [/redgifs\.com\/watch\/[A-Za-z]+$/],
  DEFAULT_AUTO_SKIP_TIMER: 10,
  TRANSITION_DURATION: .8,
  DEFAULT_PRELOAD_RANGE: 3,
  LOADING_INDICATOR_CYCLE_DURATION: 1.2,
  EASE_IN_OUT_INDIC: (n => t =>
      t < 1/2 ? Math.pow(2 * t, n) / 2 : 1 - Math.pow(2 * (1 - t), n) / 2)(3),
  DOUBLE_TAP_INTERVAL_IN_MS: 1000,
  SWIPE_THRESHOLD_FRACTION: 1/4,

  InvalidSubredditError: undefined,
  MediaLoadingError: undefined,
  EndOfSubredditError: undefined,
  AllSubredditsInvalidError: undefined,
  NoValidGalleryError: undefined,
  
};

config.InvalidSubredditError = class extends Error {
  constructor(subredditName) {
    super(`r/${subredditName} is an invalid subreddit`);
    this.name = 'InvalidSubredditError';
    this.subreddit = subredditName;
  }
};

config.MediaLoadingError = class extends Error {
  constructor(url = '', subredditName = '') {
    super(`can't load media at ${url} from r/${subredditName}`);
    this.name = 'MediaLoadingError';
  }
};

config.EndOfSubredditError = class extends Error {
  constructor(subredditName) {
    super('');
    this.name = 'EndOfSubredditError';
    this.subreddit = subredditName;
  }
};

config.AllSubredditsInvalidError = class extends Error {
  constructor(message) {
    super(message);
    this.name = 'AllSubredditsInvalidError';
  }
};

config.NoValidGalleryError = class extends Error {
  constructor(message) {
    super(message);
    this.name = 'NoValidGalleryError';
  }
};

export {config};
