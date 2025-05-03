const mongooseModels = require("../models/mappingIndex"); // Assuming similar dynamic model mapping

// CREATE one document
const addData = async (collectionName, obj) => {
  return await mongooseModels[collectionName].create(obj);
};

// CREATE many documents
const addBulkCreate = async (collectionName, objArray) => {
  return await mongooseModels[collectionName].insertMany(objArray);
};

// READ all data
const getAllData = async (collectionName) => {
  return await mongooseModels[collectionName].find();
};

// READ data with condition
const getAllDataByCond = async (collectionName, cond) => {
  if (cond.fieldName && cond.fieldName.toLowerCase().includes("date")) {
    cond[cond.fieldName] = { $gte: new Date(cond.fieldValue) };
    delete cond.fieldName;
    delete cond.fieldValue;
  }
  return await mongooseModels[collectionName].find(cond);
};

// READ one data with condition
const getOneDataByCond = async (collectionName, id) => {
  return await mongooseModels[collectionName].findById(id);
};

// UPDATE data with condition
const updateData = async (collectionName, cond, updateObj) => {
  return await mongooseModels[collectionName].updateOne(
    { _id: cond },
    updateObj
  ); // or updateOne
};

// DELETE data with condition
const deleteData = async (collectionName, cond) => {
  return await mongooseModels[collectionName].deleteMany(cond); // or deleteOne
};

// GET paginated + filtered data
const getAllDataByCondAndPagination = async (
  collectionName,
  cond = {},
  page = 0,
  pageSize = 10,
  sortOrder = { createdAt: -1 } // Default sort by newest first
) => {
  try {
    // Validate input parameters
    if (!mongooseModels[collectionName]) {
      throw new Error(`Collection ${collectionName} not found`);
    }

    // Extract filter and fields from cond
    const { filter = "", fields = [], ...restCond } = cond;

    // Build the query
    const query = { ...restCond };

    // Add text search if filter and fields are provided
    if (filter && fields.length > 0) {
      query.$or = fields.map((field) => ({
        [field]: { $regex: filter, $options: "i" },
      }));
    }

    // Calculate pagination values
    const skip = page * pageSize;
    const limit = pageSize;

    // Convert sortOrder to MongoDB format if needed
    const mongoSort = convertSortOrder(sortOrder);

    // Execute query with pagination and sorting
    const data = await mongooseModels[collectionName]
      .find(query)
      .sort(mongoSort)
      .skip(skip)
      .limit(limit)
      .lean(); // Use lean() for better performance with plain JS objects

    // Get total count (consider using estimatedDocumentCount for large collections)
    const total = await mongooseModels[collectionName].countDocuments(query);

    return {
      rows: data,
      count: total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  } catch (error) {
    console.error(`Error in getAllDataByCondAndPagination: ${error.message}`);
    throw error; // Re-throw the error for the calling function to handle
  }
};

// Helper function to convert various sort order formats to MongoDB format
const convertSortOrder = (sortOrder) => {
  if (!sortOrder) return { createdAt: -1 }; // Default sort

  // If array format (Sequelize-style) [["field", "direction"]]
  if (Array.isArray(sortOrder)) {
    return sortOrder.reduce((acc, [field, direction]) => {
      acc[field] = direction === "ASC" ? 1 : -1;
      return acc;
    }, {});
  }

  // If object format { field: 'asc'/'desc' }
  if (typeof sortOrder === "object") {
    return Object.entries(sortOrder).reduce((acc, [field, direction]) => {
      acc[field] = direction.toLowerCase() === "asc" ? 1 : -1;
      return acc;
    }, {});
  }

  // Default case
  return { createdAt: -1 };
};

// GET data with populated (hasMany)
const getAllDataByCondWithHasAll = async (
  collectionName,
  cond,
  populateField
) => {
  return await mongooseModels[collectionName]
    .find(cond)
    .populate(populateField);
};

// GET one data with populated (belongsTo)
const getOneDataByCondWithBelongsTo = async (
  collectionName,
  cond,
  populateField
) => {
  return await mongooseModels[collectionName]
    .findOne(cond)
    .populate(populateField);
};

// Exporting all functions
module.exports = {
  addData,
  addBulkCreate,
  updateData,
  deleteData,
  getAllData,
  getAllDataByCond,
  getOneDataByCond,
  getAllDataByCondAndPagination,
  getAllDataByCondWithHasAll,
  getOneDataByCondWithBelongsTo,
};
