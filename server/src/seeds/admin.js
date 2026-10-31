// Creates the first admin from server/.env. Run with: npm run seed
import '../app.js';
import { connectDb, disconnectDb } from '../config/db.js';
import { ensureAdmin } from '../services/user.service.js';

await connectDb();
await ensureAdmin();
await disconnectDb();
