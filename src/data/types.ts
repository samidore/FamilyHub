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
  reviewSources: string[];
  healthgradesUrl: string;
  officialUrl: string;
  googleMapsUrl: string;
  verifiedDate: string;
}
