export interface Store {
  id: number;
  store_name: string;
  created_at: string;
}

export interface StoresResponse {
  username: string;
  stores: Store[];
}