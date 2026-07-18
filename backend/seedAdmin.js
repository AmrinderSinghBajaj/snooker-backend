import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDB } from './src/db.js';
import Club from './src/models/Club.js';
import AdminUser from './src/models/AdminUser.js';
import Asset from './src/models/Asset.js';
import Customer from './src/models/Customer.js';
import FoodItem from './src/models/FoodItem.js';
import GameSession from './src/models/GameSession.js';
import { hashPassword } from './src/utils/security.js';

async function seed() {
  console.log('Connecting to database...');
  await connectDB();

  console.log('Dropping legacy single-tenant unique indexes...');
  try {
    await Customer.collection.dropIndex('username_1');
    console.log('Dropped unique index username_1 from customers.');
  } catch (e) {
    // Index may not exist or already dropped, ignore
  }

  try {
    await GameSession.collection.dropIndex('serialNumber_1');
    console.log('Dropped unique index serialNumber_1 from gamesessions.');
  } catch (e) {
    // Index may not exist or already dropped, ignore
  }

  console.log('Clearing old database records for multi-tenant migration...');
  await Promise.all([
    Club.deleteMany({}),
    AdminUser.deleteMany({}),
    Asset.deleteMany({}),
    Customer.deleteMany({}),
    FoodItem.deleteMany({}),
    GameSession.deleteMany({}),
  ]);

  console.log('Creating Clubs (Tenants)...');
  const club1 = await Club.create({
    subdomain: 'arena',
    name: 'The Billiards Arena',
    ownerName: 'Beerbal Ji',
    targetDaily: 2000,
    themePrimary: '#0b2b22', // Felt Green theme
    themeSecondary: '#c9a24b', // Brass Gold theme
    customDomain: 'thebilliardarena.shop',
  });

  const club2 = await Club.create({
    subdomain: 'metro',
    name: 'Metro Cue Club',
    ownerName: 'Jane Doe',
    targetDaily: 4500,
    themePrimary: '#1a1a2e', // Deep Space Blue theme
    themeSecondary: '#e3c878', // Warm Gold theme
  });

  const club3 = await Club.create({
    subdomain: 'bajaj',
    name: 'Bajaj Snooker Arena',
    ownerName: 'Amrinder Singh Bajaj',
    targetDaily: 2000,
    themePrimary: '#0b2b22',
    themeSecondary: '#c9a24b',
    logoUrl: '/static/logo_bajaj.png',
    customDomain: 'bajajsnooker.shop'
  });

  console.log('Creating Admin Users...');
  const passwordHash = await hashPassword('ChangeMe123!');

  await AdminUser.create({
    username: 'beerbalji',
    hashedPassword: passwordHash,
    fullName: 'Beerbal Ji',
    clubId: club1._id,
    role: 'Club Owner',
  });

  await AdminUser.create({
    username: 'metroowner',
    hashedPassword: passwordHash,
    fullName: 'Jane Doe',
    clubId: club2._id,
    role: 'Club Owner',
  });

  const bajajPasswordHash = await hashPassword('amrinder5397');

  await AdminUser.create({
    username: 'bajajowner',
    hashedPassword: bajajPasswordHash,
    fullName: 'Amrinder Singh Bajaj',
    clubId: club3._id,
    role: 'Club Owner',
  });

  console.log('Seeding Assets (Tables & Devices)...');
  // Club 1 Assets
  await Asset.create([
    { clubId: club1._id, category: 'Heyball', label: 'Table 1', hourlyRate: 150, status: 'idle' },
    { clubId: club1._id, category: 'Heyball', label: 'Table 2', hourlyRate: 150, status: 'idle' },
    { clubId: club1._id, category: 'PlayStation', label: 'PS5 Unit 1', hourlyRate: 100, status: 'idle' },
  ]);

  // Club 2 Assets
  await Asset.create([
    { clubId: club2._id, category: 'Snooker', label: 'Table 1', hourlyRate: 250, status: 'idle' },
    { clubId: club2._id, category: 'Pool', label: 'Table 2', hourlyRate: 200, status: 'idle' },
    { clubId: club2._id, category: 'Carrom', label: 'Board 1', hourlyRate: 50, status: 'idle' },
  ]);

  // Club 3 Assets
  await Asset.create([
    { clubId: club3._id, category: 'Snooker', label: 'Table 1', hourlyRate: 200, status: 'idle' },
    { clubId: club3._id, category: 'Pool', label: 'Table 2', hourlyRate: 150, status: 'idle' },
    { clubId: club3._id, category: 'PlayStation', label: 'PS5 Unit 1', hourlyRate: 100, status: 'idle' },
  ]);

  console.log('Seeding Customers...');
  // Club 1 Customers
  await Customer.create([
    { clubId: club1._id, username: 'john_doe', displayName: 'John Doe' },
    { clubId: club1._id, username: 'sara_smith', displayName: 'Sara Smith' },
    { clubId: club1._id, username: 'aman_verma', displayName: 'Aman Verma' },
  ]);

  // Club 2 Customers
  await Customer.create([
    { clubId: club2._id, username: 'david_miller', displayName: 'David Miller' },
    { clubId: club2._id, username: 'alice_wong', displayName: 'Alice Wong' },
    { clubId: club2._id, username: 'aman_verma', displayName: 'Aman Verma' }, // identical name test
  ]);

  // Club 3 Customers
  await Customer.create([
    { clubId: club3._id, username: 'harpreet_singh', displayName: 'Harpreet Singh' },
    { clubId: club3._id, username: 'gurpreet_singh', displayName: 'Gurpreet Singh' },
  ]);

  console.log('Seeding Food & Drink Menus...');
  // Club 1 Menu
  await FoodItem.create([
    { clubId: club1._id, name: 'Tea', price: 30 },
    { clubId: club1._id, name: 'Coffe', price: 40 },
    { clubId: club1._id, name: 'Maggi', price: 60 },
  ]);

  // Club 2 Menu
  await FoodItem.create([
    { clubId: club2._id, name: 'Sandwitch', price: 120 },
    { clubId: club2._id, name: 'french fries', price: 90 },
    { clubId: club2._id, name: 'Coke', price: 40 },
  ]);

  // Club 3 Menu
  await FoodItem.create([
    { clubId: club3._id, name: 'Samosa', price: 20 },
    { clubId: club3._id, name: 'Tea', price: 15 },
    { clubId: club3._id, name: 'Cold Drink', price: 40 },
  ]);

  console.log('✓ Multi-tenant database successfully seeded.');
  console.log('Credentials:');
  console.log('  - Club 1 ("arena"): beerbalji / ChangeMe123!');
  console.log('  - Club 2 ("metro"): metroowner / ChangeMe123!');
  console.log('  - Club 3 ("bajaj"): bajajowner / amrinder5397!');
  process.exit(0);
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
