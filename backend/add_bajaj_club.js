import 'dotenv/config';
import { connectDB } from './src/db.js';
import Club from './src/models/Club.js';
import AdminUser from './src/models/AdminUser.js';
import Asset from './src/models/Asset.js';
import { hashPassword } from './src/utils/security.js';

async function run() {
  await connectDB();
  
  console.log('Checking if bajaj club exists...');
  let club = await Club.findOne({ subdomain: 'bajaj' });
  
  if (!club) {
    console.log('Creating bajaj club...');
    club = await Club.create({
      subdomain: 'bajaj',
      name: 'Bajaj Snooker Arena',
      ownerName: 'Amrinder Singh Bajaj',
      targetDaily: 2000,
      themePrimary: '#0b2b22',
      themeSecondary: '#c9a24b',
      logoUrl: '/static/logo_bajaj.png',
      customDomain: 'bajajsnooker.shop'
    });
    console.log('Bajaj club created successfully!');
  } else {
    console.log('Bajaj club already exists. Updating customDomain...');
    club.customDomain = 'bajajsnooker.shop';
    club.logoUrl = '/static/logo_bajaj.png';
    await club.save();
    console.log('Bajaj club updated.');
  }

  console.log('Checking if bajajowner user exists...');
  let admin = await AdminUser.findOne({ username: 'bajajowner' });
  if (!admin) {
    console.log('Creating bajajowner admin user...');
    const passwordHash = await hashPassword('amrinder5397');
    admin = await AdminUser.create({
      username: 'bajajowner',
      hashedPassword: passwordHash,
      fullName: 'Amrinder Singh Bajaj',
      clubId: club._id,
      role: 'Club Owner',
    });
    console.log('bajajowner admin user created successfully!');
  } else {
    console.log('bajajowner admin user already exists.');
  }

  // Seed some initial assets if they don't exist for this club
  const assetCount = await Asset.countDocuments({ clubId: club._id });
  if (assetCount === 0) {
    console.log('Seeding initial assets for Bajaj Snooker Arena...');
    await Asset.create([
      { clubId: club._id, category: 'Snooker', label: 'Table 1', hourlyRate: 200, status: 'idle' },
      { clubId: club._id, category: 'Pool', label: 'Table 2', hourlyRate: 150, status: 'idle' },
      { clubId: club._id, category: 'PlayStation', label: 'PS5 Unit 1', hourlyRate: 100, status: 'idle' },
    ]);
    console.log('Initial assets seeded.');
  } else {
    console.log('Assets already exist for Bajaj Snooker Arena.');
  }

  console.log('✓ Migration script finished successfully.');
  process.exit(0);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
