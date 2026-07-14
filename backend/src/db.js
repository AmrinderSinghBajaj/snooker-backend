import mongoose from 'mongoose';
import 'dotenv/config';

const MONGODB_URI = process.env.MONGODB_URI || "mongodb+srv://amrinder5397_db_user:CQ3ZCxRJTXZ9LTCb@cluster0.ugwiwz.mongodb.net/?retryWrites=true&w=majority";
export async function connectDB() {
  try {
    console.log(MONGODB_URI);
    await mongoose.connect(MONGODB_URI);
    console.log('MongoDB connected:', mongoose.connection.host);
  } catch (err) {
    console.error('MongoDB connection error:', err.message);
    process.exit(1);
  }
}

export default mongoose;
