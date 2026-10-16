export type BreastSurgeonFit = 'strong' | 'adequate' | 'oncology-focused';
export type BreastSurgeonScope = 'bergen-nj' | 'nearby-nj' | 'ny-alternative';
export type BreastSurgeonSafetyStatus = 'requires-confirmation' | 'verified' | 'screened-clear' | 'concern';
export type BreastSurgeonReviewSource = 'Healthgrades' | 'Health system' | 'Zocdoc';

export interface BreastSurgeonReview {
  source: BreastSurgeonReviewSource;
  scope: 'physician';
  rating: number | null;
  reviewCount: number;
  writtenCount: number | null;
  url: string;
  summary: string;
}

export interface BreastSurgeon {
  id: string;
  name: string;
  system: string;
  practice: string;
  locationScope: BreastSurgeonScope;
  address: string;
  phone: string;
  tier: 1 | 2 | 3;
  rank: number;
  clinicalFit: BreastSurgeonFit;
  fitSignals: string[];
  clinicalSummary: string;
  trainingSummary: string;
  centerSummary: string;
  strengths: string[];
  evidenceGaps: string[];
  availability: 'listed-accepting' | 'needs-call';
  licenseStatus: BreastSurgeonSafetyStatus;
  disciplineStatus: BreastSurgeonSafetyStatus;
  negativeSummary: string;
  verificationQuestions: string[];
  reviewEvidence: BreastSurgeonReview[];
  officialUrl: string;
  centerUrl: string;
  verifiedDate: string;
}
