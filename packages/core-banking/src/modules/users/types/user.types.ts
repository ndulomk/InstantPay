export enum KYCSTATUS {
  PENDING = "pending",
  APPROVED = "approved",
  REJECTED = "rejected",
}

export interface UserType {
  id: string;
  username: string;
  email: string;
  phone: string;
  passwordHash: string;
  biNumber: string;
  nif: string;
  fullName: string;
  dateOfBirth?: Date;
  kycStatus: KYCSTATUS;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserDbRow {
  id: string;
  username: string;
  email: string;
  phone: string;
  password_hash: string;
  bi_number: string;
  nif: string;
  full_name: string;
  date_of_birth?: Date;
  kyc_status: KYCSTATUS;
  created_at: Date;
  updated_at: Date;
}

export type UserResponse = {
  id: string;
  username: string;
  email: string;
  phone: string;
  biNumber: string;
  nif: string;
  fullName: string;
  dateOfBirth?: Date;
  kycStatus: KYCSTATUS;
  createdAt: Date;
  updatedAt: Date;
};

export interface UserResponseWithPassword extends UserResponse {
  passwordHash: string;
}

export interface LoginDTO {
  email: string;
  password: string;
}