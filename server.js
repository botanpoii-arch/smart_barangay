import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import dataRoutes from './data.js';
import { startPulse, handleShutdown } from './Regulator.js';

dotenv.config();

const app = express();

// THE CRITICAL FIX: Tell Render to use its own port, or default to 8000 locally
const PORT = process.env.PORT || 8000;

// 1. GLOBAL CORS
app.use(cors({
  origin: '*', 
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  // Ensure 'x-user-role' is in this list!
  allowedHeaders: ['Content-Type', 'Authorization', 'x-user-role'], 
  optionsSuccessStatus: 200
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 2. ROUTE MOUNTING
// This matches your frontend api.ts perfectly now.
app.use('/api', dataRoutes); 

// 3. PROCESS HANDLING
const stopPulse = startPulse();
process.on('SIGINT', () => handleShutdown(stopPulse));

// 4. SERVER START
// Added a console log so you can confirm it started successfully in the Render logs
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Production server running securely on port ${PORT}`);
});
