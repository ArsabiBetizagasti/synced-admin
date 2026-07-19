/**
 * One-time setup: creates Firebase Auth accounts for all Synced Admin users.
 * Run once with: node scripts/create-firebase-users.js
 *
 * Requirements:
 *  - Node.js 18+ (uses built-in fetch)
 *  - Firebase Email/Password auth must be enabled in Firebase Console
 *    → Firebase Console → Authentication → Sign-in method → Email/Password → Enable
 *
 * After running:
 *  1. Update Firebase Realtime Database rules (see bottom of this file)
 *  2. Delete or secure this script (it contains initial passwords)
 */

const API_KEY = 'AIzaSyBqNX5jhyvwTlSTT950sR9iYWH6j2Andkk';

const USERS = [
  // Team
  { email: 'kann@synced.graphics',     password: '515051', label: 'Kann' },
  { email: 'jero@synced.graphics',     password: '882001', label: 'Jero' },
  { email: 'facu@synced.graphics',     password: '182026', label: 'Facu' },
  { email: 'angel@synced.graphics',    password: '130726', label: 'Angel' },
  // Clients
  { email: 'brand_c1@synced.graphics', password: '012026', label: 'Hollywood Browzer' },
  { email: 'brand_c2@synced.graphics', password: '032026', label: '360 Optimum' },
  { email: 'brand_c3@synced.graphics', password: '022026', label: 'Foreshank' },
  { email: 'brand_c4@synced.graphics', password: '042026', label: 'ADAM' },
];

async function createUser({ email, password, label }) {
  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, returnSecureToken: false }),
    }
  );
  const data = await res.json();
  if (data.error) {
    if (data.error.message === 'EMAIL_EXISTS') {
      console.log(`⚠️  ${label} (${email}) — ya existe, no se tocó`);
    } else {
      console.error(`❌  ${label} (${email}) — ERROR: ${data.error.message}`);
    }
  } else {
    console.log(`✅  ${label} (${email}) — creado`);
  }
}

(async () => {
  console.log('Creando usuarios en Firebase Auth...\n');
  for (const user of USERS) {
    await createUser(user);
  }
  console.log('\n✅ Listo.\n');
  console.log('─────────────────────────────────────────────────────────');
  console.log('SIGUIENTE PASO — Pegá estas rules en Firebase Console:');
  console.log('Firebase Console → Realtime Database → Rules → Publicar\n');
  console.log(JSON.stringify({
    rules: {
      '.read': 'auth != null',
      '.write': 'auth != null',
    }
  }, null, 2));
  console.log('─────────────────────────────────────────────────────────');
  console.log('\n⚠️  Después de aplicar las rules, eliminá o asegurá este script.');
})();
