import { Star, Obstacle, Particle, Achievement } from './types'

// Reset star with difficulty
export function createStar(level: number, difficulty: 'normal' | 'hard'): Star {
  const base = 2 + level * 0.5
  const speed = difficulty === 'hard' ? base * 1.5 : base
  // 70% gold, 25% silver, 5% diamond
  const rand = Math.random()
  const type: 'gold' | 'silver' | 'diamond' = rand < 0.7 ? 'gold' : rand < 0.95 ? 'silver' : 'diamond'
  return { x: Math.random() * 380, y: 0, speed, rotation: Math.random() * Math.PI * 2, type }
}

// Reset obstacle
export function createObstacle(level: number): Obstacle {
  return {
    x: Math.random() * 370,
    y: -50,
    width: 30,
    height: 30,
    speed: 3 + level * 0.3,
    rotation: Math.random() * Math.PI * 2,
    type: Math.floor(Math.random() * 3),
  }
}

// Create particles for star collection
export function createStarParticles(x: number, y: number, starType: 'gold' | 'silver' | 'diamond'): Particle[] {
  let particleColor = ['#FFD700', '#FFA500', '#FFFF00']
  if (starType === 'silver') {
    particleColor = ['#C0C0C0', '#E8E8E8', '#A8A8A8']
  } else if (starType === 'diamond') {
    particleColor = ['#00FFFF', '#00CCFF', '#00AAFF']
  }
  
  const particles: Particle[] = []
  for (let i = 0; i < 15; i++) {
    particles.push({
      x: x + 10,
      y: y + 10,
      vx: (Math.random() - 0.5) * 200,
      vy: (Math.random() - 0.5) * 200 - 50,
      life: 1,
      color: particleColor[Math.floor(Math.random() * 3)],
      size: Math.random() * 4 + 2
    })
  }
  return particles
}

// Create damage particles
export function createDamageParticles(x: number, y: number): Particle[] {
  const particles: Particle[] = []
  for (let i = 0; i < 10; i++) {
    particles.push({
      x,
      y,
      vx: (Math.random() - 0.5) * 150,
      vy: (Math.random() - 0.5) * 150,
      life: 0.8,
      color: '#FF0000',
      size: Math.random() * 4 + 2
    })
  }
  return particles
}

// Create explosion particles
export function createExplosionParticles(x: number, y: number): Particle[] {
  const particles: Particle[] = []
  for (let i = 0; i < 30; i++) {
    particles.push({
      x,
      y,
      vx: (Math.random() - 0.5) * 300,
      vy: (Math.random() - 0.5) * 300,
      life: 1.5,
      color: ['#FF0000', '#FF8800', '#FFFF00'][Math.floor(Math.random() * 3)],
      size: Math.random() * 6 + 2
    })
  }
  return particles
}

// Create coin particles
export function createCoinParticles(x: number, y: number): Particle[] {
  const particles: Particle[] = []
  for (let i = 0; i < 8; i++) {
    particles.push({
      x,
      y,
      vx: (Math.random() - 0.5) * 120,
      vy: (Math.random() - 0.5) * 120,
      life: 0.7,
      color: '#FFD700',
      size: Math.random() * 3 + 1
    })
  }
  return particles
}

// Create power-up particles
export function createPowerUpParticles(x: number, y: number, color: string): Particle[] {
  const particles: Particle[] = []
  for (let i = 0; i < 10; i++) {
    particles.push({
      x,
      y,
      vx: (Math.random() - 0.5) * 150,
      vy: (Math.random() - 0.5) * 150,
      life: 0.8,
      color,
      size: Math.random() * 3 + 2
    })
  }
  return particles
}

// Create near-miss particles
export function createNearMissParticles(x: number, y: number): Particle[] {
  const particles: Particle[] = []
  for (let i = 0; i < 8; i++) {
    particles.push({
      x,
      y,
      vx: (Math.random() - 0.5) * 100,
      vy: (Math.random() - 0.5) * 100,
      life: 0.6,
      color: '#00FF00',
      size: Math.random() * 3 + 1
    })
  }
  return particles
}

// Get star value based on type
export function getStarValue(starType: 'gold' | 'silver' | 'diamond'): number {
  if (starType === 'silver') return 2
  if (starType === 'diamond') return 5
  return 1
}

// Check achievement unlock
export function checkAchievements(
  achievements: Achievement[],
  score: number,
  combo: number,
  level: number,
  starType: 'gold' | 'silver' | 'diamond'
): Achievement[] {
  return achievements.map(a => {
    if (a.unlocked) return a
    
    if (a.id === 'first_star' && score === 0) return { ...a, unlocked: true }
    if (a.id === 'combo_10' && combo >= 10) return { ...a, unlocked: true }
    if (a.id === 'combo_25' && combo >= 25) return { ...a, unlocked: true }
    if (a.id === 'level_5' && level >= 5) return { ...a, unlocked: true }
    if (a.id === 'level_10' && level >= 10) return { ...a, unlocked: true }
    if (a.id === 'score_100' && score >= 100) return { ...a, unlocked: true }
    if (a.id === 'diamond_catch' && starType === 'diamond') return { ...a, unlocked: true }
    
    return a
  })
}

// Calculate score gain
export function calculateScoreGain(
  starValue: number,
  combo: number,
  doubleScore: boolean,
  superCombo: boolean,
  eventMultiplier: number,
  pointsUpgrade: number
): number {
  const comboBonus = Math.floor(combo / 5)
  const superComboMultiplier = superCombo ? 2 : 1
  const gain = Math.floor(
    ((doubleScore ? 2 : 1) * starValue + comboBonus) * 
    superComboMultiplier * 
    eventMultiplier * 
    pointsUpgrade
  )
  return gain
}

// Calculate coins earned
export function calculateCoinsEarned(
  gain: number,
  coinMultiplier: number
): number {
  return Math.floor(gain * 0.1 * coinMultiplier)
}
