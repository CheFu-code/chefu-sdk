export type ChefuAppClientType = 'public' | 'confidential';
export type ChefuAppStatus = 'pending' | 'approved' | 'revoked';

export type LoginRequest = {
  email: string;
  password: string;
};

export type LoginResponse = {
  token?: string;
  idToken?: string;
  refreshToken?: string;
  expiresIn?: string;
  user?: {
    uid?: string;
    email?: string;
  };
  [key: string]: unknown;
};

export type LogoutResponse = {
  ok: boolean;
  revoked?: boolean;
  [key: string]: unknown;
};

export type WhoAmIResponse = {
  user?: Record<string, unknown>;
  profile?: Record<string, unknown>;
  [key: string]: unknown;
};

export type RegisterAppInput = {
  appId: string;
  name: string;
  owner: string;
  redirectUris: string[];
  allowedScopes: string[];
  grantTypes?: string[];
  clientType?: ChefuAppClientType;
  status?: ChefuAppStatus;
};

export type ClientAppRegistration = {
  record?: {
    client_id?: string;
    app_id?: string;
    name?: string;
    owner?: string;
    status?: ChefuAppStatus;
  };
  clientSecret?: string;
  secret_version?: string;
  [key: string]: unknown;
};

export type ClientAppApproval = {
  client_id?: string;
  status?: ChefuAppStatus;
  approved_by?: string;
  clientSecret?: string;
  secret_version?: string;
  [key: string]: unknown;
};

export type ClientAppRotation = {
  client_id?: string;
  secret_version?: string;
  secret?: string;
  [key: string]: unknown;
};
