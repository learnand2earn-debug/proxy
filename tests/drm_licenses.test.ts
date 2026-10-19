import { describe, it, expect, beforeEach } from 'vitest';
import { repo } from '../src/lib/db/repository';

describe('DRM License & Single-Site Concurrency Engine', () => {
  it('authenticates master administrator credentials cleanly', () => {
    const auth = repo.authenticate({
      usernameOrKey: 'admin',
      password: 'admin123',
      origin: 'http://localhost:3000'
    });

    expect(auth.success).toBe(true);
    expect(auth.session).toBeDefined();
    expect(auth.session?.role).toBe('admin');
    expect(auth.session?.session_token.startsWith('wsp_admin_')).toBe(true);
  });

  it('creates and retrieves a new customer license record', () => {
    const lic = repo.createLicense({
      customer_name: 'Test Corp Automated',
      customer_username: 'test_corp_user',
      password: 'SecurePassword123!',
      plan_type: 'monthly',
      notes: 'Unit test license'
    });

    expect(lic.id).toBeDefined();
    expect(lic.license_key.startsWith('WSP-MONTHLY-')).toBe(true);
    expect(lic.status).toBe('ACTIVE');
    expect(lic.max_concurrent_sites).toBe(1);

    const fetched = repo.getLicenseById(lic.id);
    expect(fetched).toBeDefined();
    expect(fetched?.customer_name).toBe('Test Corp Automated');
  });

  it('authenticates customer via license key and locks to origin', () => {
    const lic = repo.createLicense({
      customer_name: 'Single Site Company',
      customer_username: 'singlesite',
      password: 'Pass12345!',
      plan_type: 'annual'
    });

    // 1. First login from Origin A
    const loginA = repo.authenticate({
      usernameOrKey: lic.license_key,
      origin: 'https://site-alpha.com'
    });

    expect(loginA.success).toBe(true);
    expect(loginA.session?.bound_origin).toBe('https://site-alpha.com');

    // Verify license record updated
    const updatedLic = repo.getLicenseById(lic.id);
    expect(updatedLic?.active_origin).toBe('https://site-alpha.com');
    expect(updatedLic?.active_session_token).toBeDefined();

    // 2. Concurrent login attempt from Origin B must be BLOCKED
    const loginB = repo.authenticate({
      usernameOrKey: lic.license_key,
      origin: 'https://site-beta.com'
    });

    expect(loginB.success).toBe(false);
    expect(loginB.is_concurrent_locked).toBe(true);
    expect(loginB.error).toContain('Single-Site DRM Lock Active');
    expect(loginB.error).toContain('site-alpha.com');

    // 3. Re-login from same Origin A must succeed
    const reLoginA = repo.authenticate({
      usernameOrKey: lic.license_key,
      origin: 'https://site-alpha.com'
    });
    expect(reLoginA.success).toBe(true);

    // 4. Admin unbinds origin lock
    const unbindRes = repo.unbindLicenseOrigin(lic.id);
    expect(unbindRes.success).toBe(true);

    // 5. Origin B can now bind cleanly
    const loginBAfterUnbind = repo.authenticate({
      usernameOrKey: lic.license_key,
      origin: 'https://site-beta.com'
    });
    expect(loginBAfterUnbind.success).toBe(true);
    expect(loginBAfterUnbind.session?.bound_origin).toBe('https://site-beta.com');
  });

  it('strictly rejects revoked licenses', () => {
    const lic = repo.createLicense({
      customer_name: 'Revoke Target Corp',
      customer_username: 'revoke_user',
      password: 'Pass12345!',
      plan_type: 'monthly'
    });

    // Revoke license
    repo.toggleRevokeLicense(lic.id, true);

    const loginRes = repo.authenticate({
      usernameOrKey: lic.license_key,
      origin: 'http://localhost:3000'
    });

    expect(loginRes.success).toBe(false);
    expect(loginRes.error).toContain('revoked');
  });

  it('extends license validity and updates expiration', () => {
    const lic = repo.createLicense({
      customer_name: 'Extend Target',
      plan_type: 'monthly',
      expires_in_days: 10
    });

    const initialExpiry = new Date(lic.expires_at).getTime();
    const extended = repo.extendLicense(lic.id, 30);

    expect(extended).toBeDefined();
    const newExpiry = new Date(extended!.expires_at).getTime();
    expect(newExpiry).toBeGreaterThan(initialExpiry);
  });

  it('releases session and unbinds origin upon logout', () => {
    const lic = repo.createLicense({
      customer_name: 'Logout Company',
      plan_type: 'lifetime'
    });

    const login = repo.authenticate({
      usernameOrKey: lic.license_key,
      origin: 'https://workstation-1.net'
    });

    expect(login.success).toBe(true);
    const token = login.session!.session_token;

    // Logout session
    const logoutSuccess = repo.logoutSession(token);
    expect(logoutSuccess).toBe(true);

    const recheckLic = repo.getLicenseById(lic.id);
    expect(recheckLic?.active_session_token).toBeUndefined();
    expect(recheckLic?.active_origin).toBeUndefined();
  });
});
