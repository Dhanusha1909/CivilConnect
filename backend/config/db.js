const mongoose = require("mongoose");

// On local Windows development with strict ISP DNS, use public DNS for SRV records
if (process.platform === "win32") {
  try {
    const dns = require("dns");
    dns.setServers(["8.8.8.8", "1.1.1.1"]);
  } catch (e) {}
}

async function connectDB() {
  const uri = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/rootcauseai";
  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 15000,
    });
    console.log(`[DB] Connected to MongoDB`);
  } catch (err) {
    console.error("[DB] Connection error:", err.message);
  }
}

module.exports = connectDB;
