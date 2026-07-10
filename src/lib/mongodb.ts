import mongoose from 'mongoose';

// Side-effect imports: register every schema with Mongoose as soon as a
// connection is requested, regardless of which models the calling file
// imports directly. Next.js bundles each route/page into its own
// serverless function, so a page that only imports Job but does
// `.populate('employerId', ...)` (a User ref) will throw
// MissingSchemaError on a cold start where nothing else in that function's
// bundle happened to import User first. That error was being swallowed by
// broad try/catch blocks and surfacing as a wrong 404 -- see the git log
// for the incident. Importing all models here, once, closes the whole
// class of bug instead of chasing individual populate() call sites.
import '@/models/User';
import '@/models/Job';
import '@/models/Application';
import '@/models/Logbook';

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error(
    'Please define the MONGODB_URI environment variable inside .env.local'
  );
}

type MongooseCache = { conn: typeof mongoose | null; promise: Promise<typeof mongoose> | null };

declare global {
  var mongoose: MongooseCache | undefined;
}

// In Next.js in development, we want to cache the connection
// to avoid creating multiple connections during hot reloading.
const cached: MongooseCache = global.mongoose ?? (global.mongoose = { conn: null, promise: null });

async function connectToDatabase() {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
      serverSelectionTimeoutMS: 5000, // Fail after 5 seconds instead of hanging
    };

    cached.promise = mongoose.connect(MONGODB_URI!, opts).then((mongoose) => {
      return mongoose;
    }).catch(err => {
      cached.promise = null;
      throw err;
    });
  }
  cached.conn = await cached.promise;
  return cached.conn;
}

export { connectToDatabase };
