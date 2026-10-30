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
  } catch (err: any) {
    // If binding to 0.0.0.0 fails on Windows, fallback to 127.0.0.1
    if (HOST !== '127.0.0.1') {
      try {
        await app.listen({ port: PORT, host: '127.0.0.1' });
        console.log(`🚀 InternalAPI Server listening on http://127.0.0.1:${PORT}`);
        return;
      } catch (innerErr) {
        app.log.error(innerErr);
      }
    }
    app.log.error(err);
    process.exit(1);
  }
}

start();
