/**
 * Shared environment + known fixtures for the real-life journeys (CIT).
 * Fixtures below were created/verified during the 2026-07 QA cycle and left in place.
 */
export const URLS = {
  portal: process.env.BASE_URL ?? 'https://d-infath-jf-portal.azm-cit.com',
  api: process.env.BASE_API_URL ?? 'https://d-infath-jf-api.azm-cit.com',
  sso: process.env.SSO_URL ?? 'https://d-infath-sso.azm-cit.com',
  nafathMock: process.env.MOCK_NAFATH_URL ?? 'https://qa-infath-mocks.azm-dev.com',
  smsMock: process.env.SMS_MOCK_URL ?? 'https://d-infath-mocks.azm-cit.com',
};

export const TENANT_ID = process.env.TENANT_ID ?? 'azm-tenant-12345';

/** Known live fixtures (see JF-QA-Full-Cycle docs). */
export const FIXTURES = {
  /** Estate assigned to the liquidator (status 11, accepted) — the liquidator's working estate. */
  assignedEstate: 'INH00016',
  /** A registered heir who reaches the heir portal + dashboard. */
  registeredHeirNid: '1133154545'.slice(0, 0) + '1133154595',
  /** Deceased NIDs with seeded external-service data. */
  deceasedNids: ['1070716102', '5555555555', '1050607082'],
  /** Public QR letter-verification fixture (may require the seeded letter to still exist). */
  letterNo: 'MK-16-1',
};

/** Known open bugs a real user would hit — journeys reference these when a step is blocked. */
export const KNOWN_BLOCKERS: Record<string, string> = {
  'JF-1097': 'site-config 500 — service-registration final submit blocked',
  'JF-1058': 'classification investments constant — ranks A/B unreachable',
  'JF-757': 'disclosure with attachment silently stuck as draft',
  'JF-727': '500 on upload-chunked — disclosure attachments',
  'JF-1102': 'inquiry recipient-close fires no request',
  'JF-946': 'dual-role SP+Liquidator routing on some internal routes',
};
