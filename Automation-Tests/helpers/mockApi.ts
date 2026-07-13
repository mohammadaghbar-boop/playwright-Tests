import { Page, Route } from '@playwright/test';

const MOCK_BASE = 'https://d-infath-mocks.azm-cit.com';

// ── Token helper ──────────────────────────────────────────────────────────────

export async function getAuthToken(page: Page): Promise<string> {
  const data = await page.evaluate(async (baseUrl: string) => {
    const res = await window.fetch(`${baseUrl}/oauth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ClientId: 'MOCK_USERNAME', ClientSecret: 'MOCK_PASSWORD' }),
    });
    return res.json();
  }, MOCK_BASE);
  return (data as Record<string, string>).access_token ?? (data as Record<string, string>).token ?? '';
}

// ── Facility mock data ────────────────────────────────────────────────────────

export const MOCK_FACILITIES_FROM_MOC = [
  {
    facilityName: 'شركة الرياض للتقنية',
    unifiedNationalNumber: '1000000001',
    registryStatus: 'نشط',
    relation: 'مالك',
  },
  {
    facilityName: 'مؤسسة النور',
    unifiedNationalNumber: '1000000002',
    registryStatus: 'نشط',
    relation: 'مدير',
  },
  {
    facilityName: 'Riyadh Tech Co',
    unifiedNationalNumber: '1000000003',
    registryStatus: 'نشط',
    relation: 'مالك',
  },
];

export const MOCK_FACILITY_DETAILS = {
  crNumber: '1000000001',
  entityName: 'شركة الرياض للتقنية',
  ownerName: 'محمد أحمد',
  crIssueDate: '2020-01-01',
  crConfirmDate: '2021-01-01',
  relation: 'مالك',
  crStatus: 'نشط',
};

export const MOCK_REGISTERED_FACILITIES = [
  {
    id: 'fac-001',
    facilityName: 'شركة الرياض للتقنية',
    unifiedNationalNumber: '1000000001',
    status: 'مفعل',
    servicesCount: 2,
  },
  {
    id: 'fac-002',
    facilityName: 'مؤسسة النور',
    unifiedNationalNumber: '1000000002',
    status: 'قيد مراجعة إدارة المشتريات',
    servicesCount: 0,
  },
];

// ── Route interceptors ────────────────────────────────────────────────────────

/**
 * Intercept the MoC manual-verification API (called when user clicks "تحقق" on manual form).
 * Actual URL: https://d-infath-jf-api.azm-cit.com/cases/api/v1/companies/{number}/manual-verification
 */
export async function mockMocApiSuccess(page: Page, _facilities = MOCK_FACILITIES_FROM_MOC) {
  await page.route(
    (url) => url.href.includes('manual-verification'),
    async (route: Route) => {
      await route.fulfill({
        status: 200, contentType: 'application/json',
        body: JSON.stringify({
          isSuccess: true,
          statusCode: 200,
          errorCode: null,
          errorMessage: null,
          errorDetails: null,
          data: MOCK_FACILITY_DETAILS,
        }),
      });
    }
  );
}

/** Intercept the MoC manual-verification API to return a failure. */
export async function mockMocApiFailure(page: Page) {
  await page.route(
    (url) => url.href.includes('manual-verification'),
    async (route: Route) => {
      await route.fulfill({
        status: 400, contentType: 'application/json',
        body: JSON.stringify({
          isSuccess: false,
          statusCode: 404,
          errorCode: 'GSB_MC_INTEGRATION_FAILED',
          errorMessage: 'تعذر الاتصال بوزارة التجارة، الرجاء المحاولة لاحقاً',
          errorDetails: null,
          data: null,
        }),
      });
    }
  );
}

/** Intercept the MoC API to return an empty/not-found response. */
export async function mockMocApiEmpty(page: Page) {
  await page.route(
    (url) => url.href.includes('manual-verification'),
    async (route: Route) => {
      await route.fulfill({
        status: 404, contentType: 'application/json',
        body: JSON.stringify({ data: null, message: 'Not found' }),
      });
    }
  );
}

/** Intercept the second API (facility commercial registration details). */
export async function mockFacilityDetailsApiSuccess(page: Page, details = MOCK_FACILITY_DETAILS) {
  await page.route('**/api/**/facilities/details**', async (route: Route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: details }) });
  });
}

/** Intercept the second API to simulate failure. */
export async function mockFacilityDetailsApiFailure(page: Page) {
  await page.route('**/api/**/facilities/details**', async (route: Route) => {
    await route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ error: 'Service unavailable' }) });
  });
}

/** Intercept the facility registration submit API. */
export async function mockSubmitApiSuccess(page: Page) {
  await page.route('**/api/**/facilities/register**', async (route: Route) => {
    if (route.request().method() === 'POST') {
      await route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({ status: 'قيد مراجعة إدارة المشتريات' }) });
    } else {
      await route.continue();
    }
  });
}

/** Intercept the submit API to simulate failure. */
export async function mockSubmitApiFailure(page: Page) {
  await page.route('**/api/**/facilities/register**', async (route: Route) => {
    if (route.request().method() === 'POST') {
      await route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ error: 'Internal server error' }) });
    } else {
      await route.continue();
    }
  });
}

/** Intercept facility retrieval for Service Provider list (excludes commerce/verify sub-paths). */
export async function mockFacilitiesListSuccess(page: Page, facilities = MOCK_REGISTERED_FACILITIES) {
  await page.route('**/api/**/facilities', async (route: Route) => {
    if (route.request().method() === 'GET' && !route.request().url().includes('commerce') && !route.request().url().includes('verify') && !route.request().url().includes('details')) {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: facilities }) });
    } else {
      await route.continue();
    }
  });
}

/** Intercept facility retrieval to simulate backend failure. */
export async function mockFacilitiesListFailure(page: Page) {
  await page.route('**/api/**/facilities', async (route: Route) => {
    if (route.request().method() === 'GET' && !route.request().url().includes('commerce') && !route.request().url().includes('verify')) {
      await route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ error: 'Cannot retrieve facilities' }) });
    } else {
      await route.continue();
    }
  });
}

/** Intercept the approval save API. */
export async function mockApproveApiSuccess(page: Page) {
  await page.route(
    (url) => url.href.includes('approve') || url.href.includes('accept'),
    async (route: Route) => {
      await route.fulfill({
        status: 200, contentType: 'application/json',
        body: JSON.stringify({ isSuccess: true, statusCode: 200, data: { status: 'مفعل' } }),
      });
    }
  );
}

/** Intercept the approval save API to simulate failure. */
export async function mockApproveApiFailure(page: Page) {
  await page.route(
    (url) => url.href.includes('approve') || url.href.includes('accept'),
    async (route: Route) => {
      await route.fulfill({
        status: 500, contentType: 'application/json',
        body: JSON.stringify({ isSuccess: false, statusCode: 500, errorMessage: 'Internal server error', data: null }),
      });
    }
  );
}

/** Intercept the rejection save API. */
export async function mockRejectApiSuccess(page: Page) {
  await page.route(
    (url) => url.href.includes('reject'),
    async (route: Route) => {
      await route.fulfill({
        status: 200, contentType: 'application/json',
        body: JSON.stringify({ isSuccess: true, statusCode: 200, data: { status: 'مرفوضة' } }),
      });
    }
  );
}

/** Intercept the rejection save API to simulate failure. */
export async function mockRejectApiFailure(page: Page) {
  await page.route(
    (url) => url.href.includes('reject'),
    async (route: Route) => {
      await route.fulfill({
        status: 500, contentType: 'application/json',
        body: JSON.stringify({ isSuccess: false, statusCode: 500, errorMessage: 'Internal server error', data: null }),
      });
    }
  );
}

/** Intercept the Purchasing Department facility details API. */
export async function mockPdFacilityDetailsSuccess(page: Page) {
  await page.route(
    (url) => url.href.includes('companies/details'),
    async (route: Route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            isSuccess: true,
            statusCode: 200,
            errorCode: null,
            errorMessage: null,
            errorDetails: null,
            data: {
              id: 'fac-001',
              facilityName: 'شركة الرياض للتقنية',
              unifiedNationalNumber: '1000000001',
              accountStatus: 'قيد مراجعة إدارة المشتريات',
              registryIssueDate: '2020-01-01',
              managerName: 'محمد أحمد',
              services: [],
            },
          }),
        });
      } else {
        await route.continue();
      }
    }
  );
}

/** Intercept the Purchasing Department facility details API to fail. */
export async function mockPdFacilityDetailsFailure(page: Page) {
  await page.route(
    (url) => url.href.includes('companies/details'),
    async (route: Route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ isSuccess: false, statusCode: 500, errorMessage: 'Cannot load details', data: null }),
        });
      } else {
        await route.continue();
      }
    }
  );
}

// ── companies/all (MoC facilities list shown on companies page) ───────────────

export const MOCK_CR_DETAILS_DATA = {
  isSuccess: true, statusCode: 200, data: {
    crNationalNumber: '7041000001',
    entityFullNameAr: 'مؤسسة الاختبار الأولى',
    crIssueDate: { crIssueDateGregorian: '2020-01-01', crIssueDateHijri: '06-05-1441' },
    crConfirmDate: { crConfirmDateGregorian: '2027-01-01', crConfirmDateHijri: '12-07-1448' },
  },
};

/** Intercept companies/all (MoC facilities list) with N generated facilities. */
export async function mockCompaniesAll(page: Page, count = 3, relationTypeDescAr = 'مالك') {
  await page.route(
    (url) => url.href.includes('companies/all'),
    async (route: Route) => {
      if (route.request().method() === 'GET') {
        const items = Array.from({ length: count }, (_, i) => ({
          crNationalNumber: `704100${String(i + 1).padStart(4, '0')}`,
          entityFullNameAr: `مؤسسة الاختبار رقم ${i + 1}`,
          crStatus: { crStatusID: 1, crStatusDescAr: 'نشط', crStatusDescEn: 'Active' },
          relationTypeDescAr,
          requestStatus: null,
        }));
        await route.fulfill({
          status: 200, contentType: 'application/json',
          body: JSON.stringify({ isSuccess: true, statusCode: 200, data: items }),
        });
      } else {
        await route.continue();
      }
    }
  );
}

/** Intercept cr-details API (second API) to return success. */
export async function mockCrDetailsSuccess(page: Page, details = MOCK_CR_DETAILS_DATA) {
  await page.route(
    (url) => url.href.includes('cr-details'),
    async (route: Route) => {
      await route.fulfill({
        status: 200, contentType: 'application/json',
        body: JSON.stringify(details),
      });
    }
  );
}

/** Intercept cr-details API (second API) to simulate failure. */
export async function mockCrDetailsFailure(page: Page) {
  await page.route(
    (url) => url.href.includes('cr-details'),
    async (route: Route) => {
      await route.fulfill({
        status: 500, contentType: 'application/json',
        body: JSON.stringify({ isSuccess: false, statusCode: 500, errorMessage: 'Service unavailable', data: null }),
      });
    }
  );
}
