/**
 * JF-575 — "جهات الاستعلام" (Inquiry Authorities) — API-level automation.
 *
 * Companion to the UI spec (jf-575-inquiry-authorities.spec.ts). This file automates the
 * boundary-value / validation / RBAC / 404 / normalization cases that `Automation_Assessment.md`
 * classified as "Automatable (API-level follow-up)" — cheaper and more stable to assert by
 * hitting POST/GET .../inquiry-authorities directly than by driving the Angular form for every
 * permutation.
 *
 * ── Auth ──
 * The CIT environment does NOT accept a forged/self-signed JWT on the success path (a token
 * signed with the same HS256 key/iss/aud the UI spec's forgeJwt() uses still returns a flat 401
 * — confirmed empirically). So these tests read the REAL, Nafath-issued access token that
 * global-setup.ts saved for Majed ALQAHTANI (dual ServiceProvider+Liquidator) in
 * .auth/liquidator.json and send it as `Authorization: Bearer <token>` — see
 * helpers/inquiry-authority-api-client.ts. That token is what the Angular app itself forwards
 * to the API host; the API host ignores cookies for REST auth.
 *
 * ── Response-shape facts (verified live against d-infath-jf-api.azm-cit.com, not assumed) ──
 *   • Success:  { isSuccess:true,  data:{...}, errorCode:null,        statusCode:200 }  (200, NOT 201 — JF-1059)
 *   • FluentValidation failure: { isSuccess:false, errorCode:"BAD_REQUEST", statusCode:400,
 *                                 errorDetails:{ "<PascalCaseField>":["<localized msg>"] } }
 *     ⚠️  The granular codes the manual doc expects (INQUIRY_AUTHORITY_NAME_AR_REQUIRED,
 *         *_TOO_LONG, *_TYPE_REQUIRED, *_TOO_MANY_ATTACHMENTS, *_INVALID_ATTACHMENT) are defined
 *         server-side but NOT surfaced — every FluentValidation failure collapses to BAD_REQUEST
 *         with the specific message inside errorDetails, keyed by the C# property name
 *         ("NameAr","NameEn","EntityType","Description","Attachments","Attachments[0]"). Tests
 *         assert the real contract; see JF-575 QA notes for the doc/impl mismatch.
 *   • Handler failure (surfaced code kept): duplicate → INQUIRY_AUTHORITY_DUPLICATE_NAME (400);
 *     missing case → COURT_CASE_NOT_FOUND (404); missing authority → INQUIRY_AUTHORITY_NOT_FOUND (404).
 *   • List envelope: data:{ items[], pageIndex, pageSize, totalCount, totalPages, hasPrevious, hasNext }.
 *     items expose entityType/entityTypeAr as localized labels (e.g. "Ministry"/"وزارة"), NOT the int.
 *
 * ── Not automated here (honest gaps — see coverage table in the run report) ──
 *   • TC-005, TC-015: need a SECOND case assigned to Majed (only INH00581 is). Kept as test.skip
 *     with a clear reason rather than dropped or faked.
 *   • TC-050, TC-061: exercise the shared Kernel file endpoints; a bare non-browser client is
 *     challenged by the edge WAF. Written, but tolerant of an environment gate (documented inline).
 *
 * No cleanup: every create uses a unique (timestamped) name, so accumulated rows are harmless in
 * this Dev env and never trip the per-case duplicate check — matching the sibling UI spec's style
 * and avoiding a hard dependency on the (flaky) CloudBeaver db relay for teardown.
 */

import { test, expect, APIRequestContext } from '@playwright/test';
import {
  liquidatorAuthHeaders,
  stringOfLength,
  uniqueStringOfLength,
} from './helpers/inquiry-authority-api-client';

const BASE_API_URL = process.env.BASE_API_URL ?? 'https://d-infath-jf-api.azm-cit.com';
const CASE_ID = '3b93081c-d5ca-4df8-abcb-914a526dcdac'; // INH00581, accepted by Majed
const NON_EXISTENT_CASE = '00000000-0000-0000-0000-0000000000ca';
const NON_EXISTENT_AUTH = '00000000-0000-0000-0000-0000000000a1';

const authoritiesUrl = (caseId = CASE_ID) =>
  `${BASE_API_URL}/cases/api/v1/court-cases/${caseId}/inquiry-authorities`;
const authorityByIdUrl = (id: string, caseId = CASE_ID) => `${authoritiesUrl(caseId)}/${id}`;

// InquiryAuthorityType enum (Azm.Cases.Domain/Enums/InquiryAuthorityType.cs): 1–5 valid.
const ENTITY = { Ministry: 1, Authority: 2, GovernmentBank: 3, Judicial: 4, Security: 5 } as const;
// Allow-list content types the create validator accepts (CreateCaseInquiryAuthorityCommandValidator.cs).
const ALLOWED_CONTENT_TYPES = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg'] as const;

interface Attachment {
  fileUrl: string;
  fileName: string;
  contentType: string;
  fileSize: number;
}
interface CreateBody {
  nameAr: string;
  nameEn: string;
  entityType: number;
  description?: string | null;
  attachments?: Attachment[];
}
interface ResultEnvelope<T = unknown> {
  isSuccess: boolean;
  data: T;
  errorMessage: string | null;
  errorCode: string | null;
  statusCode: number;
  errorDetails: Record<string, string[]> | null;
}

let seq = 0;
/** Unique, collision-proof names (parallel-safe: index + timestamp + random). */
function unique(label: string): { ar: string; en: string } {
  seq += 1;
  const stamp = `${Date.now()}-${seq}-${Math.floor(Math.random() * 1_000_000)}`;
  return { ar: `${label} عربي ${stamp}`, en: `${label} EN ${stamp}` };
}

/** A well-formed, allow-listed attachment ref. The create validator checks metadata only (it
 *  does NOT verify the fileUrl resolves to a real OSS object — a documented gap), so a synthetic
 *  ref is sufficient to exercise the attachment-array validation rules. */
function attachmentRef(i: number, contentType: string = 'application/pdf'): Attachment {
  return {
    fileUrl: `synthetic-key/jf575-fixture-${i}-${Date.now()}`,
    fileName: `fixture-${i}.${contentType.split('/')[1]}`,
    contentType,
    fileSize: 1024,
  };
}

async function create(request: APIRequestContext, body: CreateBody, caseId = CASE_ID) {
  return request.post(authoritiesUrl(caseId), { headers: liquidatorAuthHeaders(), data: body });
}
async function body<T = unknown>(resp: { text(): Promise<string> }): Promise<ResultEnvelope<T>> {
  return JSON.parse(await resp.text()) as ResultEnvelope<T>;
}

/** errorDetails keys for attachment failures are literal strings like "Attachments[0]" — which
 *  expect().toHaveProperty() misparses as a nested array path — so match the raw key by prefix. */
function hasErrorDetailKey(env: ResultEnvelope, prefix: string): boolean {
  return Object.keys(env.errorDetails ?? {}).some((k) => k.startsWith(prefix));
}

// ═══ GROUP 1: Authentication & role gating ═══════════════════════════════════
test.describe('JF-575 API | Authentication & RBAC', () => {
  test('TC-JF575-006 | unauthenticated requests to all three endpoints are rejected (401)', async ({
    request,
  }) => {
    const noAuth = { 'Content-Type': 'application/json' };
    const post = await request.post(authoritiesUrl(), {
      headers: noAuth,
      data: { nameAr: 'x', nameEn: 'x', entityType: ENTITY.Ministry },
    });
    const list = await request.get(authoritiesUrl(), { headers: noAuth });
    const detail = await request.get(authorityByIdUrl(NON_EXISTENT_AUTH), { headers: noAuth });

    expect(post.status(), 'POST without auth').toBe(401);
    expect(list.status(), 'GET list without auth').toBe(401);
    expect(detail.status(), 'GET detail without auth').toBe(401);
  });

  // TC-JF575-007 (non-Liquidator/Heir denied) is covered in the UI spec via forgeJwt(['Heir']).
});

// ═══ GROUP 2: Mandatory-field validation ═════════════════════════════════════
// NOTE: the API returns errorCode "BAD_REQUEST" (not the granular INQUIRY_AUTHORITY_* codes the
// manual doc lists) with the specific message under errorDetails[<Field>] — asserted accordingly.
test.describe('JF-575 API | Mandatory-field validation', () => {
  test('TC-JF575-008 | missing Name (Arabic) is rejected server-side (400 BAD_REQUEST)', async ({
    request,
  }) => {
    const { en } = unique('TC008');
    const resp = await create(request, { nameAr: '', nameEn: en, entityType: ENTITY.Ministry });
    expect(resp.status()).toBe(400);
    const b = await body(resp);
    expect(b.errorCode).toBe('BAD_REQUEST');
    expect(b.errorDetails, 'errorDetails should flag NameAr').toHaveProperty('NameAr');
  });

  test('TC-JF575-009 | missing Name (English) is rejected server-side (400 BAD_REQUEST)', async ({
    request,
  }) => {
    const { ar } = unique('TC009');
    const resp = await create(request, { nameAr: ar, nameEn: '', entityType: ENTITY.Ministry });
    expect(resp.status()).toBe(400);
    const b = await body(resp);
    expect(b.errorCode).toBe('BAD_REQUEST');
    expect(b.errorDetails).toHaveProperty('NameEn');
  });

  test('TC-JF575-010 | missing Entity Type is rejected server-side (400 BAD_REQUEST)', async ({
    request,
  }) => {
    const { ar, en } = unique('TC010');
    // entityType omitted → binds to 0 → fails Enum.IsDefined.
    const resp = await request.post(authoritiesUrl(), {
      headers: liquidatorAuthHeaders(),
      data: { nameAr: ar, nameEn: en },
    });
    expect(resp.status()).toBe(400);
    const b = await body(resp);
    expect(b.errorCode).toBe('BAD_REQUEST');
    expect(b.errorDetails).toHaveProperty('EntityType');
  });
});

// ═══ GROUP 3: Boundary-value validation (name / description lengths) ══════════
test.describe('JF-575 API | Boundary-value validation', () => {
  test('TC-JF575-016 | Name (Arabic) accepts exactly 255 characters', async ({ request }) => {
    const { ar, en } = unique('TC016');
    // Exactly 255 chars AND unique — a fixed repeated char would be rejected as a per-case
    // duplicate on the second run (see uniqueStringOfLength doc).
    const nameAr = uniqueStringOfLength(255, ar);
    expect(nameAr.length).toBe(255);
    const resp = await create(request, { nameAr, nameEn: en, entityType: ENTITY.Ministry });
    expect(resp.status(), 'exactly 255 should be accepted').toBe(200);
    expect((await body<{ id: string }>(resp)).data.id).toBeTruthy();
  });

  test('TC-JF575-017 | Name (Arabic) rejects 256 characters (400 BAD_REQUEST)', async ({
    request,
  }) => {
    const { en } = unique('TC017');
    const resp = await create(request, {
      nameAr: stringOfLength(256),
      nameEn: en,
      entityType: ENTITY.Ministry,
    });
    expect(resp.status()).toBe(400);
    const b = await body(resp);
    expect(b.errorCode).toBe('BAD_REQUEST');
    expect(b.errorDetails).toHaveProperty('NameAr');
  });

  test('TC-JF575-018 | Name (English) accepts exactly 255 characters', async ({ request }) => {
    const { ar, en } = unique('TC018');
    const nameEn = uniqueStringOfLength(255, en, 'a');
    expect(nameEn.length).toBe(255);
    const resp = await create(request, { nameAr: ar, nameEn, entityType: ENTITY.Authority });
    expect(resp.status()).toBe(200);
    expect((await body<{ id: string }>(resp)).data.id).toBeTruthy();
  });

  test('TC-JF575-019 | Name (English) rejects 256 characters (400 BAD_REQUEST)', async ({
    request,
  }) => {
    const { ar } = unique('TC019');
    const resp = await create(request, {
      nameAr: ar,
      nameEn: stringOfLength(256, 'a'),
      entityType: ENTITY.Authority,
    });
    expect(resp.status()).toBe(400);
    expect((await body(resp)).errorDetails).toHaveProperty('NameEn');
  });

  test('TC-JF575-020 | Description accepts exactly 1000 characters', async ({ request }) => {
    const { ar, en } = unique('TC020');
    const resp = await create(request, {
      nameAr: ar,
      nameEn: en,
      entityType: ENTITY.Ministry,
      description: stringOfLength(1000, 'د'),
    });
    expect(resp.status()).toBe(200);
    expect((await body<{ id: string }>(resp)).data.id).toBeTruthy();
  });

  test('TC-JF575-021 | Description rejects 1001 characters (400 BAD_REQUEST)', async ({
    request,
  }) => {
    const { ar, en } = unique('TC021');
    const resp = await create(request, {
      nameAr: ar,
      nameEn: en,
      entityType: ENTITY.Ministry,
      description: stringOfLength(1001, 'د'),
    });
    expect(resp.status()).toBe(400);
    expect((await body(resp)).errorDetails).toHaveProperty('Description');
  });
});

// ═══ GROUP 4: Entity-type domain validation ══════════════════════════════════
test.describe('JF-575 API | Entity-type validation', () => {
  for (const value of [0, 6, -1, 999]) {
    test(`TC-JF575-023 | out-of-range Entity Type ${value} is rejected (400 BAD_REQUEST)`, async ({
      request,
    }) => {
      const { ar, en } = unique(`TC023-${value}`);
      const resp = await create(request, { nameAr: ar, nameEn: en, entityType: value });
      expect(resp.status()).toBe(400);
      const b = await body(resp);
      expect(b.errorCode).toBe('BAD_REQUEST');
      expect(b.errorDetails).toHaveProperty('EntityType');
    });
  }
});

// ═══ GROUP 5: Attachment validation ══════════════════════════════════════════
test.describe('JF-575 API | Attachment validation', () => {
  test('TC-JF575-024 | exactly 10 attachments are accepted', async ({ request }) => {
    const { ar, en } = unique('TC024');
    const attachments = Array.from({ length: 10 }, (_, i) => attachmentRef(i));
    const resp = await create(request, {
      nameAr: ar,
      nameEn: en,
      entityType: ENTITY.Ministry,
      attachments,
    });
    expect(resp.status(), '10 attachments (boundary) should be accepted').toBe(200);
    expect((await body<{ id: string }>(resp)).data.id).toBeTruthy();
  });

  test('TC-JF575-025 | an 11th attachment is rejected (400 BAD_REQUEST, Attachments)', async ({
    request,
  }) => {
    const { ar, en } = unique('TC025');
    const attachments = Array.from({ length: 11 }, (_, i) => attachmentRef(i));
    const resp = await create(request, {
      nameAr: ar,
      nameEn: en,
      entityType: ENTITY.Ministry,
      attachments,
    });
    expect(resp.status()).toBe(400);
    const b = await body(resp);
    expect(b.errorCode).toBe('BAD_REQUEST');
    expect(b.errorDetails).toHaveProperty('Attachments');
  });

  test('TC-JF575-026 | all allowed attachment types (PDF, PNG, JPG, JPEG) are accepted', async ({
    request,
  }) => {
    const { ar, en } = unique('TC026');
    const attachments = ALLOWED_CONTENT_TYPES.map((ct, i) => attachmentRef(i, ct));
    const resp = await create(request, {
      nameAr: ar,
      nameEn: en,
      entityType: ENTITY.Ministry,
      attachments,
    });
    expect(resp.status(), 'all four allow-listed content types should be accepted').toBe(200);
  });

  test('TC-JF575-060 | invalid attachment metadata is rejected (400 BAD_REQUEST, Attachments[i])', async ({
    request,
  }) => {
    // Variant A — honestly-declared disallowed content type (application/msword).
    const a = unique('TC060-A');
    const respA = await create(request, {
      nameAr: a.ar,
      nameEn: a.en,
      entityType: ENTITY.Ministry,
      attachments: [{ ...attachmentRef(0), contentType: 'application/msword', fileName: 'x.doc' }],
    });
    expect(respA.status(), 'disallowed content type').toBe(400);
    expect(hasErrorDetailKey(await body(respA), 'Attachments'), 'flags the bad attachment').toBe(true);

    // Variant B — non-positive file size.
    const b = unique('TC060-B');
    const respB = await create(request, {
      nameAr: b.ar,
      nameEn: b.en,
      entityType: ENTITY.Ministry,
      attachments: [{ ...attachmentRef(0), fileSize: 0 }],
    });
    expect(respB.status(), 'fileSize=0').toBe(400);
    expect(hasErrorDetailKey(await body(respB), 'Attachments'), 'flags the bad attachment').toBe(true);

    // Variant C — empty required attachment fields.
    const c = unique('TC060-C');
    const respC = await create(request, {
      nameAr: c.ar,
      nameEn: c.en,
      entityType: ENTITY.Ministry,
      attachments: [{ fileUrl: '', fileName: '', contentType: '', fileSize: 10 }],
    });
    expect(respC.status(), 'empty attachment fields').toBe(400);
    expect(hasErrorDetailKey(await body(respC), 'Attachments'), 'flags the bad attachment').toBe(true);
  });
});

// ═══ GROUP 6: Duplicate detection & normalization ════════════════════════════
test.describe('JF-575 API | Duplicate detection & normalization', () => {
  test('TC-JF575-030 | leading/trailing whitespace is trimmed and does not bypass duplicate check', async ({
    request,
  }) => {
    const { ar, en } = unique('TC030');
    // Create the original.
    const first = await create(request, { nameAr: ar, nameEn: en, entityType: ENTITY.Ministry });
    expect(first.status()).toBe(200);
    const createdId = (await body<{ id: string }>(first)).data.id;

    // Same name padded with whitespace → must be rejected as duplicate (trim before dup check).
    const padded = await create(request, {
      nameAr: `   ${ar}   `,
      nameEn: `${en}-different`,
      entityType: ENTITY.Authority,
    });
    expect(padded.status(), 'whitespace-padded duplicate should be rejected').toBe(400);
    expect((await body(padded)).errorCode).toBe('INQUIRY_AUTHORITY_DUPLICATE_NAME');

    // And a fresh padded name persists trimmed (verify via read-back, not raw padding).
    const fresh = unique('TC030-trim');
    const created = await create(request, {
      nameAr: `  ${fresh.ar}  `,
      nameEn: `  ${fresh.en}  `,
      entityType: ENTITY.Ministry,
    });
    expect(created.status()).toBe(200);
    const freshId = (await body<{ id: string }>(created)).data.id;
    const detail = await request.get(authorityByIdUrl(freshId), { headers: liquidatorAuthHeaders() });
    const d = await body<{ nameAr: string; nameEn: string }>(detail);
    expect(d.data.nameAr, 'stored NameAr should be trimmed').toBe(fresh.ar);
    expect(d.data.nameEn, 'stored NameEn should be trimmed').toBe(fresh.en);
    expect(createdId).toBeTruthy();
  });

  test('TC-JF575-031 | duplicate detection is case-insensitive for the English name', async ({
    request,
  }) => {
    const { ar, en } = unique('TC031');
    const first = await create(request, { nameAr: ar, nameEn: en, entityType: ENTITY.Ministry });
    expect(first.status()).toBe(200);

    const upper = await create(request, {
      nameAr: `${ar}-مختلف`,
      nameEn: en.toUpperCase(),
      entityType: ENTITY.Authority,
    });
    expect(upper.status(), 'different-cased English name should be a duplicate').toBe(400);
    expect((await body(upper)).errorCode).toBe('INQUIRY_AUTHORITY_DUPLICATE_NAME');
  });
});

// ═══ GROUP 7: Read — scoping, sort, 404s ═════════════════════════════════════
test.describe('JF-575 API | Read: detail, ordering, not-found', () => {
  test('TC-JF575-028 | detail endpoint returns all fields (name/type/description/attachments)', async ({
    request,
  }) => {
    const { ar, en } = unique('TC028');
    const description = 'وصف تفصيلي لجهة الاستعلام للاختبار';
    const created = await create(request, {
      nameAr: ar,
      nameEn: en,
      entityType: ENTITY.Judicial,
      description,
      attachments: [attachmentRef(0, 'image/png')],
    });
    expect(created.status()).toBe(200);
    const id = (await body<{ id: string }>(created)).data.id;

    const detail = await request.get(authorityByIdUrl(id), { headers: liquidatorAuthHeaders() });
    expect(detail.status()).toBe(200);
    const d = await body<{
      nameAr: string;
      nameEn: string;
      entityType: string;
      entityTypeAr: string;
      description: string | null;
      attachments?: Array<{ fileName: string; contentType: string }>;
    }>(detail);
    expect(d.data.nameAr).toBe(ar);
    expect(d.data.nameEn).toBe(en);
    expect(d.data.description).toBe(description);
    // entityType comes back as a localized label, not the int (Judicial → "Judicial Entity"/"جهة قضائية").
    expect(d.data.entityTypeAr).toBe('جهة قضائية');
    expect(d.data.attachments ?? [], 'attachment metadata should round-trip').toHaveLength(1);
  });

  test('TC-JF575-033 | list is sorted newest-first (CreatedAt desc)', async ({ request }) => {
    // Create three in sequence; they must appear A<B<C in time, so the list shows C, B, A first.
    const names = [unique('TC033-A'), unique('TC033-B'), unique('TC033-C')];
    for (const n of names) {
      const r = await create(request, { nameAr: n.ar, nameEn: n.en, entityType: ENTITY.Ministry });
      expect(r.status()).toBe(200);
    }
    const list = await request.get(`${authoritiesUrl()}?pageIndex=1&pageSize=10`, {
      headers: liquidatorAuthHeaders(),
    });
    const listBody = await body<{ items: Array<{ nameEn: string }> }>(list);
    const topEn = listBody.data.items.map((i) => i.nameEn);
    const idxC = topEn.indexOf(names[2].en);
    const idxB = topEn.indexOf(names[1].en);
    const idxA = topEn.indexOf(names[0].en);
    expect(idxC, 'C should be present on page 1').toBeGreaterThanOrEqual(0);
    expect(idxC, 'C (newest) before B').toBeLessThan(idxB);
    expect(idxB, 'B before A (oldest)').toBeLessThan(idxA);
  });

  test('TC-JF575-036 | create/list against a non-existent case id returns 404 COURT_CASE_NOT_FOUND', async ({
    request,
  }) => {
    const { ar, en } = unique('TC036');
    const post = await create(
      request,
      { nameAr: ar, nameEn: en, entityType: ENTITY.Ministry },
      NON_EXISTENT_CASE,
    );
    const list = await request.get(authoritiesUrl(NON_EXISTENT_CASE), {
      headers: liquidatorAuthHeaders(),
    });
    expect(post.status()).toBe(404);
    expect((await body(post)).errorCode).toBe('COURT_CASE_NOT_FOUND');
    expect(list.status()).toBe(404);
    expect((await body(list)).errorCode).toBe('COURT_CASE_NOT_FOUND');
  });

  test('TC-JF575-037 | non-existent authority id under a valid case returns 404 INQUIRY_AUTHORITY_NOT_FOUND', async ({
    request,
  }) => {
    const resp = await request.get(authorityByIdUrl(NON_EXISTENT_AUTH), {
      headers: liquidatorAuthHeaders(),
    });
    expect(resp.status()).toBe(404);
    expect((await body(resp)).errorCode).toBe('INQUIRY_AUTHORITY_NOT_FOUND');
  });
});

// ═══ GROUP 8: Data integrity & text handling ═════════════════════════════════
test.describe('JF-575 API | Data integrity & text handling', () => {
  test('TC-JF575-041 | script/HTML payloads are stored inert (as literal text), never interpreted', async ({
    request,
  }) => {
    const stamp = `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
    const nameAr = `<script>alert(1)</script> ${stamp}`;
    const nameEn = `"><img src=x onerror=alert(1)> ${stamp}`;
    const description = `<script>document.cookie</script> ${stamp}`;
    const created = await create(request, {
      nameAr,
      nameEn,
      entityType: ENTITY.Ministry,
      description,
    });
    // Either accepted-and-stored-inert or rejected by validation — both are safe; the app must
    // never execute it. At the API layer we assert the round-trip is byte-identical when accepted
    // (UI-level "no alert fires" is covered separately as a manual/UI concern).
    expect([200, 400]).toContain(created.status());
    if (created.status() === 200) {
      const id = (await body<{ id: string }>(created)).data.id;
      const detail = await request.get(authorityByIdUrl(id), { headers: liquidatorAuthHeaders() });
      const d = await body<{ nameAr: string; nameEn: string; description: string | null }>(detail);
      expect(d.data.nameAr).toBe(nameAr);
      expect(d.data.nameEn).toBe(nameEn);
      expect(d.data.description).toBe(description);
    }
  });

  test('TC-JF575-042 | Arabic diacritics and mixed-direction text round-trip with full fidelity', async ({
    request,
  }) => {
    const stamp = `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
    const nameAr = `هيئة الزَّكاة والضَّريبة والجُمارك ${stamp}`;
    const nameEn = `ZATCA mixed 123 عربي ${stamp}`;
    const description = `Mixed العربية and English 456 — لا فقدان للأحرف ${stamp}`;
    const created = await create(request, {
      nameAr,
      nameEn,
      entityType: ENTITY.Authority,
      description,
    });
    expect(created.status()).toBe(200);
    const id = (await body<{ id: string }>(created)).data.id;
    const detail = await request.get(authorityByIdUrl(id), { headers: liquidatorAuthHeaders() });
    const d = await body<{ nameAr: string; nameEn: string; description: string | null }>(detail);
    expect(d.data.nameAr).toBe(nameAr);
    expect(d.data.nameEn).toBe(nameEn);
    expect(d.data.description).toBe(description);
  });
});

// ═══ GROUP 9: Optional fields (API variants of the UI-spec TC-039/040) ════════
test.describe('JF-575 API | Optional fields', () => {
  test('TC-JF575-039 | create with Description omitted persists null description', async ({
    request,
  }) => {
    const { ar, en } = unique('TC039api');
    const created = await create(request, { nameAr: ar, nameEn: en, entityType: ENTITY.Ministry });
    expect(created.status()).toBe(200);
    const id = (await body<{ id: string }>(created)).data.id;
    const detail = await request.get(authorityByIdUrl(id), { headers: liquidatorAuthHeaders() });
    expect((await body<{ description: string | null }>(detail)).data.description).toBeNull();
  });

  test('TC-JF575-040 | create with zero attachments persists an empty attachment set', async ({
    request,
  }) => {
    const { ar, en } = unique('TC040api');
    const created = await create(request, {
      nameAr: ar,
      nameEn: en,
      entityType: ENTITY.Ministry,
      attachments: [],
    });
    expect(created.status()).toBe(200);
    const id = (await body<{ id: string }>(created)).data.id;
    const detail = await request.get(authorityByIdUrl(id), { headers: liquidatorAuthHeaders() });
    expect((await body<{ attachments?: unknown[] }>(detail)).data.attachments ?? []).toHaveLength(0);
  });
});

// ═══ GROUP 10: Concurrency ═══════════════════════════════════════════════════
test.describe('JF-575 API | Concurrency', () => {
  test('TC-JF575-051 | two distinct (non-duplicate) creates fired concurrently both succeed', async ({
    request,
  }) => {
    const a = unique('TC051-A');
    const b = unique('TC051-B');
    const [ra, rb] = await Promise.all([
      create(request, { nameAr: a.ar, nameEn: a.en, entityType: ENTITY.Ministry }),
      create(request, { nameAr: b.ar, nameEn: b.en, entityType: ENTITY.Authority }),
    ]);
    expect(ra.status(), 'concurrent create A').toBe(200);
    expect(rb.status(), 'concurrent create B').toBe(200);
    expect((await body<{ id: string }>(ra)).data.id).not.toBe((await body<{ id: string }>(rb)).data.id);
  });
});

// ═══ GROUP 11: Shared Kernel file endpoints (may be WAF/environment-gated) ════
test.describe('JF-575 API | Shared file endpoints', () => {
  test('TC-JF575-050 | file download endpoints require authentication (401)', async ({
    request,
  }) => {
    const downloadUrl = `${BASE_API_URL}/cases/api/v1/files/download-url?fileUrl=whatever`;
    const fileUrl = `${BASE_API_URL}/cases/api/v1/files/some-key`;
    const noDownload = await request.get(downloadUrl);
    const noFile = await request.get(fileUrl);

    // Environment gate: the edge WAF may challenge a non-interactive client (403 + HTML). Treat
    // that as inconclusive rather than a false pass — the security assertion is 401-without-auth.
    for (const [label, resp] of [
      ['download-url', noDownload],
      ['file-content', noFile],
    ] as const) {
      if (resp.status() === 403 && (resp.headers()['content-type'] ?? '').includes('text/html')) {
        test.skip(true, `${label}: edge WAF challenged the request (403 HTML) — run from a browser context`);
      }
      expect(resp.status(), `${label} without auth`).toBe(401);
    }
  });

  test('TC-JF575-061 | malformed base64 upload is rejected (400)', async ({ request }) => {
    const resp = await request.post(`${BASE_API_URL}/cases/api/v1/files/upload`, {
      headers: liquidatorAuthHeaders(),
      data: { fileName: 'bad.pdf', base64Content: 'not-valid-base64!!!', contentType: 'application/pdf' },
    });
    const ct = resp.headers()['content-type'] ?? '';
    if (resp.status() === 403 && ct.includes('text/html')) {
      test.skip(true, 'upload endpoint: edge WAF challenged the request (403 HTML) — run from a browser context');
    }
    expect(resp.status(), 'malformed base64 must be rejected').toBe(400);
    // FINDING (doc vs impl): the manual case expects errorCode INVALID_BASE64, but the API
    // surfaces the generic "BAD_REQUEST" — malformed base64 is caught at the input-validation
    // layer, which collapses ALL such failures to BAD_REQUEST (message in errorDetails) rather
    // than the granular code. Asserting the real contract; discrepancy reported, not patched.
    expect((await body(resp)).errorCode).toBe('BAD_REQUEST');
  });
});

// ═══ GROUP 12: Cross-case cases — BLOCKED on test data (kept, not dropped) ════
test.describe('JF-575 API | Cross-case (requires a second assigned case)', () => {
  test('TC-JF575-005 | same authority name is reusable across two different cases', async () => {
    test.skip(
      true,
      'Needs a SECOND court case assigned to Majed (1100000011). Only INH00581 is currently ' +
        'assigned; creating a second assignment requires an INSERT the SELECT/UPDATE-only db ' +
        'relay forbids. Seed a second case, then set SECOND_CASE_ID and implement.',
    );
  });

  test('TC-JF575-015 | list/detail are strictly scoped to their own case', async () => {
    test.skip(
      true,
      'Needs a SECOND assigned case with its own authority to prove no cross-case leakage. ' +
        'Same data-seeding blocker as TC-JF575-005.',
    );
  });
});
