import 'dotenv/config';
import mongoose from 'mongoose';
import dbConnect from '../lib/mongodb';
import Lead from '../lib/models/Lead';

async function run() {
  await dbConnect();
  console.log('--- DATABASE COUNT AUDIT ---');
  const total = await Lead.countDocuments({});
  console.log('Total Leads in DB:', total);

  const statuses = await Lead.aggregate([
    { $group: { _id: '$status', count: { $sum: 1 } } }
  ]);
  console.log('Statuses:', statuses);

  const verdicts = await Lead.aggregate([
    { $group: { _id: '$verdict', count: { $sum: 1 } } }
  ]);
  console.log('Verdicts:', verdicts);

  const pushedAndVerdict = await Lead.aggregate([
    { $group: { _id: { status: '$status', verdict: '$verdict' }, count: { $sum: 1 } } }
  ]);
  console.log('Status + Verdict Mix:', pushedAndVerdict);

  mongoose.connection.close();
}

run().catch(console.error);
