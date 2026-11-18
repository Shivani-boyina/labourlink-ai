import { request } from './api';

export interface EmploymentGroup { name: string; total: number; employed: number; unemployed: number; unknown: number }
export interface EmploymentSummary {
  cohort: string; totalWorkers: number; employedWorkers: number; unemployedWorkers: number; unknownWorkers: number;
  hiredToday: number; hiringPercentage: number; employmentRate: number; unemploymentRate: number;
  workersWithMlRecommendations: number | null; recommendationMeasuredAt: string | null;
  averageUnemploymentDays: number | null; unemploymentDurationCoverage: number;
  skills: EmploymentGroup[]; locations: EmploymentGroup[];
  trends: { date: string; hires: number; datedAssignments: number }[];
}
export interface EmploymentDashboard {
  generatedAt: string; timezone: string; provenanceWarning: string; unclassifiedDemoWorkers: number;
  actual: EmploymentSummary; demo: EmploymentSummary; definitions: string[];
}
export interface ValidationReport {
  sourceHash: string; measuredAt: string; workersCovered: number; jobsCovered: number; openJobsWithCapacity: number;
  possiblePairs: number; candidatePairsChecked: number; eligiblePairs: number; mlScoredPairs: number;
  workersWithMlRecommendations: number; workersWithZeroRecommendations: number; workersWithoutMlScores: number;
  scoreDistribution: Record<string, number>; errors: Record<string, number>; featureIssues: Record<string, number>;
  workers: { workerId: number; eligibleRecommendations: number; mlRecommendations: number; diagnostics: string[] }[];
  provenanceWarning: string;
}
export interface ValidationRun {
  id?: string; status: 'NOT_RUN' | 'RUNNING' | 'COMPLETED' | 'FAILED';
  startedAt?: string; completedAt?: string; error?: string; report?: ValidationReport;
}
export const getEmployment = (days: number) => request<EmploymentDashboard>(`/analytics/employment?days=${days}`, { auth: true });
export const getValidation = () => request<ValidationRun>('/analytics/validation/latest', { auth: true });
export const startValidation = () => request<ValidationRun>('/analytics/validation', { method: 'POST', auth: true });
