export interface Worker {
  workerId: number;
  name: string;
  phone: string;
  password?: string;
  skill: string;
  experience: number;
  location: string;
  state?: string | null;
  district?: string | null;
  category?: string | null;
  availability: boolean;
  expectedWagePerDay?: number | null;
  averageRating?: number | null;
  reviewCount?: number;
  latitude?: number | null;
  longitude?: number | null;
  locationShared?: boolean;
}

export type WorkerInput = Omit<Worker, 'workerId'>;

export interface WorkerMatch extends Worker {
  matchingReasons?: string[];
  matchingScore?: number | null;
  recommendation?: {
    method: 'ML' | 'RULE_BASED';
    matchPercentage: number | null;
    fallbackReason: 'FEATURES_UNAVAILABLE' | 'MODEL_UNAVAILABLE' | 'SCORING_LIMIT' | null;
    featureIssues: Array<{ feature: string; reason: 'MISSING' | 'UNSUPPORTED' | 'HISTORY_UNKNOWN' }>;
  } | null;
}
