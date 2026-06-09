import mongoose from "mongoose";

/**
 * Serverless-safe Mongo connection.
 * Vercel functions are invoked many times on a warm instance, so we cache the
 * connection on globalThis and reuse it instead of reconnecting every request
 * (which would exhaust Atlas connections).
 */
let cached = globalThis.__mongoose;
if (!cached) cached = globalThis.__mongoose = { conn: null, promise: null };

export async function connectDB() {
  if (cached.conn) return cached.conn;

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.warn("⚠️  MONGODB_URI not set — running without a database (leads/bookings won't persist).");
    return null;
  }

  if (!cached.promise) {
    mongoose.set("strictQuery", true);
    cached.promise = mongoose
      .connect(uri, {
        serverSelectionTimeoutMS: 8000,
        maxPoolSize: 5, // small pool — serverless reuses one warm instance
      })
      .then((m) => {
        console.log("✅ MongoDB connected");
        return m.connection;
      });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null; // reset so the next invocation can retry
    throw e;
  }
  return cached.conn;
}
