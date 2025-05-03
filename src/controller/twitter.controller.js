const axios = require("axios");
const RedisService = require("../redis/redis");
const httpRes = require("../utils/http");
const { GET, SERVER_ERROR_MESSAGE } = require("../utils/message");
const { prepareResponse } = require("../utils/response");
require("dotenv").config();

exports.getTwitterPosts = async (req, res) => {
  const CACHE_KEY = "twitter:technology_posts";
  const CACHE_TTL = 900; // 15 minutes in seconds

  try {
    // 1. First try to get cached data
    const cachedData = await RedisService.get(CACHE_KEY);

    if (cachedData) {
      return res.status(200).json({
        // Explicit status code
        status: "OK (CACHED)",
        message: GET,
        data: cachedData,
        meta: {
          source: "redis-cache",
          cached: true,
          expiresIn: `${CACHE_TTL} seconds`,
        },
      });
    }

    // 2. Fetch fresh data from Twitter API
    const response = await axios.get(
      "https://api.twitter.com/2/tweets/search/recent?query=%23technology&max_results=10",
      {
        headers: {
          Authorization: `Bearer ${process.env.TWITTER_BEARER_TOKEN}`,
        },
        validateStatus: (status) => status < 500,
      }
    );

    // 3. Handle rate limits
    if (response.status === 429) {
      const resetTime = parseInt(response.headers["x-rate-limit-reset"]) * 1000;
      const waitTime = Math.max(0, resetTime - Date.now()) + 5000;

      return res.status(429).json({
        // Explicit status code
        status: "RATE_LIMITED",
        message: "Twitter API rate limit exceeded",
        data: {
          retryAfterSeconds: Math.ceil(waitTime / 1000),
          resetTime: new Date(resetTime).toISOString(),
        },
      });
    }

    // 4. Process tweets
    const tweets =
      response.data.data?.map((tweet) => ({
        id: tweet.id,
        text: tweet.text,
        url: `https://twitter.com/i/status/${tweet.id}`,
        author: tweet.author_id ? { id: tweet.author_id } : null,
        createdAt: tweet.created_at || new Date().toISOString(),
        metrics: {
          like_count: tweet.public_metrics?.like_count || 0,
          retweet_count: tweet.public_metrics?.retweet_count || 0,
        },
      })) || [];

    // 5. Cache the response
    await RedisService.setWithExpiry(CACHE_KEY, tweets, CACHE_TTL);

    // 6. Return fresh data
    return res.status(200).json({
      // Explicit status code
      status: "OK",
      message: GET,
      data: tweets,
      meta: {
        source: "twitter-api",
        cacheStatus: "set",
        expiresIn: `${CACHE_TTL} seconds`,
        rateLimit: {
          remaining: response.headers["x-rate-limit-remaining"],
          reset: new Date(
            parseInt(response.headers["x-rate-limit-reset"]) * 1000
          ).toISOString(),
        },
      },
    });
  } catch (error) {
    console.error("Twitter API Error:", error.message);

    // 7. Fallback to cache
    const cachedData = await RedisService.get(CACHE_KEY);
    if (cachedData) {
      return res.status(200).json({
        // Explicit status code
        status: "OK (FALLBACK CACHE)",
        message: GET,
        data: cachedData,
        meta: {
          source: "redis-cache-fallback",
          error: error.message,
          cached: true,
        },
      });
    }

    // 8. No cache available
    return res.status(500).json({
      // Explicit status code
      status: "SERVER_ERROR",
      message: SERVER_ERROR_MESSAGE,
      error: {
        message: error.message,
        ...(error.response?.data ? { apiError: error.response.data } : {}),
      },
      cacheStatus: "unavailable",
    });
  }
};
