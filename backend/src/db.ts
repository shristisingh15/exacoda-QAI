import mongoose from "mongoose";

const uri = process.env.MONGO_URI!;
if (!uri) {
  throw new Error("MONGO_URI missing in .env");
}

export async function connectDB() {
  // You can also pass { dbName: "bankapp" } if not included in URI
  await mongoose.connect(uri);
  mongoose.connection.on("connected", () => console.log("✅ Mongo connected"));
  mongoose.connection.on("error", (err) => console.error("❌ Mongo error:", err));
}
