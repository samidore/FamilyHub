export type ObGynScope = 'ob' | 'gyn';
export type ObGynSection = 'valley-ob' | 'hackensack-ob' | 'englewood-ob' | 'gyn';
export type ObGynHospitalRelation = 'confirmed-delivery' | 'likely-delivery' | 'affiliation-only' | 'unclear';

export interface ObGynPlacement {
  section: ObGynSection;
  rank: number;
  tier: 1 | 2 | 3;
  familyScore: number;
  hospitalRelation?: ObGynHospitalRelation;
  deliveryModel?: string;
}

export interface ObGynProvider {
  id: string;
  name: string;
  practice: string;
  location: string;
  scopes: ObGynScope[];
  placements: ObGynPlacement[];
  evidence: string;
  reviews: string;
  availability: string;
  strengths: string[];
  checks: string[];
  officialUrl: string;
  healthgradesUrl: string;
  verifiedDate: string;
}
