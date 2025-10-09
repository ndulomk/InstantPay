import { KYCSTATUS, UserDbRow, UserResponse, UserResponseWithPassword } from "../types/user.types";

export class User implements UserResponseWithPassword {
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
  constructor(row: UserDbRow){
    this.id = row.id;
    this.username = row.username;
    this.email = row.email;
    this.phone = row.phone;
    this.passwordHash = row.password_hash;
    this.biNumber = row.bi_number;
    this.nif = row.nif;
    this.fullName = row.full_name;
    this.dateOfBirth = row.date_of_birth;
    this.kycStatus = row.kyc_status;
    this.createdAt = row.created_at;
    this.updatedAt = row.updated_at
  }

  toJSON(): UserResponse{
    const { passwordHash, ...userData } = this
    return userData
  }
}

export default User;
