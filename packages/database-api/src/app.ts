import { app, buildDatabaseApp } from './index.js';
import { dbService } from './storage.js';

export { buildDatabaseApp, app };

const handler = async function (req: any, res: any) {
  await app.ready();
  await dbService.ensureReady();
  return new Promise((resolve, reject) => {
    res.on('finish', () => resolve(true));
    res.on('close', () => resolve(true));
    res.on('error', (err: any) => reject(err));
    app.server.emit('request', req, res);
  });
};

export default Object.assign(handler, app);
