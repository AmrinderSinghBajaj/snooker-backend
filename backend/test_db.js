import 'dotenv/config';
import { connectDB } from './src/db.js';
import Club from './src/models/Club.js';

async function run() {
  await connectDB();
  const clubs = await Club.find({});
  console.log('CLUBS_DATA_START');
  console.log(JSON.stringify(clubs, null, 2));
  console.log('CLUBS_DATA_END');
  process.exit(0);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
