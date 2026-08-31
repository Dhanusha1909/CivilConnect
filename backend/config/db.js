const mongoose = require("mongoose");
const dns = require("dns");

// Ensure MongoDB Atlas SRV lookup works across all network/ISP configurations
try {
  dns.setServers(["8.8.8.8", "1.1.1.1"]);
} catch (e) {
  // fallback silently if custom DNS cannot be set
}

async function connectDB() {
  const uri = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/rootcauseai";
  try {
    await mongoose.connect(uri);
    console.log(`[DB] Connected to MongoDB: ${uri}`);
  } catch (err) {
    console.error("[DB] Connection error:", err.message);
    process.exit(1);
  }
}

module.exports = connectDB;
