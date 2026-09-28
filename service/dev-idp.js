// service/dev-idp.js — local mock identity provider for development ONLY.
//
// The service verifies RS256 tokens against OIDC_JWKS_URI (default
// http://127.0.0.1:9999/jwks.json). Nothing served that address outside the
// test suite, so no token could ever be verified when running `npm run dev`.
// This server fixes that:
//   GET  /jwks.json          public key set the service uses to verify tokens
//   POST /token?persona=KEY  issues a signed token for a demo persona
//
// The key pair is created on first start and kept in .dev-idp-key.json so tokens
// stay valid across restarts. That file is gitignored. Never deploy this file.
import { createServer } from 'node:http';
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { generateKeyPair, exportJWK, importJWK, SignJWT } from 'jose';

const PORT = Number(process.env.IDP_PORT) || 9999;
const ISSUER = process.env.OIDC_ISSUER || 'https://auth.campus-court.local';
const AUDIENCE = process.env.OIDC_AUDIENCE || 'campus-court-api';
const KID = 'campus-court-test-key';
const KEY_FILE = fileURLToPath(new URL('./.dev-idp-key.json', import.meta.url));
const ALLOWED_ORIGINS = ['http://localhost:5173', 'http://127.0.0.1:5173', process.env.CLIENT_ORIGIN].filter(Boolean);

// Must stay in step with client/src/context/AuthContext.jsx (keys and userIds).
const PERSONAS = {
  studentA: { sub: 'usr_studentA', scopes: ['courts:read', 'bookings:read', 'bookings:write'] },
  studentB: { sub: 'usr_studentB', scopes: ['courts:read', 'bookings:read', 'bookings:write'] },
};

async function loadKeys() {
  try {
    const saved = JSON.parse(await readFile(KEY_FILE, 'utf8'));
    return { privateJwk: saved.privateJwk, publicJwk: saved.publicJwk };
  } catch {
    const { privateKey, publicKey } = await generateKeyPair('RS256', { extractable: true });
    const privateJwk = await exportJWK(privateKey);
    const publicJwk = { ...(await exportJWK(publicKey)), kid: KID, alg: 'RS256', use: 'sig' };
    await writeFile(KEY_FILE, JSON.stringify({ privateJwk, publicJwk }, null, 2));
    return { privateJwk, publicJwk };
  }
}

const { privateJwk, publicJwk } = await loadKeys();
const privateKey = await importJWK(privateJwk, 'RS256');

function cors(req, res) {
  const origin = req.headers.origin;
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  }
}

function json(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(body));
}

createServer(async (req, res) => {
  cors(req, res);
  const url = new URL(req.url, `http://${req.headers.host}`);

  if (req.method === 'OPTIONS') { res.writeHead(204); return res.end(); }
  if (url.pathname === '/jwks.json') return json(res, 200, { keys: [publicJwk] });

  if (url.pathname === '/token') {
    const persona = PERSONAS[url.searchParams.get('persona')];
    if (!persona) return json(res, 400, { error: 'unknown_persona', known: Object.keys(PERSONAS) });
    const accessToken = await new SignJWT({ scope: persona.scopes.join(' '), facility_id: 'fac-main' })
      .setProtectedHeader({ alg: 'RS256', kid: KID })
      .setIssuer(ISSUER)
      .setAudience(AUDIENCE)
      .setSubject(persona.sub)
      .setIssuedAt()
      .setExpirationTime('8h')
      .sign(privateKey);
    return json(res, 200, { access_token: accessToken, token_type: 'Bearer', expires_in: 28800 });
  }

  json(res, 404, { error: 'not_found' });
}).listen(PORT, () => console.log(`Dev IdP listening on http://127.0.0.1:${PORT} (jwks: /jwks.json, token: /token?persona=studentA)`));
