// Sample data used ONLY when VITE_USE_MOCK_DATA=true. Never used in normal mode.
import type { Job } from '../types/Job';
import type { Worker } from '../types/Worker';

export const MOCK_JOBS: Job[] = [
  { jobId: 1, title: 'Sample: Construction Mason', description: 'Sample job for UI preview only.', requiredSkill: 'Mason', location: 'Benz Circle', wagePerDay: 900, requiredWorkers: 10, status: 'OPEN', contractorId: 1 },
  { jobId: 2, title: 'Sample: Site Electrician', description: 'Sample job for UI preview only.', requiredSkill: 'Electrician', location: 'Benz Circle', wagePerDay: 1000, requiredWorkers: 2, status: 'OPEN', contractorId: 1 },
];
export const MOCK_WORKERS: Worker[] = [
  { workerId: 1, name: 'Sample Worker', phone: '9876543210', skill: 'Mason', experience: 5, location: 'Benz Circle', availability: true },
];
