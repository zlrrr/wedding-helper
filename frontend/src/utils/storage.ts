// Wedding Helper - Local Storage Utility
// Simple utility for managing authentication tokens

const TOKEN_KEY = 'wedding_helper_auth_token';

/**
 * Storage utility for managing local data
 */
export const storage = {
  /**
   * Get authentication token
   */
  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  },

  /**
   * Set authentication token
   */
  setToken(token: string): void {
    localStorage.setItem(TOKEN_KEY, token);
  },

  /**
   * Clear authentication token
   */
  clearToken(): void {
    localStorage.removeItem(TOKEN_KEY);
  },

  /**
   * Check if token exists
   */
  hasToken(): boolean {
    return !!this.getToken();
  },

  /**
   * Clear all stored data
   */
  clearAll(): void {
    localStorage.clear();
  },
};

export default storage;
