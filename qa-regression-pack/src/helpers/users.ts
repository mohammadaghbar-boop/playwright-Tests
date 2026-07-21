/**
 * Demo identities used by the pack (CIT Nafath mock — qa-infath-mocks.azm-dev.com).
 * Full inventory of the 568 mock users: JF-QA-Full-Cycle/test-cycle/recon.json.
 * Passwords are NEVER stored here — internal-portal creds come from .env
 * (with the well-known PD demo fallback kept for out-of-the-box runs, matching
 * the main repo's Automation-Tests/helpers/auth.ts).
 */
export const URLS = {
  portal: process.env.BASE_URL ?? 'https://d-infath-jf-portal.azm-cit.com',
  api: process.env.BASE_API_URL ?? 'https://d-infath-jf-api.azm-cit.com',
  sso: process.env.SSO_URL ?? 'https://d-infath-sso.azm-cit.com',
  nafathMock: process.env.MOCK_NAFATH_URL ?? 'https://qa-infath-mocks.azm-dev.com',
  /** SMS / notifications mock — carries registration OTPs at /api/notifications (CIT). */
  smsMock: process.env.MOCK_SMS_URL ?? 'https://d-infath-mocks.azm-cit.com',
};

export const TENANT_ID = process.env.TENANT_ID ?? 'azm-tenant-12345';

/**
 * Internal demo accounts (verified on CIT during the 2026-07-16 cycle).
 * NOTE: the estate backbone (court-cases, inquiries, assets) authorizes the
 * EstateManager role — the PD demo account returns 401 on those APIs, so
 * `estateManager` is the default for internal specs. Passwords are the
 * well-known demo password, overridable via .env.
 */
export const INTERNAL_USERS = {
  estateManager: {
    email: process.env.EM_EMAIL || 'demo-estate-manager@azm.sa',
    password: process.env.EM_PASSWORD || 'Azm@123',
  },
  purchasing: {
    email: process.env.PD_EMAIL || 'test2@test.com',
    password: process.env.PD_PASSWORD || 'Azm@123',
  },
  /** Verified 200 on CIT (area-d cycle 2026-07-16); used by the JF-979 dashboard spec. */
  relationshipManager: {
    email: process.env.RM_EMAIL || 'demo-relationship-manager@azm.sa',
    password: process.env.RM_PASSWORD || 'Azm@123',
  },
};

/** Back-compat: default internal user = estate manager (works for the backbone). */
export const PD_USER = INTERNAL_USERS.estateManager;

export const NATIONAL_IDS = {
  /** Mohammed ALGHAMDI — established service provider */
  serviceProvider: process.env.SP_NATIONAL_ID || '1084039438',
  /** Majed ALQAHTANI — dual SP + Liquidator (real accepted case INH00581) */
  liquidator: process.env.LIQUIDATOR_NATIONAL_ID || '1100000011',
  /** Heir-portal user — a REGISTERED heir (verified reachable 2026-07-16: dashboard
   *  + mainHub WebSocket healthy). Unregistered NIDs land on /register and need an
   *  SMS OTP that the mock doesn't expose. */
  heir: process.env.HEIR_NATIONAL_ID || '1133154595',
  /** Negative tests — blocked identity */
  blockedUser: '1115789890',
  /** Deceased NIDs with seeded external-service data */
  deceased: ['1070716102', '5555555555', '1050607082'],
  /** Golden NIDs for classification premises (JF-171 suite) */
  classificationGolden: ['1000000099', '1023456789'],
};
