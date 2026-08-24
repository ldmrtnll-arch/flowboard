export type AuthUser = {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
};

export type AuthField = "email" | "password" | "first_name" | "last_name";

export type AuthErrorResponse = {
  message: string;
  errors?: Partial<Record<AuthField, string[]>>;
};
