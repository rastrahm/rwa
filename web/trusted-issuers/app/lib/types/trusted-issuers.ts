/**
 * Tipos TypeScript para TrustedIssuersRegistry y ClaimTopicsRegistry
 */

export interface TrustedIssuer {
  address: string;
  claimTopics: bigint[];
  isTrusted: boolean;
}

export interface ClaimTopic {
  id: number;
  name: string;
  description: string;
  commonUse: string;
}

export interface TrustedIssuerRequestData {
  requesterAddress: string;
  organizationName: string;
  description?: string;
  contactEmail?: string;
  website?: string;
  claimTopics: number[];
}

// Claim topics según MI_CUADERNO.md (líneas 1022-1033)
export const CLAIM_TOPICS: ClaimTopic[] = [
  {
    id: 1,
    name: 'KYC',
    description: 'Know Your Customer',
    commonUse: 'Todos los tokens',
  },
  {
    id: 2,
    name: 'AML',
    description: 'Anti-Money Laundering',
    commonUse: 'Tokens regulados',
  },
  {
    id: 3,
    name: 'PEP',
    description: 'Politically Exposed Person',
    commonUse: 'Verificación de PEP',
  },
  {
    id: 4,
    name: 'Sanctions',
    description: 'Lista de sanciones',
    commonUse: 'Verificación de sanciones',
  },
  {
    id: 5,
    name: 'Geographic',
    description: 'Restricciones geográficas',
    commonUse: 'Real Estate, algunos securities',
  },
  {
    id: 6,
    name: 'Tax Compliance',
    description: 'Cumplimiento fiscal',
    commonUse: 'Tokens con implicaciones fiscales',
  },
  {
    id: 7,
    name: 'Accredited',
    description: 'Accredited Investor',
    commonUse: 'Securities, inversiones grandes',
  },
  {
    id: 8,
    name: 'Risk Assessment',
    description: 'Evaluación de riesgo',
    commonUse: 'Tokens de alto riesgo',
  },
  {
    id: 9,
    name: 'Source of Funds',
    description: 'Origen de fondos',
    commonUse: 'Inversiones grandes',
  },
  {
    id: 10,
    name: 'Storage Verification',
    description: 'Verificación de almacenamiento',
    commonUse: 'Commodities físicos',
  },
];

