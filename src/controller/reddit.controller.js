const axios = require("axios");
const RedisService = require("../redis/redis");
const httpRes = require("../utils/http");
const { GET, SERVER_ERROR_MESSAGE } = require("../utils/message");
const { prepareResponse } = require("../utils/response");

exports.getRedditPosts = async (req, res) => {
  const CACHE_KEY = "reddit:popular_posts";
  const CACHE_TTL = 900; // 15 minutes
  const MAX_POSTS = 25; // Lower limit for unauthenticated requests
  const USER_AGENT = "web:MyApp:v1.0 (by /u/YourRedditUsername)"; // MUST follow format

  try {
    // 1. Try cached data first
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

    // 2. Fetch fresh data (single request only)
    const response = await axios.get(
      "https://www.reddit.com/r/popular.json?limit=25",
      {
        headers: {
          "User-Agent": USER_AGENT, // Critical for API access
          "Accept-Encoding": "gzip",
        },
        timeout: 3000,
      }
    );

    if (!response.data?.data?.children) {
      throw new Error("Invalid Reddit API response");
    }

    const posts = response.data.data.children
      .filter((post) => post.data)
      .map((post) => ({
        id: post.data.id,
        title: post.data.title,
        url: `https://reddit.com${post.data.permalink}`,
        author: post.data.author,
        subreddit: post.data.subreddit,
        upvotes: post.data.ups || 0,
        created_utc: post.data.created_utc,
      }));

    // 3. Cache the results
    if (posts.length > 0) {
      await RedisService.setWithExpiry(CACHE_KEY, posts, CACHE_TTL);
    }

    // 4. Return data
    return res.status(httpRes.OK).json(
      prepareResponse("OK", GET, posts, {
        source: "reddit-api",
        cacheStatus: "set",
        postCount: posts.length,
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

    // 6. Final error response
    return res.status(error.response?.status || httpRes.SERVER_ERROR).json(
      prepareResponse("SERVER_ERROR", SERVER_ERROR_MESSAGE, null, {
        message: error.message,
        cacheStatus: "unavailable",
      })
    );
  }
};
