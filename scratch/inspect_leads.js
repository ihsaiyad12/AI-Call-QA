import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env
dotenv.config({ path: path.join(__dirname, '../.env') });

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('Error: MONGODB_URI is not defined in .env file');
  process.exit(1);
}

const LeadSchema = new mongoose.Schema({
  firstName: String,
  lastName: String,
  email: String,
  phone: String,
  status: String,
  isDeleted: { type: Boolean, default: false },
  createdAt: Date
}, { collection: 'Leads' });

const Lead = mongoose.model('Lead', LeadSchema);

async function run() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const leads = await Lead.find({ isDeleted: { $ne: true } }).lean();
    
    // Group leads by normalized email (lowercase, trimmed)
    const normalizedGroups = {};
    leads.forEach(lead => {
      const normEmail = lead.email ? lead.email.toLowerCase().trim() : '';
      if (!normalizedGroups[normEmail]) {
        normalizedGroups[normEmail] = [];
      }
      normalizedGroups[normEmail].push(lead);
    });

    console.log('\n--- Duplicate Groups (Case Insensitive and Trimmed) ---');
    let groupCount = 0;
    for (const [normEmail, records] of Object.entries(normalizedGroups)) {
      if (records.length > 1) {
        groupCount++;
        console.log(`\nGroup ${groupCount}: Normalized Email: "${normEmail}" (${records.length} records)`);
        records.forEach(r => {
          console.log(`  - ID: ${r._id} | Exact Email field in DB: "${r.email}" | Name: ${r.firstName} ${r.lastName} | Phone: "${r.phone}" | Status: ${r.status} | CreatedAt: ${r.createdAt}`);
        });
      }
    }

  } catch (error) {
    console.error('Database connection or query failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB.');
  }
}

run();
