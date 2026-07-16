// Shared estate-creation flow: referral payload builders + the create-estate API call.
// The referral API derives classification criteria from the inquiry/auto-evaluation
// pipeline, so payload asset values are illustrative, not authoritative inputs.
import type { Page } from '@playwright/test';

const API_BASE = 'https://d-infath-jf-api.azm-cit.com';
const API_REFERRALS = `${API_BASE}/cases/api/v1/referrals`;
const COURT_API_KEY = process.env.COURT_API_KEY;
const TENANT_ID = 'azm-tenant-12345';

const ARDHKHAWA_NID = '1050607082'; // dev fixture NID: deed inquiry returns أرض خام (raw land)
const COURT_CODE = 'PSCT-NAJIZ-001';
// JF-244 work-requirements validation matches caseInfo.status byte-exactly; "مكتسب القطعية"
// (Path A) + an authority containing "بيع وتصفية وقسمة التركة" is required to reach classification.
const CASE_STATUS = 'مكتسب القطعية';
const FINALITY_METHOD = 'قرار مكتسب للقطعية';

export interface Heir {
  name: string;
  idNumber: string;
  relation: string;
}

export interface PayloadOptions {
  nid?: string;
  heirCount?: number;
  re?: unknown[];
  deposits?: unknown[];
  vehicles?: unknown[];
  portfolios?: unknown[];
  movables?: unknown[];
  outside?: boolean;
  court?: string;
}

export interface CreateEstateResult {
  status: number;
  body: any;
}

let _seq = 0;
function seq(): number {
  return ++_seq;
}

function heirs(count: number): Heir[] {
  return Array.from({ length: count }, (_, i) => ({
    name: `وارث ${i + 1}`,
    idNumber: String(2100000001 + i),
    relation: i % 2 === 0 ? 'ابن' : 'بنت',
  }));
}

function payload({
  nid = ARDHKHAWA_NID,
  heirCount = 2,
  re = [],
  deposits: depositsArg = [],
  vehicles: vehiclesArg = [],
  portfolios = [],
  movables: movablesArg = [],
  outside = false,
  court = COURT_CODE,
}: PayloadOptions = {}): Record<string, unknown> {
  const s = seq();
  const uid = `${Date.now()}-${s}`;
  const hs = heirs(heirCount);

  return {
    courtExternalCode: court,
    deedInfo: {
      deedNumber: `TRK-2026-${Date.now()}${String(s).padStart(3, '0')}`,
      deedDate: '1448-02-05',
      totalPages: 20,
      issuingAuthority: {
        country: 'المملكة العربية السعودية',
        ministry: 'وزارة العدل',
        court: 'محكمة الأحوال الشخصية بالرياض',
        department: 'الدائرة القضائية السابعة',
      },
    },
    deceased: {
      name: 'عبدالرحمن سالم فهد الدوسري',
      idType: 'هوية وطنية',
      idNumber: nid,
      nationality: 'SA',
      dateOfDeathHijri: '1446-01-20',
      estateDocumentNumber: `HC-1447-TC171-${uid}`,
      estateDocumentDate: '1447-05-10',
      estateDocumentIssuedBy: 'محكمة الأحوال الشخصية بالرياض',
      probateCertificateAttachment: `CERT-TC171-${uid}.pdf`,
    },
    caseInfo: {
      caseNumber: `1447/7/TC171-${uid}`,
      caseDate: '1447-06-15',
      caseType: 'تصفية تركة',
      status: CASE_STATUS,
      finalityMethod: FINALITY_METHOD,
      finalityStatement: 'صادقت محكمة الاستئناف على منطوق الحكم',
    },
    parties: {
      plaintiffs: [{ name: hs[0].name, idType: 'هوية وطنية', idNumber: hs[0].idNumber, nationality: 'SA', role: 'وارث / أصيل' }],
      defendants: [{ name: hs[1].name, idType: 'هوية وطنية', idNumber: hs[1].idNumber, nationality: 'SA', role: 'وارثة / مدعى عليها' }],
    },
    estateAssets: { realEstate: re, deposits: depositsArg, vehicles: vehiclesArg, investmentPortfolios: portfolios, movables: movablesArg },
    inheritanceDistribution: {
      legalBasis: 'المادة 180 من نظام الأحوال الشخصية',
      distributionRule: 'الأنصبة الشرعية',
      totalShares: heirCount,
      heirs: hs.map((h) => ({
        name: h.name,
        idType: 'هوية وطنية',
        idNumber: h.idNumber,
        relation: h.relation,
        gender: h.relation === 'ابن' ? 'ذكر' : 'أنثى',
        sharesPerPerson: 1,
        totalShares: heirCount,
      })),
    },
    ruling: {
      verdictItems: [
        { id: 1, title: 'الحكم بالتصفية', item: 'أولاً', description: 'إسناد تصفية أصول التركة لمركز الإسناد والتصفية' },
        { id: 2, title: 'نطاق التركة', item: 'ثانياً', description: outside ? 'تشمل أصولاً خارج المملكة العربية السعودية' : 'داخل المملكة العربية السعودية' },
      ],
      propertyDisposal: { method: 'بيع بالمزاد العلني الإلكتروني', deedNumber: '3100099222', deedDate: '1440-10-25' },
      objectionPeriod: { durationDays: 30, startFrom: 'تاريخ صدور صك الحكم النهائي', consequence: 'سقوط الحق في الاستئناف' },
    },
    liquidationCenter: {
      name: 'مركز إنفاذ للتصفية',
      appointmentBasis: 'أمر قضائي',
      appointmentDate: '1448-01-25',
      feePercentage: 2.5,
      feeBase: 'إجمالي القيمة المتحصلة',
      authorities: [{ id: 1, description: 'بيع وتصفية وقسمة التركة للمستفيدين' }],
    },
    executiveFormula: { text: 'على السلطات المختصة تنفيذ هذا الحكم', issuedBy: 'محكمة الأحوال الشخصية بالرياض', judicialDepartmentHead: 'رئيس الدائرة القضائية السابعة' },
    metadata: { documentLanguage: 'ar', documentType: 'صك حكم تصفية نهائي', serviceType: 'ESTATE_REFERRAL', isRedacted: false, generatedAt: new Date().toISOString(), schemaVersion: '1.0' },
    technicalReferenceId: `NAJIZ-JF-TC171-${uid}`,
  };
}

// Asset builders
const reAsset = () => ({ location: { city: 'الرياض', district: 'العليا' } });
const deposit = (v = 100000, i = 0) => ({ bankName: 'البنك الأهلي السعودي', accountNumber: `ACC-${Date.now()}-${i}`, estimatedValue: v });
const vehicle = (v = 50000, i = 0) => ({ make: 'تويوتا', model: 'كامري', year: 2020, plateNumber: `PL${i}-${Date.now()}`, estimatedValue: v });
const portfolio = (v = 500000, i = 0) => ({ portfolioNumber: `PORT-${Date.now()}-${i}`, brokerName: 'تداول', estimatedValue: v });
const movable = (v = 10000, i = 0) => ({ description: `منقول ${i + 1}`, estimatedValue: v });
const deposits = (n: number, v = 100000) => Array.from({ length: n }, (_, i) => deposit(v, i));
const vehicles = (n: number, v = 50000) => Array.from({ length: n }, (_, i) => vehicle(v, i));
const portfolios = (n: number, v = 500000) => Array.from({ length: n }, (_, i) => portfolio(v, i));
const movables = (n: number, v = 10000) => Array.from({ length: n }, (_, i) => movable(v, i));

/** POST a referral to create an estate. `portalPage` must be an authenticated portal page. */
async function createEstate(portalPage: Page, p: unknown): Promise<CreateEstateResult> {
  const r = await portalPage.request.post(API_REFERRALS, {
    headers: { 'Content-Type': 'application/json', 'X-Court-Api-Key': COURT_API_KEY ?? '', TenantIdentifier: TENANT_ID, 'Accept-Language': 'ar-SA' },
    data: JSON.stringify(p),
  });
  const status = r.status();
  let body: any;
  try {
    body = await r.json();
  } catch {
    body = { raw: await r.text() };
  }
  return { status, body };
}

function extractReferralNum(body: any): string | null {
  return (
    body?.internalReferralNumber ||
    body?.referralNumber ||
    body?.data?.internalReferralNumber ||
    body?.data?.referralNumber ||
    body?.internal_referral_number ||
    null
  );
}

export {
  API_REFERRALS,
  COURT_API_KEY,
  TENANT_ID,
  ARDHKHAWA_NID,
  COURT_CODE,
  CASE_STATUS,
  payload,
  heirs,
  reAsset,
  deposit,
  vehicle,
  portfolio,
  movable,
  deposits,
  vehicles,
  portfolios,
  movables,
  createEstate,
  extractReferralNum,
};
