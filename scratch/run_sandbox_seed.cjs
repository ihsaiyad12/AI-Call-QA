require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const fs = require('fs').promises;
const path = require('path');

// Models (or local schemas to avoid ESM compile issues)
const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, required: true }
}, {
  timestamps: true,
  collection: 'Users'
});
const User = mongoose.models.User || mongoose.model('User', UserSchema);

const LeadSchema = new mongoose.Schema({
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  email: { type: String, required: true },
  phone: { type: String, required: true },
  category: { type: String, required: true },
  employeeCount: { type: String, required: true },
  jobTitle: { type: String },
  company: { type: String, default: null },
  industry: { type: String, default: null },
  transcript: { type: String, default: '' },
  verdict: { type: String, default: null },
  score: { type: Number, default: 0 },
  reasoning: { type: String, default: '' },
  intent: { type: Number },
  authority: { type: Number },
  demo_commitment: { type: Number },
  timeline: { type: Number },
  industry_fit: { type: Number },
  risk_level: { type: String, default: null },
  icp_category: { type: String, default: null },
  status: { type: String, default: 'PENDING' },
  disqualificationComment: { type: String, default: null },
  emailStatus: { type: String, default: null },
  emailStatusRaw: { type: String, default: null },
  addedBy: { type: String, default: null },
  aiProvider: { type: String, default: null },
  isDeleted: { type: Boolean, default: false },
  createdAtEST: { type: String, default: null },
}, {
  timestamps: true,
  collection: 'Leads'
});
const Lead = mongoose.models.Lead || mongoose.model('Lead', LeadSchema);

// Connection URI
let MONGODB_URI = process.env.MONGODB_URI;

function getDummyUri(uri) {
  try {
    const protocolIdx = uri.indexOf("://");
    if (protocolIdx === -1) return uri + "_dummy";
    
    const afterProtocol = uri.substring(protocolIdx + 3);
    const slashIdx = afterProtocol.indexOf("/");
    if (slashIdx === -1) {
      return uri + "/Call_QA_dummy";
    }
    
    const pathStart = protocolIdx + 3 + slashIdx;
    const path = uri.substring(pathStart);
    
    const qIdx = path.indexOf("?");
    let dbName = qIdx === -1 ? path.substring(1) : path.substring(1, qIdx);
    const options = qIdx === -1 ? "" : path.substring(qIdx);
    
    if (!dbName) {
      dbName = "Call_QA_dummy";
    } else if (!dbName.endsWith("_dummy")) {
      dbName = dbName + "_dummy";
    }
    
    return uri.substring(0, pathStart) + "/" + dbName + options;
  } catch (e) {
    return uri + "_dummy";
  }
}

if (process.env.NEXT_PUBLIC_USE_DUMMY_DB === 'true' || process.env.USE_DUMMY_DB === 'true') {
  MONGODB_URI = process.env.MONGODB_URI_DUMMY || getDummyUri(MONGODB_URI);
}

async function runSeed() {
  try {
    console.log('Connecting to database:', MONGODB_URI);
    await mongoose.connect(MONGODB_URI);
    console.log('Connected. Clearing collections...');

    await User.deleteMany({});
    await Lead.deleteMany({});
    console.log('Collections cleared.');

    console.log('Seeding default users...');
    const salt = await bcrypt.genSalt(10);
    const usersToSeed = [
      { username: 'admin', password: 'admin@523523', role: 'super-admin' },
      { username: 'analyst', password: 'analyst123', role: 'analyst' },
      { username: 'agent', password: 'agent123', role: 'agent' },
    ];
    for (const u of usersToSeed) {
      const hashedPassword = await bcrypt.hash(u.password, salt);
      await User.create({
        username: u.username,
        password: hashedPassword,
        role: u.role,
      });
    }
    console.log('Seeded users successfully.');

    console.log('Loading leads.db.json...');
    const jsonPath = path.join(__dirname, '..', 'leads.db.json');
    const jsonRaw = await fs.readFile(jsonPath, 'utf8');
    const { leads } = JSON.parse(jsonRaw);

    if (Array.isArray(leads) && leads.length > 0) {
      console.log(`Seeding ${leads.length} leads...`);
      const leadsToInsert = leads.map(l => {
        const { id, _id, ...cleanLead } = l;
        return {
          ...cleanLead,
          createdAt: l.createdAt ? new Date(l.createdAt) : new Date(),
          updatedAt: l.updatedAt ? new Date(l.updatedAt) : new Date(),
        };
      });
      await Lead.insertMany(leadsToInsert);
      console.log('🎉 Seeded mock leads successfully!');
    }

  } catch (err) {
    console.error('Seeding error:', err);
  } finally {
    await mongoose.disconnect();
    console.log('Done.');
  }
}

runSeed();
