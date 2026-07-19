import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';
import { getAuth } from 'firebase/auth';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyBqNX5jhyvwTlSTT950sR9iYWH6j2Andkk",
  authDomain: "synced-admin.firebaseapp.com",
  databaseURL: "https://synced-admin-default-rtdb.firebaseio.com",
  projectId: "synced-admin",
  storageBucket: "synced-admin.firebasestorage.app",
  messagingSenderId: "388159630124",
  appId: "1:388159630124:web:af45e8902da5244d04da89"
};

const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);
export const auth = getAuth(app);
export const storage = getStorage(app);
export { app };
