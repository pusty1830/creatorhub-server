const express = require("express");
const router = express.Router();
const { getRedditPosts } = require("../controller/reddit.controller");

router.get("/reddit", getRedditPosts);

module.exports = router;
