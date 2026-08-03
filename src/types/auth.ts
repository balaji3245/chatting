export interface SessionUser {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
}

export interface AuthSession {
  user: SessionUser;
  expiresAt: Date;
}
