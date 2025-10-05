// Game State Types
export type GameState = {
  score: number
  lives: number
  level: number
  isPlaying: boolean
  difficulty: 'normal' | 'hard'
  highScore: number
  combo: number
  maxCombo: number
  coins: number
  totalCoins: number
}

export type PlayerProfile = {
  username: string
  level: number
  xp: number
  coins: number
  selectedSkin: string
}

export type Upgrade = {
  id: string
  name: string
  description: string
  cost: number
  level: number
  maxLevel: number
  effect: string
}

export type Skin = {
  id: string
  name: string
  cost: number
  unlocked: boolean
  color: string
}

// Game Objects
export type Star = { 
  x: number
  y: number
  speed: number
  rotation: number
  type: 'gold' | 'silver' | 'diamond' 
}

export type Obstacle = { 
  x: number
  y: number
  width: number
  height: number
  speed: number
  rotation: number
  type: number 
}

export type Particle = { 
  x: number
  y: number
  vx: number
  vy: number
  life: number
  color: string
  size: number 
}

export type PowerUpDrop = { 
  x: number
  y: number
  speed: number
  type: 'shield' | 'double' | 'slow' | 'magnet' 
}

export type Meteor = { 
  x: number
  y: number
  speed: number
  size: number
  rotation: number 
}

export type CoinDrop = { 
  x: number
  y: number
  speed: number
  value: number 
}

export type Boss = { 
  x: number
  y: number
  health: number
  maxHealth: number
  phase: number
  active: boolean 
}

// Events & Achievements
export type Achievement = { 
  id: string
  name: string
  unlocked: boolean 
}

export type SpecialEvent = { 
  type: 'starRain' | 'slowMotion' | 'invincible' | 'coinRain' | 'frenzy' | 'luckyTime' | 'shieldRain'
  duration: number
  active: boolean 
}
