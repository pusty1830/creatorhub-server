const express = require("express");
const router = express.Router();
const { getTwitterPosts } = require("../controller/twitter.controller");

router.get("/twitter", getTwitterPosts);

module.exports = router;
