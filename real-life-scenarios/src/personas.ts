/**
 * The people who use the Joint Funds portal. Each journey is told from one persona's
 * point of view. Login method reflects how that real user actually signs in.
 */
export type LoginMethod = 'internal' | 'nafath-individual' | 'nafath-serviceprovider' | 'demo-panel' | 'none';

export interface Persona {
  key: string;
  /** Human name shown in journey narration. */
  displayName: string;
  role: string;
  loginMethod: LoginMethod;
  /** For internal / demo-panel logins. */
  email?: string;
  password?: string;
  /** For Nafath logins. */
  nationalId?: string;
}

const env = process.env;

export const PERSONAS: Record<string, Persona> = {
  liquidator: {
    key: 'liquidator',
    displayName: 'Majed ALQAHTANI (المصفي)',
    role: 'Liquidator',
    loginMethod: 'nafath-serviceprovider', // liquidator enters via the SP/Nafath portal
    nationalId: env.LIQUIDATOR_NATIONAL_ID || '1100000011',
  },
  heir: {
    key: 'heir',
    displayName: 'Omar ALMUTAIRI (الوريث)',
    role: 'Heir',
    loginMethod: 'nafath-individual',
    nationalId: env.HEIR_NATIONAL_ID || '1133154595',
  },
  serviceProvider: {
    key: 'serviceProvider',
    displayName: 'Mohammed ALGHAMDI (مزود الخدمة)',
    role: 'ServiceProvider',
    loginMethod: 'nafath-serviceprovider',
    nationalId: env.SP_NATIONAL_ID || '1084039438',
  },
  estateManager: {
    key: 'estateManager',
    displayName: 'Demo Estate Manager (مدير التركة)',
    role: 'EstateManager',
    loginMethod: 'internal',
    email: env.EM_EMAIL || 'demo-estate-manager@azm.sa',
    password: env.EM_PASSWORD || 'Azm@123',
  },
  relationshipManager: {
    key: 'relationshipManager',
    displayName: 'Demo Relationship Manager (مدير العلاقة)',
    role: 'RelationshipManager',
    loginMethod: 'internal',
    email: env.RM_EMAIL || 'demo-relationship-manager@azm.sa',
    password: env.RM_PASSWORD || 'Azm@123',
  },
  purchasing: {
    key: 'purchasing',
    // On CIT the Purchasing role lives on the SystemAdmin demo account (PurchasingEmployee
    // was granted to admin@infath.sa during the cycle); log in via the demo-users panel.
    displayName: 'Purchasing Employee (موظف المشتريات)',
    role: 'PurchasingEmployee',
    loginMethod: 'demo-panel',
    email: 'admin@infath.sa',
  },
  public: {
    key: 'public',
    displayName: 'Public visitor (زائر)',
    role: 'Anonymous',
    loginMethod: 'none',
  },
};
