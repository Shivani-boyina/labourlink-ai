export interface Contractor {
  contractorId: number;
  contractorName: string;
  companyName?: string;
  phone: string;
  location?: string;
  state?: string | null;
  district?: string | null;
}
export interface ContractorInput {
  state?: string | null;
  district?: string | null;
  contractorName: string;
  companyName: string;
  phone: string;
  location: string;
  password: string;
}
