import { Upgrade, Skin, PlayerProfile } from './types'
import { storage } from './storage'

// Buy upgrade
export function buyUpgrade(
  upgrade: Upgrade,
  playerProfile: PlayerProfile,
  setPlayerProfile: (profile: PlayerProfile) => void,
  setUpgrades: (updater: (prev: Upgrade[]) => Upgrade[]) => void
): boolean {
  if (upgrade.level >= upgrade.maxLevel) return false
  
  const cost = upgrade.cost * (upgrade.level + 1)
  if (playerProfile.coins < cost) return false
  
  const newCoins = playerProfile.coins - cost
  storage.setNumber('coins', newCoins)
  setPlayerProfile({ ...playerProfile, coins: newCoins })
  
  setUpgrades(prev => prev.map(u => 
    u.id === upgrade.id ? { ...u, level: u.level + 1 } : u
  ))
  
  localStorage.setItem(`upgrade_${upgrade.id}`, String(upgrade.level + 1))
  return true
}

// Buy skin
export function buySkin(
  skin: Skin,
  playerProfile: PlayerProfile,
  setPlayerProfile: (profile: PlayerProfile) => void,
  setSkins: (updater: (prev: Skin[]) => Skin[]) => void
): boolean {
  if (skin.unlocked) return false
  if (playerProfile.coins < skin.cost) return false
  
  const newCoins = playerProfile.coins - skin.cost
  storage.setNumber('coins', newCoins)
  setPlayerProfile({ ...playerProfile, coins: newCoins })
  
  setSkins(prev => prev.map(s => 
    s.id === skin.id ? { ...s, unlocked: true } : s
  ))
  
  localStorage.setItem(`skin_${skin.id}`, 'true')
  return true
}

// Select skin
export function selectSkin(
  skinId: string,
  skins: Skin[],
  setPlayerProfile: (updater: (prev: PlayerProfile) => PlayerProfile) => void
): boolean {
  const skin = skins.find(s => s.id === skinId)
  if (!skin || !skin.unlocked) return false
  
  setPlayerProfile(prev => {
    localStorage.setItem('selectedSkin', skinId)
    return { ...prev, selectedSkin: skinId }
  })
  
  return true
}

// Change username
export function changeUsername(
  newName: string,
  setPlayerProfile: (updater: (prev: PlayerProfile) => PlayerProfile) => void
): boolean {
  if (newName.length < 3 || newName.length > 20) return false
  
  setPlayerProfile(prev => {
    localStorage.setItem('username', newName)
    return { ...prev, username: newName }
  })
  
  return true
}

// Calculate end game rewards
export function calculateEndGameRewards(
  score: number,
  coinsInGame: number,
  totalCoins: number,
  playerProfile: PlayerProfile
): {
  earnedCoins: number
  newTotalCoins: number
  newPlayerCoins: number
  earnedXP: number
  newXP: number
  newPlayerLevel: number
} {
  const earnedCoins = Math.floor(score / 10) + coinsInGame
  const newTotalCoins = totalCoins + earnedCoins
  const newPlayerCoins = playerProfile.coins + earnedCoins
  const earnedXP = score * 2
  const newXP = playerProfile.xp + earnedXP
  const newPlayerLevel = Math.floor(newXP / 100) + 1
  
  return {
    earnedCoins,
    newTotalCoins,
    newPlayerCoins,
    earnedXP,
    newXP,
    newPlayerLevel
  }
}
