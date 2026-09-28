import { setupMockIdp, issueMockToken } from './tests/helpers/tokens.js';

async function run() {
  // 1. Nyalakan server Mock IdP di port 9999
  await setupMockIdp(9999);
  console.log('✅ Mock IdP server aktif di http://localhost:9999/jwks.json');

  // 2. Generate token Student A (Full Privileges)
  const tokenA = await issueMockToken({
    subject: 'usr_studentA',
    scopes: ['courts:read', 'bookings:read', 'bookings:write', 'bookings:cancel'],
    facilityId: 'fac-main',
    expiresIn: '365d',
  });

  // 3. Generate token Student B (No Cancel Scope)
  const tokenB = await issueMockToken({
    subject: 'usr_studentB',
    scopes: ['courts:read', 'bookings:read', 'bookings:write'],
    facilityId: 'fac-main',
    expiresIn: '365d',
  });

  console.log('\n================ TOKEN STUDENT A ================');
  console.log(tokenA);
  console.log('=================================================\n');

  console.log('================ TOKEN STUDENT B ================');
  console.log(tokenB);
  console.log('=================================================\n');

  console.log('⚠️  JANGAN TUTUP TERMINAL INI (Mock IdP harus tetap jalan di background)');
}

run().catch(console.error);