require("dotenv").config();
const express = require("express");
const connectDB=require('./config/db.config')
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");



// Initialize Express
const app = express();

// Middleware
app.use(cors());
app.use(helmet()); 
app.use(morgan("dev")); 
app.use(express.json()); 

// MongoDB Atlas Connection
connectDB(); 





// routes
app.use('/api',require('./routes/index'))

// Health Check Endpoint
app.get("/", (req, res) => {
  res.status(200).json({ status: "OK", message: "Creator Dashboard API" });
});

// Error Handling Middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: "Internal Server Error" });
});

// Server Setup
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});