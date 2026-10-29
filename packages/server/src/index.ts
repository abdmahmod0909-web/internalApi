import { buildApp } from './app.js';
import dotenv from 'dotenv';

dotenv.config();

const PORT = parseInt(process.env.PORT || '3001', 10);
const HOST = process.env.HOST || '0.0.0.0';

async function start() {
  const app = buildApp();

  try {
    await app.listen({ port: PORT, host: HOST });
    console.log(`🚀 InternalAPI Server listening on http://${HOST}:${PORT}`);
    console.log(`📊 Health check available at http://${HOST}:${PORT}/health`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

start();

