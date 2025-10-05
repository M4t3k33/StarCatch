import { Upgrade, Skin, Achievement } from './types'

// Player constants
export const PLAYER_WIDTH = 50
export const PLAYER_HEIGHT = 20
export const PLAYER_Y = 370

// Canvas constants
export const CANVAS_WIDTH = 400
export const CANVAS_HEIGHT = 400

// Initial upgrades
export const INITIAL_UPGRADES: Upgrade[] = [
  { id: 'extraLife', name: 'Dodatkowe życie', description: '+1 życie na start', cost: 100, level: 0, maxLevel: 3, effect: 'lives' },
  { id: 'magnetBoost', name: 'Silniejszy magnes', description: '+50% zasięg magnesu', cost: 150, level: 0, maxLevel: 5, effect: 'magnet' },
  { id: 'coinMultiplier', name: 'Mnożnik monet', description: '+20% monet', cost: 200, level: 0, maxLevel: 10, effect: 'coins' },
  { id: 'shieldDuration', name: 'Dłuższa tarcza', description: '+2s czasu tarczy', cost: 120, level: 0, maxLevel: 5, effect: 'shield' },
  { id: 'starValue', name: 'Wartość gwiazdek', description: '+10% punktów', cost: 180, level: 0, maxLevel: 10, effect: 'points' },
]

// Initial skins
export const INITIAL_SKINS: Skin[] = [
  { id: 'default', name: 'Klasyczny', cost: 0, unlocked: true, color: '#4444FF' },
  { id: 'red', name: 'Czerwony Feniks', cost: 50, unlocked: false, color: '#FF4444' },
  { id: 'green', name: 'Zielony Smok', cost: 100, unlocked: false, color: '#44FF44' },
  { id: 'purple', name: 'Fioletowa Mgła', cost: 150, unlocked: false, color: '#AA44FF' },
  { id: 'gold', name: 'Złoty Tytan', cost: 300, unlocked: false, color: '#FFD700' },
  { id: 'rainbow', name: 'Tęczowy Fenomen', cost: 500, unlocked: false, color: 'rainbow' },
]

// Initial achievements
export const INITIAL_ACHIEVEMENTS: Achievement[] = [
  { id: 'first_star', name: 'Pierwsza gwiazdka', unlocked: false },
  { id: 'combo_10', name: 'Combo Master (10x)', unlocked: false },
  { id: 'combo_25', name: 'Combo Legend (25x)', unlocked: false },
  { id: 'level_5', name: 'Poziom 5', unlocked: false },
  { id: 'level_10', name: 'Poziom 10', unlocked: false },
  { id: 'score_100', name: '100 punktów', unlocked: false },
  { id: 'diamond_catch', name: 'Diamentowy łowca', unlocked: false },
  { id: 'meteor_dodge', name: 'Unik meteora', unlocked: false },
]

// Game balance
export const BOSS_SPAWN_INTERVAL = 50
export const EVENT_SPAWN_INTERVAL = 25
export const MAGNET_RANGE = 150
export const COMBO_TIMER_DURATION = 3
export const SUPER_COMBO_THRESHOLD = 15
