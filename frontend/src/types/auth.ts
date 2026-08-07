export type UserRole = 'OWNER' | 'ADMIN' | 'RECEPTION' | 'TEACHER';

export type AuthUser = {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  active: boolean;
};

export type LoginCredentials = {
  email: string;
  password: string;
};

export type LoginResponse = {
  access_token: string;
  user: AuthUser;
};
