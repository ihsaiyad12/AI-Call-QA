require('dotenv').config();
const mongoose = require('mongoose');

// Sourced from lib/mongodb.ts
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
    const path = uri.substring(pathStart); // e.g. "/Call_QA?retryWrites=true"
    
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
    console.error("Error parsing MongoDB URI:", e);
    return uri + "_dummy";
  }
}

const useDummy = process.env.NEXT_PUBLIC_USE_DUMMY_DB === 'true' || process.env.USE_DUMMY_DB === 'true';
console.log('useDummy flag:', useDummy);

if (useDummy) {
  if (process.env.MONGODB_URI_DUMMY) {
    MONGODB_URI = process.env.MONGODB_URI_DUMMY;
  } else if (MONGODB_URI) {
    MONGODB_URI = getDummyUri(MONGODB_URI);
  }
}

console.log('Selected connection URI:', MONGODB_URI);

async function testConnection() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connection Successful!');
    console.log('Connected Database Name:', mongoose.connection.name);
    
    if (mongoose.connection.name.endsWith('_dummy')) {
      console.log('🎉 Verification Success: Securely redirected to dummy database!');
    } else {
      console.error('❌ Verification Failure: Database does not end with _dummy!');
    }
  } catch (err) {
    console.error('Connection failed:', err);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected.');
  }
}

testConnection();
