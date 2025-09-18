export interface QueryRequest {
  page: number;
  limit: number;
  search?: string;
}

export interface getByIdParam {
  id: string;
} 

export interface IdParam {
  id: string
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface QueryResponse<T> {
  data:T[];
  pagination:Pagination;
}

export interface UpdateQuery<T>{
  id: string,
  data: Partial<T>
}

export interface FindAllResponse<T>{
  data: T[];
  total: number
}