const { createClient } = require("redis");
require("dotenv").config();

class RedisService {
  constructor() {
    this.client = createClient({
      url: process.env.REDIS_URL || "redis://localhost:6379",
    });

    this.initialize();
  }

  async initialize() {
    try {
      await this.client.connect();
      console.log("Redis client connected successfully");

      this.client.on("error", (err) => {
        console.error("Redis client error:", err);
      });

      this.client.on("reconnecting", () => {
        console.log("Redis client reconnecting...");
      });

      this.client.on("ready", () => {
        console.log("Redis client ready");
      });
    } catch (err) {
      console.error("Redis connection error:", err);
      throw err;
    }
  }

  async setWithExpiry(key, value, ttl = 900) {
    try {
      if (!this.client.isOpen) {
        await this.client.connect();
      }

      const serializedValue =
        typeof value === "string" ? value : JSON.stringify(value);
      await this.client.set(key, serializedValue, { EX: ttl });
      return true;
    } catch (err) {
      console.error("Redis set error:", err);
      throw err;
    }
  }

  async get(key) {
    try {
      if (!this.client.isOpen) {
        await this.client.connect();
      }

      const data = await this.client.get(key);

      if (!data) return null;

      try {
        return JSON.parse(data);
      } catch {
        return data; // Return as string if not JSON
      }
    } catch (err) {
      console.error("Redis get error:", err);
      throw err;
    }
  }

  async disconnect() {
    try {
      if (this.client.isOpen) {
        await this.client.disconnect();
      }
    } catch (err) {
      console.error("Redis disconnect error:", err);
    }
  }
}

// Export singleton instance
module.exports = new RedisService();
