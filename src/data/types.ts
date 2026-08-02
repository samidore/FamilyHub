export interface RatingSet {
  indoor: number | null;
  outdoor: number | null;
  stroller: number | null;
  weather: number | null;
  toddler: number | null;
  parent: number | null;
}

export interface DayTrip {
  name: string;
  shortName: string;
  location: string;
  category: string;
  driveMin: number;
  driveMax: number;
  distanceMiles?: number | null;
  status: string;
  ratings: RatingSet;
  tags: string[];
  conditions: string[];
  verifiedFacts: string;
  familyFit: string;
  risks: string;
  beforeYouGo: string;
  googleMapsUrl: string;
  officialUrl: string;
  verifiedDate: string;
  recommendationScore: number;
}

export interface LibraryEvent {
  day: string;
  dayOrder: number;
  time: string;
  timeOrder: number;
  name: string;
  library: string;
  location: string;
  drive: string;
  distanceMiles?: number | null;
  age: string;
  ageGroup: string;
  description: string;
  registration: string;
  badges: string[];
  googleMapsUrl: string;
  officialUrl: string;
  verifiedDate: string;
  dateRange: string;
}

export interface PediatricDentist {
  name: string;
  provider: string;
  eligibility: DentistEligibility;
  evidenceBands: DentistEvidenceBands;
  tier: number;
  rank: number;
  location: string;
  driveMin: number;
  driveMax: number;
  distanceMiles?: number | null;
  rating: number;
  reviewCount: number;
  healthgradesRating: number | null;
  healthgradesReviewCount: number;
  healthgradesWrittenCount: number;
  reviewConfidence: DentistReviewConfidence;
  healthgradesEvidence: string;
  healthgradesTags: string[];
  healthgradesNegativeSummary: string;
  negativeClassification: string;
  acceptsNewPatients: string;
  trainingSummary: string;
  schoolContext: string;
  certificationsAwards: string;
  longTermFit: string;
  strengths: string[];
  concernLevel: string;
  secondaryReviewSummary: string;
  negativeFindings: DentistNegativeFinding[];
  verificationQuestions: string[];
  reviewSources: string[];
  healthgradesUrl: string;
  officialUrl: string;
  googleMapsUrl: string;
  verifiedDate: string;
}

export type DentistBand = 'strong' | 'adequate' | 'concern' | 'unknown';
export type DentistReviewConfidence = 'very-limited' | 'limited' | 'moderate' | 'stronger' | 'unavailable';

export interface DentistEligibility {
  license: 'verified' | 'screened' | 'unknown' | 'concern';
  pediatricSpecialty: 'verified' | 'partial' | 'unknown' | 'concern';
  currentProvider: 'verified' | 'unknown';
  ageTwoAndNewPatients: 'verified' | 'partial' | 'unknown';
  discipline: 'screened-no-match' | 'unknown' | 'concern';
  decision: 'qualified' | 'conditional' | 'excluded';
}

export interface DentistEvidenceBands {
  clinicalFoundation: DentistBand;
  toddlerCare: DentistBand;
  continuity: DentistBand;
  patientExperience: DentistBand;
  practicalAccess: DentistBand;
}

export interface DentistNegativeFinding {
  category: 'child-interaction' | 'consent-restraint' | 'diagnosis-treatment' | 'clinical-safety' | 'billing-administration' | 'access-waiting';
  severity: 'none' | 'low' | 'moderate' | 'high' | 'unexplained';
  pattern: 'none' | 'isolated' | 'repeated' | 'unexplained' | 'not-available';
  scope: 'provider' | 'associate' | 'office' | 'unknown';
  summary: string;
}
