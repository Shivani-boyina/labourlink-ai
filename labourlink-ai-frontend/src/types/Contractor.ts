export interface Contractor {
  contractorId: number;
  contractorName: string;
  companyName?: string;
  phone: string;
  location?: string;
}
export interface ContractorInput {
  contractorName: string;
  companyName: string;
  phone: string;
  location: string;
  password: string;
}
