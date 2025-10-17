import dotenv from 'dotenv';
dotenv.config({ path: './src/.env' });

import mongoose from 'mongoose';


export const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log(` MongoDB Connected: ${process.env.DB_NAME}`);
    } catch (error) {
        console.error(' MongoDB Connection Error:', error.message);
        process.exit(1);
    }
};