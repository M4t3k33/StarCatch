export type SafeStorage = {
  getNumber(key: string, fallback: number): number
  setNumber(key: string, value: number): void
}

export const storage: SafeStorage = {
  getNumber(key: string, fallback: number): number {
    try {
      const raw = localStorage.getItem(key)
      if (raw == null) return fallback
      const num = Number(raw)
      return Number.isFinite(num) ? num : fallback
    } catch {
      return fallback
    }
  },
  setNumber(key: string, value: number): void {
    try {
      localStorage.setItem(key, String(value))
    } catch {
      // ignore
    }
  }
}


