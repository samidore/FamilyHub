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

export type DermatologyBand = 'strong' | 'adequate' | 'concern' | 'unknown';
export type DermatologyReviewConfidence = 'moderate' | 'strong' | 'very-strong' | 'unavailable';
export type DermatologyAvailability = 'verified' | 'conditional' | 'unknown';
export type DermatologyConcernLevel = 'none' | 'low' | 'moderate' | 'high';

export interface AdultDermatologist {
  name: string;
  provider: string;
  practice: string;
  location: string;
  driveMin: number;
  driveMax: number;
  tier: number;
  rank: number;
  eligibility: DermatologistEligibility;
  evidenceBands: DermatologistEvidenceBands;
  adultAcneSummary: string;
  primaryReviewSource: 'Healthgrades' | 'Health system';
  primaryRating: number;
  primaryReviewCount: number;
  primaryWrittenCount: number;
  healthgradesRating: number | null;
  healthgradesReviewCount: number;
  healthgradesWrittenCount: number;
  reviewConfidence: DermatologyReviewConfidence;
  reviewEvidence: DermatologistReviewEvidence[];
  acceptsNewPatients: string;
  availability: DermatologyAvailability;
  trainingSummary: string;
  schoolContext: string;
  certificationsAwards: string;
  strengths: string[];
  concernLevel: DermatologyConcernLevel;
  negativeSummary: string;
  negativeClassification: string;
  negativeFindings: DermatologistNegativeFinding[];
  verificationQuestions: string[];
  healthgradesUrl: string;
  officialUrl: string;
  googleMapsUrl: string;
  verifiedDate: string;
}

export interface DermatologistEligibility {
  license: 'verified' | 'screened' | 'unknown' | 'concern';
  discipline: 'verified' | 'screened-no-match' | 'unknown' | 'concern';
  boardCertification: 'verified' | 'partial' | 'unknown' | 'concern';
  decision: 'qualified' | 'conditional' | 'excluded';
}

export interface DermatologistEvidenceBands {
  clinicalQuality: DermatologyBand;
  adultAcneFit: DermatologyBand;
  patientExperience: DermatologyBand;
}

export interface DermatologistReviewEvidence {
  source: 'Healthgrades' | 'Health system' | 'Official practice' | 'Google Maps' | 'Yelp';
  scope: 'provider' | 'office';
  rating: number | null;
  reviewCount: number;
  writtenCount: number | null;
  confidence: DermatologyReviewConfidence;
  summary: string;
  url: string;
}

export interface DermatologistNegativeFinding {
  category: 'communication' | 'diagnosis-treatment' | 'medication-monitoring' | 'safety' | 'access-waiting' | 'billing-administration';
  severity: 'none' | 'low' | 'moderate' | 'high' | 'unexplained';
  pattern: 'none' | 'isolated' | 'repeated' | 'unexplained' | 'not-available';
  scope: 'provider' | 'office' | 'unknown';
  summary: string;
}

export type ColonoscopyBand = 'strong' | 'adequate' | 'concern' | 'unknown';
export type ColonoscopyReviewConfidence = 'very-limited' | 'limited' | 'moderate' | 'strong' | 'very-strong' | 'unavailable';
export type ColonoscopyConcernLevel = 'none' | 'low' | 'moderate' | 'high';

export interface ColonoscopySpecialist {
  name: string;
  provider: string;
  system: string;
  facility: string;
  facilityClass: 'academic-hospital' | 'cancer-center';
  location: string;
  driveMin: number;
  driveMax: number;
  distanceMiles?: number | null;
  tier: number;
  rank: number;
  eligibility: ColonoscopyEligibility;
  evidenceBands: ColonoscopyEvidenceBands;
  capabilities: string[];
  clinicalFit: string;
  facilityEvidence: string;
  acceptsNewPatients: string;
  networkVerification: ColonoscopyNetworkVerification;
  trainingSummary: string;
  schoolContext: string;
  certificationsAwards: string;
  primaryReviewSource: 'Healthgrades';
  healthgradesRating: number | null;
  healthgradesReviewCount: number;
  healthgradesWrittenCount: number;
  reviewConfidence: ColonoscopyReviewConfidence;
  healthgradesEvidence: string;
  healthgradesTags: string[];
  healthgradesNegativeSummary: string;
  negativeClassification: string;
  safetyScreen: string;
  secondaryReviewSummary: string;
  negativeFindings: ColonoscopyNegativeFinding[];
  concernLevel: ColonoscopyConcernLevel;
  strengths: string[];
  verificationQuestions: string[];
  healthgradesUrl: string;
  officialUrl: string;
  facilityUrl: string;
  googleMapsUrl: string;
  nyProfileUrl: string;
  opmcUrl: string;
  verifiedDate: string;
}

export interface ColonoscopyEligibility {
  license: 'verified' | 'screened' | 'unknown' | 'concern';
  boardCertification: 'verified' | 'partial' | 'unknown' | 'concern';
  advancedEndoscopy: 'verified' | 'partial' | 'unknown' | 'concern';
  currentProvider: 'verified' | 'conditional' | 'unknown';
  discipline: 'screened-no-match' | 'unknown' | 'concern';
  decision: 'qualified' | 'conditional' | 'excluded';
}

export interface ColonoscopyEvidenceBands {
  complexPolypFit: ColonoscopyBand;
  facilitySafety: ColonoscopyBand;
  patientExperience: ColonoscopyBand;
  practicalAccess: ColonoscopyBand;
}

export interface ColonoscopyNetworkVerification {
  planLabel: string;
  facilityStatus: 'publicly-supported' | 'requires-confirmation';
  professionalStatus: 'requires-confirmation';
  summary: string;
  sourceUrls: string[];
  verifiedDate: string;
}

export interface ColonoscopyNegativeFinding {
  category: 'clinical-safety' | 'missed-lesion-resection' | 'consent-sedation' | 'communication-care' | 'billing-administration' | 'access-waiting' | 'unverified-allegation';
  severity: 'none' | 'low' | 'moderate' | 'high' | 'unexplained';
  pattern: 'none' | 'isolated' | 'repeated' | 'unexplained' | 'not-available';
  scope: 'provider' | 'facility' | 'office' | 'unknown';
  summary: string;
}
