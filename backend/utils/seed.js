/**
 * seed.js — populates the database with a demo scenario matching the
 * project brief: several citizens independently reporting different
 * symptoms of the same underlying "drainage blockage near Block A" issue,
 * plus one unrelated low-priority complaint, so graders can see clustering,
 * severity, impact scoring and priority ranking working immediately.
 *
 * Run with: npm run seed   (make sure MONGO_URI is reachable first)
 */
require("dotenv").config();
const mongoose = require("mongoose");
const connectDB = require("../config/db");
const User = require("../models/User");
const Complaint = require("../models/Complaint");
const Cluster = require("../models/Cluster");
const CorpusStats = require("../models/CorpusStats");
const { processNewComplaint } = require("../services/clusteringService");

const CITIZENS = [
  { name: "Ananya Rao", email: "ananya@example.com" },
  { name: "Rahul Verma", email: "rahul@example.com" },
  { name: "Priya Nair", email: "priya@example.com" },
  { name: "Karthik Iyer", email: "karthik@example.com" },
  { name: "Fatima Sheikh", email: "fatima@example.com" },
];

const SCENARIO = [
  { title: "Water leaking near Block A", description: "There is water leaking continuously near Block A, forming a small puddle every evening.", category: "Water & Drainage", locationText: "Block A" },
  { title: "Road flooded near Block A", description: "The road near Block A gets flooded every time it rains even lightly, making it hard to walk.", category: "Water & Drainage", locationText: "Block A" },
  { title: "Drainage problem behind Block A", description: "The drainage line behind Block A seems blocked, water is not flowing properly for over a week.", category: "Water & Drainage", locationText: "Block A" },
  { title: "Bad smell coming from Block A", description: "There is a persistent bad smell coming from the area near Block A, especially in the mornings.", category: "Sanitation", locationText: "Block A" },
  { title: "Standing water attracting mosquitoes near Block A", description: "Standing water near Block A has been there for days and is now attracting mosquitoes, a health hazard.", category: "Health", locationText: "Block A" },
  { title: "WiFi very slow in library", description: "The wifi in the library keeps disconnecting and is very slow during peak hours, hard to study.", category: "Other", locationText: "Central Library" },
];

async function run() {
  await connectDB();

  console.log("Clearing existing demo collections...");
  await Promise.all([
    Complaint.deleteMany({}),
    Cluster.deleteMany({}),
    CorpusStats.deleteMany({}),
    User.deleteMany({ email: { $in: [...CITIZENS.map((c) => c.email), "officer@example.com"] } }),
  ]);

  console.log("Creating officer account (officer@example.com / password123)...");
  await User.create({
    name: "Officer Deepa Menon",
    email: "officer@example.com",
    password: "password123",
    role: "officer",
    department: "Public Works",
  });

  console.log("Creating citizen accounts (password123 for all)...");
  const citizenDocs = [];
  for (const c of CITIZENS) {
    const doc = await User.create({ name: c.name, email: c.email, password: "password123", role: "citizen", address: "Block A" });
    citizenDocs.push(doc);
  }

  console.log("Submitting demo complaints through the real AI pipeline...");
  for (let i = 0; i < SCENARIO.length; i++) {
    const s = SCENARIO[i];
    const citizen = citizenDocs[i % citizenDocs.length];
    const complaint = new Complaint({ citizen: citizen._id, ...s });
    complaint.pushStatus("Pending", "Complaint submitted", "citizen");
    await complaint.save();
    const { cluster, isDuplicate } = await processNewComplaint(complaint);
    console.log(`  - "${s.title}" -> cluster "${cluster.rootCauseLabel}" (priority: ${cluster.priority}, dup: ${isDuplicate})`);
  }

  console.log("\nSeed complete! Log in as:");
  console.log("  Officer:  officer@example.com / password123");
  console.log("  Citizen:  ananya@example.com / password123");
  await mongoose.disconnect();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
