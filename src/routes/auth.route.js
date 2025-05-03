const router = require("express").Router();
const { prepareBody } = require("../utils/response");
const { asyncHandler } = require("../middleware/asyncHandler");
const {
  Signup,
  Signin,
  getProfile,
  updateProfile,
  trackLoginAndAddCredits,
  addCredits,
} = require("../controller/auth.controller");

const checkMail = require("../middleware/checkMail");
const { verifySign } = require("../utils/token");

router
  .route("/register")
  .post(prepareBody, checkMail, asyncHandler("User", Signup));

//USER_LOGIN
router.route("/login").post(prepareBody, asyncHandler("User", Signin));

router.route("/profile").get(verifySign, asyncHandler("User", getProfile));
router
  .route("/edit-profile")
  .patch(prepareBody, verifySign, asyncHandler("User", updateProfile));

router
  .route("/track-login")
  .post(verifySign, asyncHandler("User", trackLoginAndAddCredits));

router.route("/add-credits").post(verifySign, asyncHandler("User", addCredits));
module.exports = router;
