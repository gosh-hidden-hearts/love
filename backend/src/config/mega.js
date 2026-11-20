import { Storage } from 'megajs';
import config from './env.js';

let storageInstance = null;
let connectingPromise = null;

export async function getMegaStorage() {
  if (storageInstance && storageInstance.ready) {
    return storageInstance;
  }

  if (connectingPromise) {
    return connectingPromise;
  }

  connectingPromise = (async () => {
    try {
      console.log('☁️ Initializing MEGA Cloud Storage connection...');
      const storage = await new Storage({
        email: config.mega.email,
        password: config.mega.password
      }).ready;

      storageInstance = storage;
      console.log('✅ MEGA Cloud Storage successfully connected for:', storage.email);
      return storageInstance;
    } catch (err) {
      console.error('❌ Failed to connect to MEGA Storage:', err.message);
      connectingPromise = null;
      throw err;
    }
  })();

  return connectingPromise;
}

export default getMegaStorage;
