const User = require("../models/user.model");

// Create a new user
let addData = async (obj) => {
  return await User.create(obj);
};

// Insert multiple users (bulk insert)
let addBulkData = async (obj) => {
  return await User.insertMany(obj);
};

// Find one user by condition
let getOneUserByCond = async (cond) => {
  return await User.findOne(cond);
};

// Update user by condition
let updateUser = async (id, updateData, options = {}) => {
  return await User.findOneAndUpdate(id, updateData, {
    new: true,
    ...options,
  });
};

let updateUser1 = async (cond, updateObj, options = {}) => {
  return await User.findOneAndUpdate(cond, updateObj, {
    new: true,
    ...options,
  });
};

// Delete user by condition
let deleteUser = async (cond) => {
  return await User.deleteOne(cond);
};

module.exports = {
  addData,
  addBulkData,
  getOneUserByCond,
  updateUser,
  updateUser1,
  deleteUser,
};
