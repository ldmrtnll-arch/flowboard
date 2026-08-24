export type Client = {
  id: number;
  name: string;
  email: string;
  phone: string;
  notes: string;
  created_at: string;
  updated_at: string;
};

export type ClientField = "name" | "email" | "phone" | "notes";

export type ClientErrorResponse = {
  message: string;
  errors?: Partial<Record<ClientField, string[]>>;
};
