const accessTokenKey = 'wg-grappling:access-token';

const canUseStorage = () => typeof window !== 'undefined' && Boolean(window.localStorage);

export const tokenStorage = {
  get(): string | null {
    return canUseStorage() ? window.localStorage.getItem(accessTokenKey) : null;
  },

  set(token: string): void {
    if (canUseStorage()) {
      window.localStorage.setItem(accessTokenKey, token);
    }
  },

  remove(): void {
    if (canUseStorage()) {
      window.localStorage.removeItem(accessTokenKey);
    }
  },
};
