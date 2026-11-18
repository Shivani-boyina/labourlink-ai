export interface Job {
  jobId: number;
  title: string;
  description: string;
  requiredSkill: string;
  location: string;
  state?: string | null;
  district?: string | null;
  category?: string | null;
  minimumExperience?: number | null;
  durationDays?: number | null;
  startDate?: string | null;
  endDate?: string | null;
  wagePerDay: number;
  requiredWorkers: number;
  status: string;
  contractorId: number;
}
export type JobInput = Omit<Job, 'jobId' | 'contractorId'>;
export interface JobFilters {
  skill?: string;
  location?: string;
  minWage?: string;
  maxWage?: string;
}
