const axios = require("axios");
const RedisService = require("../redis/redis"); // Make sure this path is correct
const httpRes = require("../utils/http");
const { GET, SERVER_ERROR_MESSAGE } = require("../utils/message");
const { prepareResponse } = require("../utils/response");
require("dotenv").config();

exports.getRedditPosts = async (req, res) => {
  const CACHE_KEY = "reddit:popular_posts";
  const CACHE_TTL = 900; // 15 minutes in seconds
  const MAX_POSTS = 100; // Set your desired maximum number of posts

  try {
    // 1. First try to get cached data
    const cachedData = await RedisService.get(CACHE_KEY);

    if (cachedData) {
      return res.status(httpRes.OK).json(
        prepareResponse("OK (CACHED)", GET, cachedData, {
          source: "redis-cache",
          cached: true,
          expiresIn: `${CACHE_TTL} seconds`,
        })
      );
    }

    // 2. Fetch fresh data from Reddit API
    let allPosts = [];
    let after = null;
    let hasMore = true;
    let requestCount = 0;
    const maxRequests = 5; // Limit number of requests to prevent rate limiting

    while (
      hasMore &&
      requestCount < maxRequests &&
      allPosts.length < MAX_POSTS
    ) {
      const url = after
        ? `https://www.reddit.com/r/popular.json?after=${after}`
        : "https://www.reddit.com/r/popular.json";

      const response = await axios.get(url, {
        headers: { "User-Agent": "YourApp/1.0" },
      });

      if (!response.data?.data?.children) {
        throw new Error("Invalid Reddit API response structure");
      }

      const batch = response.data.data.children.map((post) => ({
        id: post.data?.id,
        title: post.data?.title,
        url: `https://reddit.com${post.data?.permalink}`,
        author: post.data?.author,
        subreddit: post.data?.subreddit,
        text: post.data?.selftext,
        upvotes: post.data?.ups || 0,
        thumbnail: post.data?.thumbnail,
        created_utc: post.data?.created_utc,
        num_comments: post.data?.num_comments || 0,
        media: post.data?.media,
        is_video: post.data?.is_video,
      }));

      allPosts = [...allPosts, ...batch];
      after = response.data.data.after;
      hasMore = !!after && allPosts.length < MAX_POSTS;
      requestCount++;
    }

    // 3. Cache the aggregated results
    await RedisService.setWithExpiry(CACHE_KEY, allPosts, CACHE_TTL);

    // 4. Return fresh data
    return res.status(httpRes.OK).json(
      prepareResponse("OK", GET, allPosts, {
        source: "reddit-api",
        cacheStatus: "set",
        expiresIn: `${CACHE_TTL} seconds`,
        postCount: allPosts.length,
        batchCount: requestCount,
      })
    );
  } catch (error) {
    console.error("Reddit API Error:", error.message);

    // 5. Fallback to cache if available
    const cachedData = await RedisService.get(CACHE_KEY);
    if (cachedData) {
      return res.status(httpRes.OK).json(
        prepareResponse("OK (FALLBACK CACHE)", GET, cachedData, {
          source: "redis-cache-fallback",
          error: error.message,
          cached: true,
        })
      );
    }

    // 6. No cache available, return error
    return res.status(httpRes.SERVER_ERROR).json(
      prepareResponse("SERVER_ERROR", SERVER_ERROR_MESSAGE, null, {
        message: error.message,
        ...(error.response?.data ? { apiError: error.response.data } : {}),
        cacheStatus: "unavailable",
      })
    );
  }
};
