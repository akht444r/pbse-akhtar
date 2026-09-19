import { createServer } from 'node:http';
import { generateKeyPair, exportJWK, SignJWT } from 'jose';

let mockServer;
let testPrivateKey;
let testPublicKeyJwk;

/**
 * Spins up a lightweight in-process JWKS endpoint on port 9999
 */
export async function setupMockIdp(port = 9999) {
  const keyPair = await generateKeyPair('RS256');
  testPrivateKey = keyPair.privateKey;
  
  testPublicKeyJwk = {
    ...(await exportJWK(keyPair.publicKey)),
    kid: 'campus-court-test-key',
    alg: 'RS256',
    use: 'sig',
  };

  mockServer = createServer((req, res) => {
    if (req.url === '/jwks.json') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ keys: [testPublicKeyJwk] }));
    } else {
      res.writeHead(404);
      res.end();
    }
  });

  await new Promise((resolve) => mockServer.listen(port, resolve));
}

/**
 * Shuts down the in-process JWKS server
 */
export async function teardownMockIdp() {
  if (mockServer) {
    await new Promise((resolve) => mockServer.close(resolve));
    mockServer = null;
  }
}

/**
 * Issues an RS256 signed mock JWT for local test assertions
 */
export async function issueMockToken({
  subject = 'student-a',
  scopes = ['courts:read'],
  issuer = 'https://auth.campus-court.local',
  audience = 'campus-court-api',
  expiresIn = '5m',
} = {}) {
  if (!testPrivateKey) {
    throw new Error('Run setupMockIdp() before issuing test tokens.');
  }

  return new SignJWT({ scope: scopes.join(' ') })
    .setProtectedHeader({ alg: 'RS256', kid: 'campus-court-test-key' })
    .setIssuer(issuer)
    .setAudience(audience)
    .setSubject(subject)
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(testPrivateKey);
}