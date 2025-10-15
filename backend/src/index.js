import dotenv from 'dotenv';
dotenv.config({ path: './src/.env' });

import app from './app.js';
import { connectDB } from './db.js';

const port = process.env.PORT || 2000;

connectDB();

app.listen(port, '0.0.0.0', () => {
	console.log(`VerdeNexo Backend running on http://localhost:${port}`);
});

