export type DayTripEnvironment = 'indoor' | 'outdoor';
export type DayTripWeatherExclusion = 'rain' | 'heat' | 'post-rain';
export type DayTripActivityTag = 'woody-walk' | 'playground' | 'indoor-visit' | 'animals' | 'water-play' | 'aquarium' | 'pick-your-own';
export type DayTripHours = 'always' | 'unknown' | Record<DayTripWeekday, [string, string][]>;
export type DayTripWeekday = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';

export interface DayTripLocation {
  name: string;
  environment: DayTripEnvironment;
  tags: DayTripActivityTag[];
  notFor: DayTripWeatherExclusion[];
  stroller: boolean;
  hours: DayTripHours;
}

export interface DayTrip {
  id: string;
  name: string;
  aliases?: string[];
  city: string;
  state: string;
  driveMinutes: number | null;
  driveTimeProvenance: DayTripDriveTimeProvenance;
  note: string;
  notice?: string;
  locations: DayTripLocation[];
  googleMapsUrl: string;
  officialUrl: string;
  verifiedDate: string;
}

export interface DayTripDriveTimeProvenance {
  checkedDate: string;
  primarySource: string;
  status: 'verified' | 'unknown';
  crossCheckSource?: string;
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
export type DermatologyReviewConfidence = 'very-limited' | 'limited' | 'moderate' | 'strong' | 'very-strong' | 'unavailable';
export type DermatologyAvailability = 'verified' | 'conditional' | 'unknown';
export type DermatologyConcernLevel = 'none' | 'low' | 'moderate' | 'high';
export type DermatologyCapability = 'eczema-dermatitis' | 'contact-dermatitis' | 'patch-testing' | 'anogenital-dermatology' | 'infection-fungal-differential' | 'psoriasis-lichen-differential' | 'biopsy' | 'multidisciplinary-referral';

export interface AdultDermatologist {
  name: string;
  provider: string;
  gender: 'female';
  practice: string;
  location: string;
  locationScope: 'local' | 'nyc';
  driveMin: number | null;
  driveMax: number | null;
  tier: number;
  rank: number;
  eligibility: DermatologistEligibility;
  evidenceBands: DermatologistEvidenceBands;
  capabilities: DermatologyCapability[];
  perianalDermatitisSummary: string;
  primaryReviewSource: 'Healthgrades' | 'Health system' | 'Official practice' | 'Zocdoc';
  primaryRating: number | null;
  primaryReviewCount: number;
  primaryWrittenCount: number | null;
  healthgradesRating: number | null;
  healthgradesReviewCount: number;
  healthgradesWrittenCount: number | null;
  reviewConfidence: DermatologyReviewConfidence;
  reviewEvidence: DermatologistReviewEvidence[];
  acceptsNewPatients: string;
  availability: DermatologyAvailability;
  trainingSummary: string;
  schoolContext: string;
  certificationsAwards: string;
  safetyEvidence: DermatologistSafetyEvidence[];
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
  clinicalFoundation: DermatologyBand;
  perianalDermatitisFit: DermatologyBand;
  diagnosticBreadth: DermatologyBand;
  patientExperience: DermatologyBand;
  practicalAccess: DermatologyBand;
}

export interface DermatologistSafetyEvidence {
  source: 'NJ license' | 'NY license' | 'American Board of Dermatology' | 'Health system';
  status: 'verified' | 'no-public-match' | 'requires-confirmation';
  summary: string;
  url: string;
}

export interface DermatologistReviewEvidence {
  source: 'Healthgrades' | 'Health system' | 'Official practice' | 'Zocdoc' | 'Google Maps' | 'Yelp';
  scope: 'provider' | 'office';
  rating: number | null;
  reviewCount: number;
  writtenCount: number | null;
  confidence: DermatologyReviewConfidence;
  summary: string;
  url: string;
}

export interface DermatologistNegativeFinding {
  category: 'communication' | 'sensitive-exam-respect' | 'diagnostic-evaluation' | 'treatment' | 'safety' | 'access-waiting' | 'billing-administration';
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
