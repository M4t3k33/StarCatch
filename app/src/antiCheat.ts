export function isDevToolsLikelyOpen(): boolean {
  // Heurystyka: różnica okna vs viewportu, duże opóźnienia debuggera
  const threshold = 160
  const widthGap = Math.abs(window.outerWidth - window.innerWidth)
  const heightGap = Math.abs(window.outerHeight - window.innerHeight)
  return widthGap > threshold || heightGap > threshold
}

export function isDeltaSuspicious(deltaSeconds: number): boolean {
  // Zbyt duży skok klatki może sugerować manipulację
  return !Number.isFinite(deltaSeconds) || deltaSeconds <= 0 || deltaSeconds > 0.25
}

export function isScoreProgressValid(prevScore: number, nextScore: number): boolean {
  // Dozwolony wzrost max +20 na pojedynczą klatkę (bufor na combo i power-upy)
  if (!Number.isFinite(prevScore) || !Number.isFinite(nextScore)) return false
  if (nextScore < prevScore) return false
  return nextScore - prevScore <= 20
}


