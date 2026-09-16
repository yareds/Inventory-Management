export const DEMO_DB_STORAGE_KEY = 'inventory_demo_db_v1';
export const DEMO_MODE_FLAG_KEY = 'inventory_demo_mode_active';

export function isDemoMode(): boolean {
  try {
    return localStorage.getItem(DEMO_MODE_FLAG_KEY) === 'true';
  } catch {
    return false;
  }
}

export function enterDemoModeFlag(): void {
  try {
    localStorage.setItem(DEMO_MODE_FLAG_KEY, 'true');
  } catch {}
}

export function exitDemoModeFlag(): void {
  try {
    localStorage.removeItem(DEMO_MODE_FLAG_KEY);
  } catch {}
}

export function resetDemoData(): void {
  try {
    localStorage.removeItem(DEMO_DB_STORAGE_KEY);
  } catch {}
}
