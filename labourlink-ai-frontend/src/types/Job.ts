export interface Job {
  jobId: number;
  title: string;
  description: string;
  requiredSkill: string;
  location: string;
  wagePerDay: number;
  requiredWorkers: number;
  status: string;
  contractorId: number;
}
export type JobInput = Omit<Job, 'jobId'>;
export interface JobFilters {
  skill?: string;
  location?: string;
  minWage?: string;
  maxWage?: string;
}
