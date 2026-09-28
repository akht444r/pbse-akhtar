import { Router } from 'express';
import { generateKeyPair, exportJWK, importJWK, SignJWT } from 'jose';
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

export const idpRouter = Router();

const ISSUER = process.env.OIDC_ISSUER || 'https://auth.campus-court.local';
const AUDIENCE = process.env.OIDC_AUDIENCE || 'campus-court-api';
const KID = 'campus-court-test-key';
const KEY_FILE = fileURLToPath(new URL('../.dev-idp-key.json', import.meta.url));

const PERSONAS = {
  studentA: { sub: 'usr_studentA', scopes: ['courts:read', 'bookings:read', 'bookings:write'] },
  studentB: { sub: 'usr_studentB', scopes: ['courts:read', 'bookings:read', 'bookings:write'] },
};

let keyPromise = null;
async function getKeys() {
  if (!keyPromise) {
    keyPromise = (async () => {
      try {
        const saved = JSON.parse(await readFile(KEY_FILE, 'utf8'));
        const privateKey = await importJWK(saved.privateJwk, 'RS256');
        return { privateKey, publicJwk: saved.publicJwk };
      } catch {
        const { privateKey, publicKey } = await generateKeyPair('RS256', { extractable: true });
        const privateJwk = await exportJWK(privateKey);
        const publicJwk = { ...(await exportJWK(publicKey)), kid: KID, alg: 'RS256', use: 'sig' };
        try {
          await writeFile(KEY_FILE, JSON.stringify({ privateJwk, publicJwk }, null, 2));
        } catch {
          // Abaikan jika lingkungan cloud read-only, tetap jalan via memory
        }
        return { privateKey, publicJwk };
      }
    })();
  }
  return keyPromise;
}

// Endpoint publik JWKS untuk verifikasi JWT
idpRouter.get('/jwks.json', async (req, res) => {
  const { publicJwk } = await getKeys();
  res.json({ keys: [publicJwk] });
});

// Endpoint untuk menerbitkan token Student A / Student B
idpRouter.post('/token', async (req, res) => {
  const personaKey = req.query.persona;
  const persona = PERSONAS[personaKey];
  if (!persona) {
    return res.status(400).json({ error: 'unknown_persona', known: Object.keys(PERSONAS) });
  }

  const { privateKey } = await getKeys();
  const accessToken = await new SignJWT({
    scope: persona.scopes.join(' '),
    facility_id: 'fac-main',
  })
    .setProtectedHeader({ alg: 'RS256', kid: KID })
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setSubject(persona.sub)
    .setIssuedAt()
    .setExpirationTime('8h')
    .sign(privateKey);

  res.json({ access_token: accessToken, token_type: 'Bearer', expires_in: 28800 });
});