import type {
  ClientAppApproval,
  ClientAppRegistration,
  ClientAppRotation,
  LoginRequest,
  LoginResponse,
  LogoutResponse,
  RegisterAppInput,
  WhoAmIResponse,
} from './types.js';

export class ChefuClient {
  public readonly baseURL: string;
  private token?: string;

  constructor({
    baseURL = 'https://api.chefu.co.za',
    token,
  }: {
    baseURL?: string;
    token?: string;
  } = {}) {
    this.baseURL = baseURL.replace(/\/$/, '');
    this.token = token;
  }

  setToken(token: string) {
    this.token = token;
  }

  clearToken() {
    this.token = undefined;
  }

  get authHeaders(): Record<string, string> {
    return this.token ? { Authorization: `Bearer ${this.token}` } : {};
  }

  private async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const headers = new Headers(init.headers ?? {});
    if (!headers.has('Content-Type') && init.body && typeof init.body === 'string') {
      headers.set('Content-Type', 'application/json');
    }

    if (this.token && !headers.has('Authorization')) {
      headers.set('Authorization', `Bearer ${this.token}`);
    }

    let response: Response;
    try {
      response = await fetch(`${this.baseURL}${path}`, {
        ...init,
        headers,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Network error while contacting ${this.baseURL}${path}. ${message}`);
    }

    const text = await response.text();
    let data: unknown = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = text || null;
    }

    if (!response.ok) {
      const firstMessage =
        (typeof data === 'object' && data && 'message' in data && typeof data.message === 'string'
          ? data.message
          : typeof data === 'object' && data && 'error' in data && typeof data.error === 'string'
            ? data.error
            : typeof data === 'string' && data.length
              ? data
              : null);

      const message = firstMessage || `Request failed with status ${response.status} at ${this.baseURL}${path}`;

      if (response.status === 401) {
        throw new Error(`${message}. You are not authenticated. Run: chefu login --email <email> --password <password>`);
      }

      if (response.status === 404) {
        throw new Error(`${message}. Check that the API URL is correct and that the endpoint exists: ${this.baseURL}`);
      }

      throw new Error(message);
    }

    return data as T;
  }

  async login(body: LoginRequest): Promise<LoginResponse> {
    const result = await this.request<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(body),
    });

    if (result.token || result.idToken) {
      this.token = result.token || result.idToken;
    }

    return result;
  }

  async logout(): Promise<LogoutResponse> {
    return this.request<LogoutResponse>('/auth/logout', {
      method: 'POST',
    });
  }

  async whoami(): Promise<WhoAmIResponse> {
    return this.request<WhoAmIResponse>('/auth/me');
  }

  apps = {
    list: async () => {
      return this.request<unknown>('/admin/apps?include=dynamic');
    },
    register: async (payload: RegisterAppInput) => {
      return this.request<ClientAppRegistration>('/admin/apps/register', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
    approve: async (clientId: string, approvedBy: string) => {
      return this.request<ClientAppApproval>(`/admin/apps/${encodeURIComponent(clientId)}/approve`, {
        method: 'POST',
        body: JSON.stringify({ approvedBy }),
      });
    },
    rotateSecret: async (clientId: string) => {
      return this.request<ClientAppRotation>(`/admin/apps/${encodeURIComponent(clientId)}/rotate-secret`, {
        method: 'POST',
        body: JSON.stringify({}),
      });
    },
    revoke: async (clientId: string, approvedBy: string) => {
      return this.request<unknown>(`/admin/apps/${encodeURIComponent(clientId)}/revoke`, {
        method: 'POST',
        body: JSON.stringify({ approvedBy }),
      });
    },
  };
}

export default ChefuClient;
