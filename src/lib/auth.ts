export type UserRole = "ADMIN" | "USER";

export interface AuthUser {
  id: string;
  sub: string;
  email: string;
  role: UserRole;
  firstName: string;
  lastName: string;
  exp: number;
}

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("access_token");
}

export function getCurrentUser(): AuthUser | null {
  const token = getToken();
  if (!token) return null;

  try {
    const payload = token.split(".")[1];
    const decoded = JSON.parse(atob(payload));

    if (decoded.exp && decoded.exp * 1000 < Date.now()) {
      logout();
      return null;
    }

    return {
      ...decoded,
      id: decoded.sub,
    } as AuthUser;
  } catch {
    return null;
  }
}

export function isAdmin(user: AuthUser | null): boolean {
  return user?.role === "ADMIN";
}

export function logout() {
  localStorage.removeItem("access_token");
  window.location.href = "/auth/login";
}
