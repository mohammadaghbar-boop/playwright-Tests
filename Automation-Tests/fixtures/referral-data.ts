/** Base referral payload — spread and override per test case */
export const BASE_REFERRAL = {
  courtExternalCode: 'PSCT-NAJIZ-001',
  deedInfo: {
    deedNumber: 'QA-FAIL-001',
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
    name: 'عبد الله بن منصور السديري',
    idType: 'هوية وطنية',
    idNumber: '1099887766',
    nationality: 'SA',
    dateOfDeathHijri: '1446-01-20',
    estateDocumentNumber: 'EST-QA-001',
    estateDocumentDate: '1447-05-10',
    estateDocumentIssuedBy: 'محكمة الأحوال الشخصية بالرياض',
    probateCertificateAttachment: 'CERT-RIYADH-2026-X7.pdf',
  },
  caseInfo: {
    caseNumber: 'QA5001',
    caseDate: '1447-06-15',
    caseType: 'تصفية تركة استثمارية',
    status: 'نهائي',
    finalityMethod: 'قرار مكتسب للقطعية',
    finalityStatement: 'صادقت محكمة الاستئناف بمنطقة الرياض على منطوق الحكم بجميع بنوده',
  },
  parties: {
    plaintiffs: [
      { name: 'فيصل عبد الله منصور السديري', idType: 'هوية وطنية', idNumber: '1022334455', nationality: 'SA', role: 'وارث / أصيل' },
    ],
    defendants: [
      { name: 'منيرة ناصر الفهد', idType: 'هوية وطنية', idNumber: '2022334455', nationality: 'SA', role: 'وارثة / مدعى عليها' },
    ],
  },
  estateAssets: {
    realEstate: [
      {
        deedNumber: '3100092221',
        deedDate: '1440-10-25',
        plotNumber: '55/ب',
        location: { city: 'الرياض', district: 'حي الملقا' },
        propertyType: 'عمارة سكنية تجارية',
        currentStatus: 'فعال - صك إلكتروني',
        inquiryDocumentNumber: 'INQ-RUH-2026-X9',
        inquiryDate: '1447-11-05',
        inquiryMethod: 'بوابة ناجز العقارية',
      },
    ],
    vehicles: [
      {
        plateNumber: 'أ ب ج 7777', plateType: 'خصوصي', vehicleType: 'سيارة ركاب',
        make: 'بورش', model: 'باناميرا', year: 2025,
        chassisNumber: 'WP0ZZZ97ZFL123456', registrationNumber: 'REG-RUH-99221',
        registrationExpiryDate: '1450-05-15',
      },
    ],
    movables: [
      {
        assetType: 'محفظة أسهم دولية',
        description: 'أسهم في شركات التكنولوجيا العالمية وصناديق عقارية',
        estimatedValue: 5250000.00, referenceNumber: 'INT-STK-992288',
        custodian: 'شركة جدوى للاستثمار',
      },
    ],
  },
  inheritanceDistribution: {
    legalBasis: 'المادة 180 من نظام الأحوال الشخصية',
    distributionRule: 'الأنصبة الشرعية المقدرة بالفرض والتعصيب',
    totalShares: 8,
    heirs: [
      { name: 'منيرة ناصر الفهد', idType: 'هوية وطنية', idNumber: '2022334455', relation: 'زوجة', gender: 'أنثى', sharesPerPerson: 1, totalShares: 8 },
      { name: 'فيصل عبد الله منصور السديري', idType: 'هوية وطنية', idNumber: '1022334455', relation: 'ابن', gender: 'ذكر', sharesPerPerson: 7, totalShares: 8 },
    ],
  },
  ruling: {
    verdictItems: [
      { id: 1, title: 'الحكم بالتصفية القضائية', item: 'أولاً', description: 'إسناد تصفية كامل أصول التركة العقارية والمنقولة والأسهم لمركز الإسناد والتصفية (إنفاذ)' },
      { id: 2, title: 'سداد المطالبات', item: 'ثانياً', description: 'سداد ديون التركة الموثقة والمصروفات الإدارية قبل إجراء عملية التوزيع المالي' },
    ],
    propertyDisposal: { method: 'بيع بالمزاد العلني الإلكتروني عبر منصات إنفاذ المعتمدة', deedNumber: '3100099221', deedDate: '1440-10-25' },
    objectionPeriod: { durationDays: 30, startFrom: 'تاريخ صدور صك الحكم النهائي', consequence: 'سقوط الحق في الاستئناف واكتساب القطعية' },
  },
  liquidationCenter: {
    name: 'مركز إنفاذ للتصفية',
    appointmentBasis: 'أمر قضائي قطعي واجب النفاذ',
    appointmentDate: '1448-01-25',
    feePercentage: 2.5,
    feeBase: 'إجمالي القيمة المتحصلة من تصفية التركة',
    authorities: [
      { id: 1, description: 'تعيين مكاتب هندسية ومقيمين معتمدين' },
      { id: 2, description: 'تمثيل التركة في الإفراغ والتوقيع' },
      { id: 3, description: 'تصفية المحافظ الاستثمارية وتحويلها لنقد' },
      { id: 4, description: 'إيداع صافي الأنصبة في حسابات الورثة البنكية' },
      { id: 5, description: 'اتخاذ كافة الوسائل التسويقية لضمان أعلى سعر للبيع' },
    ],
  },
  executiveFormula: {
    text: 'على السلطات المختصة تنفيذ هذا الحكم بكافة الوسائل النظامية ولو استدعى الأمر استعمال القوة الجبرية.',
    issuedBy: 'محكمة الأحوال الشخصية بالرياض',
    judicialDepartmentHead: 'رئيس الدائرة القضائية السابعة',
  },
  metadata: {
    documentLanguage: 'ar',
    documentType: 'صك حكم تصفية نهائي',
    serviceType: 'ESTATE_REFERRAL',
    isRedacted: false,
    generatedAt: '2026-04-21T15:48:00Z',
    schemaVersion: '1.0',
  },
  technicalReferenceId: 'NAJIZ-JF-2026-RUH-2132',
};

// Unique run suffix — appended to all case/deed numbers to avoid 409 Conflicts
// Uses epoch seconds so each test run produces distinct identifiers
export const RUN_ID = String(Math.floor(Date.now() / 1000)).slice(-6); // e.g. "942668"

export function makeReferral(overrides: Record<string, unknown> = {}) {
  return { ...BASE_REFERRAL, ...overrides };
}

/** Build a unique referral using the QA guide body format */
export function makeUniqueReferral(tcTag: string, extra: Record<string, unknown> = {}) {
  return {
    ...makeGuideReferral(
      `${RUN_ID}${String(tcTag.replace(/\D/g, '')).padStart(4, '0')}`,  // numeric deed: e.g. "9426680004"
      `QA-${tcTag}-${RUN_ID}`,
      `EST-${tcTag}-${RUN_ID}`
    ),
    ...extra,
  };
}

/**
 * Minimal referral body from the QA guide §3 — national ID 1198639757
 * makes heirs/deed/titles succeed automatically in the mock.
 */
export function makeGuideReferral(deedNumber: string, caseNumber: string, estateDocNumber: string) {
  return {
    courtExternalCode: 'PSCT-NAJIZ-001',
    deedInfo: {
      deedNumber,
      deedDate: '1446-05-15',
      totalPages: 12,
      issuingAuthority: { country: 'السعودية', ministry: 'العدل', court: 'الرياض', department: 'الأحوال الشخصية' },
    },
    caseInfo: {
      caseNumber,
      caseDate: '1446-05-10',
      caseType: 'تصفية تركة',
      status: 'مكتسب القطعية',
      finalityMethod: 'انقضاء مدة الاعتراض',
      finalityStatement: 'حكم نهائي قابل للتنفيذ',
    },
    parties: {
      plaintiffs: [{ name: 'وارث', idType: 'هوية وطنية', idNumber: '1198639757', nationality: 'سعودي', role: 'وارث' }],
      defendants: [],
    },
    deceased: {
      name: 'متوفى QA',
      idType: 'هوية وطنية',
      idNumber: '1198639757',
      nationality: 'سعودي',
      dateOfDeathHijri: '1446-01-15',
      estateDocumentNumber: estateDocNumber,
      estateDocumentDate: '1446-02-01',
      estateDocumentIssuedBy: 'محكمة الرياض',
      probateCertificateAttachment: `https://docs.example/probate/${estateDocNumber}.pdf`,
    },
    liquidationCenter: {
      name: 'مركز إنفاذ',
      appointmentBasis: 'قرار مجلس الوزراء',
      appointmentDate: '1446-03-01',
      feePercentage: 5.0,
      feeBase: 'صافي التركة',
      authorities: [
        { id: 1, description: 'تقييم التركة' },
        { id: 2, description: 'بيع وتصفية وقسمة التركة' },
      ],
    },
    executiveFormula: {
      text: 'الصيغة التنفيذية الرسمية للحكم',
      issuedBy: 'محكمة الرياض',
      judicialDepartmentHead: 'القاضي عبدالله العتيبي',
    },
  };
}

// Scenario-specific referrals — deed numbers are purely numeric for system compatibility
export const REFERRAL_TC001 = makeGuideReferral(
  `${RUN_ID}0001`, `QA5001-${RUN_ID}`, `EST-QA-FAIL-${RUN_ID}`
);

export const REFERRAL_TC002 = makeGuideReferral(
  `${RUN_ID}0002`, `QA6001-${RUN_ID}`, `EST-QA-PASS-${RUN_ID}`
);
