const router = require("express").Router();

router.use("/auth", require("./auth.route"));
router.use("/feedreddit", require("./reddit.route"));
router.use("/feedtwitter", require("./twitter.route"));
router.use("/:tableName", require("./query.route"));
module.exports = router;
