/*
*/

import {config} from './config.js';

let verbose = true;
const setVerbose = value => void (verbose = value);

const createScraper = async function* ({
    subredditName,
    sortingMethod = 'hot',
    sortingPeriod = '',
    imgOnly = false,
  }) {
  let postTally = 0;
  let lastPostName = '';
  let consecutiveFullyInvalidListings = 0;
  while (true) {
    let newListing = [];
    try {
      newListing = await getListing(
          {subredditName, sortingMethod, sortingPeriod, after: lastPostName});
    } catch (error) {
      if (postTally > 0) {
        return subredditName;
      } else {
        throw new config.InvalidSubredditError(subredditName);
      }
    }
    const tallyBeforeAdditions = postTally;
    for (let i = 0, j = newListing.length; i < j; i++) {
      const post = getRelevantPostData(newListing[i]);
      if (isValidURL(post.url, imgOnly)) {
        postTally++;
        yield post;
      }
    }
    if (postTally === tallyBeforeAdditions) {
      consecutiveFullyInvalidListings++;
      if (consecutiveFullyInvalidListings >=
          config.NUMBER_OF_LISTINGS_BEFORE_GIVING_UP) {
        if (postTally === 0) {
          throw new config.InvalidSubredditError(subredditName);
        } else {
          return subredditName;
        }
      }
    }
    lastPostName = newListing[newListing.length - 1].data.name;
  }
};

const getListing = async function(
    {
      subredditName,
      sortingMethod = 'hot',
      sortingPeriod = '',
      after = '',
    }) {
  return new Promise(function(resolve, reject) {
    const listingRequest = new XMLHttpRequest();
    listingRequest.responseType = 'json';
    const listingUrl =
        `https://www.reddit.com/r/${subredditName}/${sortingMethod}.json?` +
        `limit=100&t=${sortingPeriod}&after=${after}`;
    listingRequest.open('GET', listingUrl);
    listingRequest.addEventListener('load', function() {
      if (verbose) {
        console.log(`received listing from r/${subredditName}`);
      }
      if (!listingRequest.response ||
          !listingRequest.response.data ||
          !listingRequest.response.data.children ||
          !listingRequest.response.data.children.length) {
        return reject();
      }
      resolve(listingRequest.response.data.children);
    });
    listingRequest.addEventListener('abort', () => void reject());
    listingRequest.addEventListener('error', () => void reject());
    listingRequest.send();
    if (verbose) {
      console.log(`sending listing request to r/${subredditName}`);
    }
  });
};

const getRelevantPostData =
    child => ({
      url: child.data.url,
      permalink: `https://www.reddit.com${child.data.permalink}`,
      subreddit: child.data.subreddit,
      title: child.data.title,
      date: new Date(child.data.created_utc * 1000),
      author: child.data.author,
      flair: child.data.author_flair_text,
      upvotes: child.data.ups,
      gfySources: undefined,
      vredditVideoUrl:
          (child.data.media && child.data.media.reddit_video) ?
              child.data.media.reddit_video.fallback_url : undefined,
    });

const isValidURL =
    (url, imgOnly) => (imgOnly ? config.IMAGE_URL_REGEXS : [
      ...config.IMAGE_URL_REGEXS,
      ...config.IMGUR_VIDEO_URL_REGEXS,
      ...config.VREDDIT_URL_REGEXS,
      ...config.GFYCAT_URL_REGEXS,
      ...config.REDGIFS_URL_REGEXS,
    ]).some(regex => regex.test(url));
    

export {createScraper, setVerbose};
