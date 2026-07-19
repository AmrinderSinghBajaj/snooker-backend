import 'dotenv/config';
import { connectDB } from './src/db.js';
import Club from './src/models/Club.js';
import AdminUser from './src/models/AdminUser.js';
import Asset from './src/models/Asset.js';
import Customer from './src/models/Customer.js';
import GameSession from './src/models/GameSession.js';

async function run() {
  await connectDB();
  console.log('--- COLLECTION COUNTS ---');
  console.log('Clubs:', await Club.countDocuments({}));
  console.log('AdminUsers:', await AdminUser.countDocuments({}));
  console.log('Assets:', await Asset.countDocuments({}));
  console.log('Customers:', await Customer.countDocuments({}));
  console.log('GameSessions:', await GameSession.countDocuments({}));
  process.exit(0);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
