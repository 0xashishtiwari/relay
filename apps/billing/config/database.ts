import mongoose from 'mongoose';

export async function connectToDatabase() {
    try {
        await mongoose.connect(process.env.MONGODB_URI as string);
        console.log('Connected to MongoDB');

    } catch (error) {
        console.error("MongoDB connection failed:", error);
        process.exit(1);
    }
}