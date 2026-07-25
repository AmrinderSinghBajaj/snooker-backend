import 'dotenv/config';
import { connectDB } from './src/db.js';
import AdminUser from './src/models/AdminUser.js';
import { hashPassword } from './src/utils/security.js';

async function run() {
  console.log('Connecting to database...');
  await connectDB();

  const exists = await AdminUser.findOne({ username: 'superadmin' });
  if (exists) {
    console.log('Super Admin user already exists. Updating password to default...');
    exists.hashedPassword = await hashPassword('SuperAdmin123!');
    exists.plainPassword = 'SuperAdmin123!';
    await exists.save();
    console.log('Super Admin password updated successfully!');
  } else {
    console.log('Creating Super Admin account...');
    await AdminUser.create({
      username: 'superadmin',
      hashedPassword: await hashPassword('SuperAdmin123!'),
      fullName: 'Super Admin',
      role: 'superadmin',
      plainPassword: 'SuperAdmin123!'
    });
    console.log('Super Admin account created successfully!');
  }
  console.log('Done!');
  process.exit(0);
}

run().catch(err => {
  console.error('Error seeding superadmin:', err);
  process.exit(1);
});
