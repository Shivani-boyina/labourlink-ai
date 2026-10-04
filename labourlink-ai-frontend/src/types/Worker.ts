export interface Worker {
  workerId: number;
  name: string;
  phone: string;
  password?: string;
  skill: string;
  experience: number;
  location: string;
  availability: boolean;
}

export type WorkerInput = Omit<Worker, 'workerId'>;