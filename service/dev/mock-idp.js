import { createServer } from 'node:http';
import { generateKeyPair, exportJWK, SignJWT } from 'jose';

const PORT = 9999;

const { privateKey, publicKey } = await generateKeyPair('RS256');

const publicJwk = {
  ...(await exportJWK(publicKey)),
  kid: 'campus-court-test-key',
  alg: 'RS256',
  use: 'sig',
};

const PERSONAS = {
  studentA: {
    subject: 'usr_studentA',
    scope: 'courts:read bookings:read bookings:write bookings:cancel',
    facilityId: 'fac-main',
  },
  studentB: {
    subject: 'usr_studentB',
    scope: 'courts:read bookings:read bookings:write',
    facilityId: 'fac-main',
  },
};

const server = createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', 'http://localhost:5173');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    return res.end();
  }

  if (req.url === '/jwks.json') {
    res.writeHead(200, {
      'Content-Type': 'application/json',
    });

    return res.end(JSON.stringify({
      keys: [publicJwk],
    }));
  }

  if (req.url?.startsWith('/token')) {
    const url = new URL(req.url, `http://127.0.0.1:${PORT}`);
    const personaKey = url.searchParams.get('persona') || 'studentA';
    const persona = PERSONAS[personaKey];

    if (!persona) {
      res.writeHead(400, {
        'Content-Type': 'application/json',
      });

      return res.end(JSON.stringify({
        error: 'Unknown persona',
      }));
    }

    const token = await new SignJWT({
      scope: persona.scope,
      facility_id: persona.facilityId,
    })
      .setProtectedHeader({
        alg: 'RS256',
        kid: 'campus-court-test-key',
      })
      .setIssuer('https://auth.campus-court.local')
      .setAudience('campus-court-api')
      .setSubject(persona.subject)
      .setIssuedAt()
      .setExpirationTime('1h')
      .sign(privateKey);

    res.writeHead(200, {
      'Content-Type': 'text/plain',
    });

    return res.end(token);
  }

  res.writeHead(404);
  res.end('Not found');
});

server.listen(PORT, () => {
  console.log(`Mock IDP listening on http://127.0.0.1:${PORT}`);
  console.log(`JWKS: http://127.0.0.1:${PORT}/jwks.json`);
  console.log(`Token: http://127.0.0.1:${PORT}/token`);
});