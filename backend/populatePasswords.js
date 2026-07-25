import 'dotenv/config';
import { connectDB } from './src/db.js';
import AdminUser from './src/models/AdminUser.js';

async function run() {
  console.log('Connecting to database...');
  await connectDB();

  const updates = [
    { username: 'bajajowner', plain: 'amrinder5397' },
    { username: 'beerbalji', plain: 'ChangeMe123!' },
    { username: 'shooters', plain: 'Changeme123!' }
  ];

  for (const item of updates) {
    const user = await AdminUser.findOne({ username: item.username });
    if (user) {
      console.log(`Updating plainPassword field for ${item.username}...`);
      user.plainPassword = item.plain;
      await user.save();
    } else {
      console.log(`User ${item.username} not found.`);
    }
  }

  console.log('Done updating passwords!');
  process.exit(0);
}

run().catch(err => {
  console.error('Error updating passwords:', err);
  process.exit(1);
});
