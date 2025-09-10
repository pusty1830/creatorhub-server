const UserService = require("../services/auth.services");
const { prepareResponse } = require("../utils/response");
const { getRawData } = require("../utils/function");
const httpRes = require("../utils/http");
const {
  SERVER_ERROR_MESSAGE,
  PROFILE_CREATION,
  CURRENT_PASSWORD_INCORRECT,
  LOGIN,
  ACCOUNT_NOT_FOUND,
  CONTACT_SUPPORT,
  UPDATE_PROFILE_SUCCESS,
} = require("../utils/message");
const { hashPassword, comparePassword } = require("../utils/password");
const { generateSign } = require("../utils/token");

// ✅ Register a new user
exports.Signup = async (req, res) => {
  try {
    let body = req.body;
    body.password = await hashPassword(body.password);

    let result = await UserService.addData(body);
    result = getRawData(result);

    return res
      .status(httpRes.CREATED)
      .json(prepareResponse("CREATED", PROFILE_CREATION, null, result));
  } catch (error) {
    console.error(error);
    return res
      .status(httpRes.SERVER_ERROR)
      .json(prepareResponse("SERVER_ERROR", SERVER_ERROR_MESSAGE, null, error));
  }
};

// ✅ Login
exports.Signin = async (req, res) => {
  try {
    let result = await UserService.getOneUserByCond({
      email: req.body.email,
    });

    result = getRawData(result);
    if (!result) {
      return res
        .status(httpRes.NOT_FOUND)
        .json(prepareResponse("NOT_FOUND", ACCOUNT_NOT_FOUND, null, null));
    }

    const isPasswordCorrect = await comparePassword(
      req.body.password,
      result.password
    );

    if (!isPasswordCorrect) {
      return res
        .status(httpRes.FORBIDDEN)
        .json(
          prepareResponse("FORBIDDEN", CURRENT_PASSWORD_INCORRECT, null, null)
        );
    }

    if (result.status === "ARCHIVED") {
      return res
        .status(httpRes.FORBIDDEN)
        .json(prepareResponse("FORBIDDEN", CONTACT_SUPPORT, null, null));
    }

    // Generate JWT Token
    const token = await generateSign(
      result.email,
      result.firstName,
      result.status,
      result._id,
      result.role
    );

    result.accessToken = token;

    return res
      .status(httpRes.OK)
      .json(prepareResponse("OK", LOGIN, result, null));
  } catch (error) {
    console.error(error);
    return res
      .status(httpRes.SERVER_ERROR)
      .json(prepareResponse("SERVER_ERROR", SERVER_ERROR_MESSAGE, null, error));
  }
};

// ✅ Get profile
exports.getProfile = async (req, res) => {
  try {
    let userId = req.decoded.id;

    let user = await UserService.getOneUserByCond({ _id: userId });
    console.log(user);
    user = getRawData(user);

    return res
      .status(httpRes.OK)
      .json(prepareResponse("OK", "User profile", user, null));
  } catch (error) {
    console.error(error);
    return res
      .status(httpRes.SERVER_ERROR)
      .json(prepareResponse("SERVER_ERROR", SERVER_ERROR_MESSAGE, null, error));
  }
};

// ✅ Update profile
exports.updateProfile = async (req, res) => {
  try {
    const userId = req.decoded.id;
    const updateData = req.body;

    console.log("=== UPDATE STARTED ===");
    console.log("User ID:", userId);
    console.log("Raw update data:", JSON.stringify(updateData, null, 2));

    // Get current user data BEFORE update
    const currentUser = await UserService.getOneUserByCond({ _id: userId });
    console.log(
      "Current user data:",
      JSON.stringify(getRawData(currentUser), null, 2)
    );

    const update = { $set: updateData };
    const updatedUser = await UserService.updateUser1({ _id: userId }, update, {
      new: true,
    });

    console.log("Update result:", updatedUser);

    // Get user data AFTER update
    const refreshedUser = await UserService.getOneUserByCond({ _id: userId });
    console.log(
      "Refreshed user data:",
      JSON.stringify(getRawData(refreshedUser), null, 2)
    );

    return res
      .status(httpRes.OK)
      .json(prepareResponse("OK", UPDATE_PROFILE_SUCCESS, refreshedUser, null));
  } catch (error) {
    console.error("Update failed:", error);
    return res
      .status(httpRes.SERVER_ERROR)
      .json(
        prepareResponse(
          "SERVER_ERROR",
          SERVER_ERROR_MESSAGE,
          null,
          error.message
        )
      );
  }
};

// ✅ Track login and add credits if first login of the day
exports.trackLoginAndAddCredits = async (req, res) => {
  try {
    const userId = req.decoded.id;

    // 1. Get current user
    let user = await UserService.getOneUserByCond({ _id: userId });
    user = getRawData(user);

    if (!user) {
      return res
        .status(httpRes.NOT_FOUND)
        .json(prepareResponse("NOT_FOUND", ACCOUNT_NOT_FOUND, null, null));
    }

    // 2. Prepare dates for comparison
    const now = new Date();
    const todayDateOnly = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate()
    );

    // 3. Check conditions
    const isFirstTimeLogin = !user.lastLoginDate;
    const isProfileJustCompleted =
      user.profileCompleted && !user.profileBonusGiven;
    const lastLoginDate = user.lastLoginDate
      ? new Date(user.lastLoginDate)
      : null;
    const lastLoginDateOnly = lastLoginDate
      ? new Date(
          lastLoginDate.getFullYear(),
          lastLoginDate.getMonth(),
          lastLoginDate.getDate()
        )
      : null;

    // 4. Calculate credits
    let creditsToAdd = 0;
    let creditReasons = [];
    const update = { $set: { lastLoginDate: now } };

    // Daily login bonus (10 points, once per day)
    if (
      isFirstTimeLogin ||
      !lastLoginDateOnly ||
      lastLoginDateOnly < todayDateOnly
    ) {
      creditsToAdd += 10;
      creditReasons.push("Daily login bonus: +10 points");
    }

    // One-time profile completion bonus (50 points)
    if (isProfileJustCompleted) {
      creditsToAdd += 50;
      creditReasons.push("Profile completion bonus: +50 points");
      update.$set.profileBonusGiven = true; // Mark as given
    }

    // 5. Apply credits if any
    if (creditsToAdd > 0) {
      update.$set.credits = (user.credits || 0) + creditsToAdd;
    }

    // 6. Update user
    const updatedUser = await UserService.updateUser1({ _id: userId }, update, {
      new: true,
    });

    // 7. Return response
    return res.status(httpRes.OK).json(
      prepareResponse(
        "OK",
        "Login tracked successfully",
        {
          ...getRawData(updatedUser),
          creditsAdded: creditsToAdd,
          creditReasons,
          isFirstTimeLogin,
          isProfileCompleted: user.profileCompleted,
          profileBonusGiven: isProfileJustCompleted || user.profileBonusGiven,
          currentCredits: updatedUser.credits,
        },
        null
      )
    );
  } catch (error) {
    console.error("Login tracking error:", error);
    return res
      .status(httpRes.SERVER_ERROR)
      .json(
        prepareResponse(
          "SERVER_ERROR",
          SERVER_ERROR_MESSAGE,
          null,
          error.message
        )
      );
  }
};

// ✅ Add 10 credits to user
exports.addCredits = async (req, res) => {
  try {
    const userId = req.decoded.id;

    // Get current user
    let user = await UserService.getOneUserByCond({ _id: userId });
    user = getRawData(user);

    if (!user) {
      return res
        .status(httpRes.NOT_FOUND)
        .json(prepareResponse("NOT_FOUND", ACCOUNT_NOT_FOUND, null, null));
    }

    // Update credits by adding 10 points
    const updatedUser = await UserService.updateUser1(
      { _id: userId },
      { $inc: { credits: 5 } }, // Using $inc to atomically increment
      { new: true }
    );

    return res.status(httpRes.OK).json(
      prepareResponse(
        "OK",
        "10 credits added successfully",
        {
          previousCredits: user.credits || 0,
          newCredits: updatedUser.credits,
          creditsAdded: 10,
        },
        null
      )
    );
  } catch (error) {
    console.error("Add credits error:", error);
    return res
      .status(httpRes.SERVER_ERROR)
      .json(
        prepareResponse(
          "SERVER_ERROR",
          SERVER_ERROR_MESSAGE,
          null,
          error.message
        )
      );
  }
};
