import React, { useEffect, useRef, useState } from 'react'
import { isDeltaSuspicious, isDevToolsLikelyOpen, isScoreProgressValid } from './antiCheat'
import { storage } from './storage'
import type { GameState, PlayerProfile, Upgrade, Skin, Star, Obstacle, Particle, PowerUpDrop, Meteor, Achievement, SpecialEvent, CoinDrop, Boss } from './types'
import { PLAYER_WIDTH, PLAYER_HEIGHT, PLAYER_Y, CANVAS_WIDTH, CANVAS_HEIGHT, INITIAL_UPGRADES, INITIAL_SKINS, INITIAL_ACHIEVEMENTS, BOSS_SPAWN_INTERVAL, EVENT_SPAWN_INTERVAL, MAGNET_RANGE, COMBO_TIMER_DURATION, SUPER_COMBO_THRESHOLD } from './constants'
import { drawParticles, drawGameStar, drawPowerUpDrops, drawMagnetField, drawCoinDrops, drawBoss, drawMeteors, drawObstacles, drawPlayer } from './rendering'
import { createStar, createObstacle, createStarParticles, createDamageParticles, createExplosionParticles, createCoinParticles, createPowerUpParticles, createNearMissParticles, getStarValue, checkAchievements, calculateScoreGain, calculateCoinsEarned } from './gameLogic'
import { buyUpgrade as buyUpgradeLogic, buySkin as buySkinLogic, selectSkin as selectSkinLogic, changeUsername as changeUsernameLogic, calculateEndGameRewards } from './shopLogic'
import { discordRPC, updateDiscordPlaying, updateDiscordMenu, updateDiscordShop, updateDiscordBossFight } from './discordRPC'

export function App(): JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [gameState, setGameState] = useState<GameState>(() => ({
    score: 0,
    lives: 3,
    level: 1,
    isPlaying: false,
    difficulty: 'normal',
    highScore: storage.getNumber('highScore', 0),
    combo: 0,
    maxCombo: storage.getNumber('maxCombo', 0),
    coins: 0,
    totalCoins: storage.getNumber('totalCoins', 0),
  }))
  
  const [playerProfile, setPlayerProfile] = useState<PlayerProfile>(() => ({
    username: localStorage.getItem('username') || 'Pilot',
    level: storage.getNumber('playerLevel', 1),
    xp: storage.getNumber('playerXP', 0),
    coins: storage.getNumber('coins', 0),
    selectedSkin: localStorage.getItem('selectedSkin') || 'default',
  }))
  
  const [upgrades, setUpgrades] = useState<Upgrade[]>([
    { id: 'extraLife', name: 'Dodatkowe życie', description: '+1 życie na start', cost: 100, level: 0, maxLevel: 3, effect: 'lives' },
    { id: 'magnetBoost', name: 'Silniejszy magnes', description: '+50% zasięg magnesu', cost: 150, level: 0, maxLevel: 5, effect: 'magnet' },
    { id: 'coinMultiplier', name: 'Mnożnik monet', description: '+20% monet', cost: 200, level: 0, maxLevel: 10, effect: 'coins' },
    { id: 'shieldDuration', name: 'Dłuższa tarcza', description: '+2s czasu tarczy', cost: 120, level: 0, maxLevel: 5, effect: 'shield' },
    { id: 'starValue', name: 'Wartość gwiazdek', description: '+10% punktów', cost: 180, level: 0, maxLevel: 10, effect: 'points' },
  ])
  
  const [skins, setSkins] = useState<Skin[]>([
    { id: 'default', name: 'Klasyczny', cost: 0, unlocked: true, color: '#4444FF' },
    { id: 'red', name: 'Czerwony Feniks', cost: 50, unlocked: false, color: '#FF4444' },
    { id: 'green', name: 'Zielony Smok', cost: 100, unlocked: false, color: '#44FF44' },
    { id: 'purple', name: 'Fioletowa Mgła', cost: 150, unlocked: false, color: '#AA44FF' },
    { id: 'gold', name: 'Złoty Tytan', cost: 300, unlocked: false, color: '#FFD700' },
    { id: 'rainbow', name: 'Tęczowy Fenomen', cost: 500, unlocked: false, color: 'rainbow' },
  ])
  
  const [showShop, setShowShop] = useState(false)
  const [showProfile, setShowProfile] = useState(false)
  const [storyMode, setStoryMode] = useState(false)
  const [currentStoryPhase, setCurrentStoryPhase] = useState(0)
  const [showIntro, setShowIntro] = useState(true)
  const [playerX, setPlayerX] = useState(200)
  const playerY = 370
  const playerWidth = 50
  const playerHeight = 20

  const collectAudioRef = useRef<HTMLAudioElement | null>(null)
  const failAudioRef = useRef<HTMLAudioElement | null>(null)

  const [star, setStar] = useState<Star>(() => ({ x: Math.random() * 380, y: 0, speed: 2, rotation: 0, type: 'gold' }))
  const [obstacles, setObstacles] = useState<Obstacle[]>(() => [
    { x: Math.random() * 370, y: -50, width: 30, height: 30, speed: 3, rotation: 0, type: 0 },
    { x: Math.random() * 370, y: -150, width: 30, height: 30, speed: 3, rotation: 0, type: 1 },
  ])
  const [particles, setParticles] = useState<Particle[]>([])
  const [screenShake, setScreenShake] = useState(0)
  const [comboTimer, setComboTimer] = useState(0)
  const [powerUpDrops, setPowerUpDrops] = useState<PowerUpDrop[]>([])
  const [meteors, setMeteors] = useState<Meteor[]>([])
  const [superCombo, setSuperCombo] = useState(false)
  const [magnet, setMagnet] = useState(0)
  const [achievements, setAchievements] = useState<Achievement[]>([
    { id: 'first_star', name: 'Pierwsza gwiazdka', unlocked: false },
    { id: 'combo_10', name: 'Combo Master (10x)', unlocked: false },
    { id: 'combo_25', name: 'Combo Legend (25x)', unlocked: false },
    { id: 'level_5', name: 'Poziom 5', unlocked: false },
    { id: 'level_10', name: 'Poziom 10', unlocked: false },
    { id: 'score_100', name: '100 punktów', unlocked: false },
    { id: 'diamond_catch', name: 'Diamentowy łowca', unlocked: false },
    { id: 'meteor_dodge', name: 'Unik meteora', unlocked: false },
  ])
  const [specialEvent, setSpecialEvent] = useState<SpecialEvent>({ type: 'starRain', duration: 0, active: false })
  const [coinDrops, setCoinDrops] = useState<CoinDrop[]>([])
  const [boss, setBoss] = useState<Boss>({ x: 200, y: -100, health: 100, maxHealth: 100, phase: 1, active: false })
  const [bossDefeated, setBossDefeated] = useState(false)

  const [shield, setShield] = useState(0)
  const [doubleScore, setDoubleScore] = useState(0)
  const [slowTime, setSlowTime] = useState(0)
  const [isPaused, setIsPaused] = useState(false)

  useEffect(() => {
    const timeout = setTimeout(() => setShowIntro(false), 7000)
    
    // Initialize Discord RPC
    discordRPC.initialize().then(success => {
      if (success) {
        console.log('Discord RPC initialized')
        updateDiscordMenu()
      }
    })
    
    return () => {
      clearTimeout(timeout)
      discordRPC.disconnect()
    }
  }, [])

  // Removed useMemo - using imported functions from gameLogic.ts

  function startGame(): void {
    const extraLives = upgrades.find(u => u.id === 'extraLife')?.level || 0
    setGameState((s: GameState) => ({ ...s, score: 0, lives: 3 + extraLives, level: 1, isPlaying: true, combo: 0, coins: 0 }))
    setStar(createStar(1, gameState.difficulty))
    setObstacles([createObstacle(1), createObstacle(1)])
    updateDiscordPlaying(0, 1, 3 + extraLives)
    setShield(0)
    setDoubleScore(0)
    setSlowTime(0)
    setIsPaused(false)
    setParticles([])
    setScreenShake(0)
    setComboTimer(0)
    setPowerUpDrops([])
    setMeteors([])
    setSuperCombo(false)
    setMagnet(0)
    setSpecialEvent({ type: 'starRain', duration: 0, active: false })
    setCoinDrops([])
    setBoss({ x: 200, y: -100, health: 100, maxHealth: 100, phase: 1, active: false })
    setBossDefeated(false)
  }

  function endGame(): void {
    updateDiscordMenu()
    setGameState((s: GameState) => {
      const rewards = calculateEndGameRewards(s.score, s.coins, s.totalCoins, playerProfile)
      
      storage.setNumber('totalCoins', rewards.newTotalCoins)
      storage.setNumber('coins', rewards.newPlayerCoins)
      storage.setNumber('playerXP', rewards.newXP)
      storage.setNumber('playerLevel', rewards.newPlayerLevel)
      
      setPlayerProfile(prev => ({
        ...prev,
        coins: rewards.newPlayerCoins,
        xp: rewards.newXP,
        level: rewards.newPlayerLevel
      }))
      
      return { ...s, isPlaying: false, totalCoins: rewards.newTotalCoins }
    })
  }

  function toggleDifficulty(): void {
    setGameState((s: GameState) => ({
      ...s,
      difficulty: s.difficulty === 'normal' ? 'hard' : 'normal',
    }))
  }
  
  function buyUpgrade(upgradeId: string): void {
    const upgrade = upgrades.find(u => u.id === upgradeId)
    if (!upgrade) return
    buyUpgradeLogic(upgrade, playerProfile, setPlayerProfile, setUpgrades)
    updateDiscordShop()
  }
  
  function buySkin(skinId: string): void {
    const skin = skins.find(s => s.id === skinId)
    if (!skin) return
    buySkinLogic(skin, playerProfile, setPlayerProfile, setSkins)
  }
  
  function selectSkin(skinId: string): void {
    selectSkinLogic(skinId, skins, setPlayerProfile)
  }
  
  function changeUsername(newName: string): void {
    changeUsernameLogic(newName, setPlayerProfile)
  }

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let raf = 0
    let last = performance.now()

    const loop = () => {
      const now = performance.now()
      let dt = (now - last) / 1000
      last = now
      if (!Number.isFinite(dt) || dt <= 0) dt = 1/60
      if (dt > 0.25) dt = 0.25

      ctx.clearRect(0, 0, canvas.width, canvas.height)

      // time scale
      const timeScale = slowTime > 0 ? 0.6 : 1

      if (gameState.isPlaying && !isPaused) {
        // update star
        const nextStarY = star.y + (120 + gameState.level * 30) * (gameState.difficulty === 'hard' ? 1.5 : 1) * timeScale * dt
        if (nextStarY > canvas.height) {
          setStar(createStar(gameState.level, gameState.difficulty))
          setGameState((s: GameState) => {
            const nextLives = s.lives - 1
            if (nextLives <= 0) setTimeout(endGame)
            return { ...s, lives: nextLives, combo: 0 }
          })
          setComboTimer(0)
          failAudioRef.current?.play()
        } else {
          setStar(prev => ({ ...prev, y: nextStarY, rotation: prev.rotation + dt * 2 }))
        }

        // update obstacles
        setObstacles(prev => prev.map(o => {
          const newY = o.y + (3 + gameState.level * 0.3) * 60 * timeScale * dt
          const newRot = o.rotation + dt * 3
          return newY > canvas.height ? createObstacle(gameState.level) : { ...o, y: newY, rotation: newRot }
        }))

        // update particles
        setParticles(prev => prev.map(p => ({
          ...p,
          x: p.x + p.vx * dt * 60,
          y: p.y + p.vy * dt * 60,
          vy: p.vy + 200 * dt,
          life: p.life - dt
        })).filter(p => p.life > 0))

        // power-ups decay
        if (shield > 0) setShield(v => Math.max(0, v - dt))
        if (doubleScore > 0) setDoubleScore(v => Math.max(0, v - dt))
        if (slowTime > 0) setSlowTime(v => Math.max(0, v - dt))
        if (magnet > 0) setMagnet(v => Math.max(0, v - dt))
        
        // special event decay
        if (specialEvent.active && specialEvent.duration > 0) {
          setSpecialEvent(prev => ({ ...prev, duration: Math.max(0, prev.duration - dt) }))
          if (specialEvent.duration - dt <= 0) {
            setSpecialEvent(prev => ({ ...prev, active: false }))
          }
        }
        
        // combo timer
        if (comboTimer > 0) {
          setComboTimer(v => Math.max(0, v - dt))
          if (comboTimer - dt <= 0) {
            setGameState(s => ({ ...s, combo: 0 }))
            setSuperCombo(false)
          }
        }
        
        // screen shake decay
        if (screenShake > 0) setScreenShake(v => Math.max(0, v - dt * 10))
        
        // spawn power-up drops (5% chance per second)
        if (Math.random() < 0.05 * dt) {
          const types: ('shield' | 'double' | 'slow' | 'magnet')[] = ['shield', 'double', 'slow', 'magnet']
          setPowerUpDrops(prev => [...prev, {
            x: Math.random() * 370,
            y: -30,
            speed: 80 + gameState.level * 10,
            type: types[Math.floor(Math.random() * types.length)]
          }])
        }
        
        // boss spawn every 50 points
        if (gameState.score > 0 && gameState.score % 50 === 0 && !boss.active && !bossDefeated) {
          setBoss({ x: 200, y: -100, health: 100 + gameState.level * 20, maxHealth: 100 + gameState.level * 20, phase: 1, active: true })
        }
        
        // special events every 25 points (if no boss)
        if (gameState.score > 0 && gameState.score % 25 === 0 && !specialEvent.active && !boss.active) {
          const events: ('starRain' | 'slowMotion' | 'invincible' | 'coinRain' | 'frenzy' | 'luckyTime' | 'shieldRain')[] = 
            ['starRain', 'slowMotion', 'invincible', 'coinRain', 'frenzy', 'luckyTime', 'shieldRain']
          const eventType = events[Math.floor(Math.random() * events.length)]
          setSpecialEvent({ type: eventType, duration: 10, active: true })
          
          if (eventType === 'slowMotion') setSlowTime(10)
          if (eventType === 'invincible') setShield(10)
          if (eventType === 'shieldRain') setShield(10)
        }
        
        // spawn meteors (3% chance per second, only after level 3)
        if (gameState.level >= 3 && Math.random() < 0.03 * dt) {
          setMeteors(prev => [...prev, {
            x: Math.random() * 370,
            y: -50,
            speed: 200 + gameState.level * 20,
            size: 40 + Math.random() * 20,
            rotation: Math.random() * Math.PI * 2
          }])
        }
        
        // update power-up drops
        setPowerUpDrops(prev => prev.map(p => ({
          ...p,
          y: p.y + p.speed * timeScale * dt
        })).filter(p => p.y < canvas.height))
        
        // update meteors
        setMeteors(prev => prev.map(m => ({
          ...m,
          y: m.y + m.speed * timeScale * dt,
          rotation: m.rotation + dt * 5
        })).filter(m => m.y < canvas.height + 100))
        
        // update coin drops
        setCoinDrops(prev => prev.map(c => ({
          ...c,
          y: c.y + c.speed * dt * 60
        })).filter(c => c.y < canvas.height))
        
        // spawn coins during coin rain event
        if (specialEvent.active && specialEvent.type === 'coinRain' && Math.random() < 0.3 * dt) {
          setCoinDrops(prev => [...prev, {
            x: Math.random() * 380,
            y: -20,
            speed: 100 + Math.random() * 50,
            value: Math.floor(Math.random() * 5) + 1
          }])
        }
        
        // update boss
        if (boss.active) {
          setBoss(prev => {
            let newY = prev.y
            let newX = prev.x
            
            // Boss movement
            if (prev.y < 50) {
              newY = prev.y + 30 * dt
            } else {
              // Move horizontally
              newX = prev.x + Math.sin(performance.now() / 500) * 100 * dt
              if (newX < 50) newX = 50
              if (newX > 350) newX = 350
            }
            
            // Boss shoots obstacles
            if (Math.random() < 0.02 * dt && prev.y > 30) {
              setObstacles(prevObs => [...prevObs, {
                x: prev.x,
                y: prev.y + 40,
                width: 25,
                height: 25,
                speed: 150,
                rotation: 0,
                type: 2
              }])
            }
            
            return { ...prev, x: newX, y: newY }
          })
        }
        
        // super combo check
        if (gameState.combo >= 15 && !superCombo) {
          setSuperCombo(true)
        }
        
        // magnet effect - attract stars
        if (magnet > 0 && star.y > 50) {
          const dx = (playerX + playerWidth/2) - (star.x + 10)
          const dy = (playerY + playerHeight/2) - (star.y + 10)
          const dist = Math.sqrt(dx*dx + dy*dy)
          if (dist < 150) {
            setStar(prev => ({
              ...prev,
              x: prev.x + (dx / dist) * 100 * dt,
              y: prev.y + (dy / dist) * 100 * dt
            }))
          }
        }
      }

      // apply screen shake
      ctx.save()
      if (screenShake > 0) {
        ctx.translate(
          (Math.random() - 0.5) * screenShake * 10,
          (Math.random() - 0.5) * screenShake * 10
        )
      }

      // draw particles
      drawParticles(ctx, particles)

      // draw star
      drawGameStar(ctx, star)
      
      // draw power-up drops
      drawPowerUpDrops(ctx, powerUpDrops)
      
      // draw magnet field
      drawMagnetField(ctx, playerX, PLAYER_Y, magnet)
      
      // draw coin drops
      drawCoinDrops(ctx, coinDrops)
      
      // draw boss
      drawBoss(ctx, boss)
      
      // draw meteors
      drawMeteors(ctx, meteors)

      // draw obstacles
      drawObstacles(ctx, obstacles)

      // draw player
      drawPlayer(ctx, playerX, PLAYER_Y, shield, skins, playerProfile.selectedSkin)
      
      ctx.restore() // restore shake

      // collisions
      const starCatch = star.y + 20 > playerY && star.x + 20 > playerX && star.x < playerX + playerWidth
      if (starCatch) {
        collectAudioRef.current?.play()
        
        // Check achievements
        if (gameState.score === 0) {
          setAchievements(prev => prev.map(a => 
            a.id === 'first_star' ? { ...a, unlocked: true } : a
          ))
        }
        if (star.type === 'diamond') {
          setAchievements(prev => prev.map(a => 
            a.id === 'diamond_catch' ? { ...a, unlocked: true } : a
          ))
        }
        
        // Star type values
        let starValue = 1
        let particleColor = ['#FFD700', '#FFA500', '#FFFF00']
        if (star.type === 'silver') {
          starValue = 2
          particleColor = ['#C0C0C0', '#E8E8E8', '#A8A8A8']
        } else if (star.type === 'diamond') {
          starValue = 5
          particleColor = ['#00FFFF', '#00CCFF', '#00AAFF']
        }
        
        // Create particles
        const newParticles: Particle[] = []
        for (let i = 0; i < 15; i++) {
          newParticles.push({
            x: star.x + 10,
            y: star.y + 10,
            vx: (Math.random() - 0.5) * 200,
            vy: (Math.random() - 0.5) * 200 - 50,
            life: 1,
            color: particleColor[Math.floor(Math.random() * 3)],
            size: Math.random() * 4 + 2
          })
        }
        setParticles(prev => [...prev, ...newParticles])
        
        setGameState((s: GameState) => {
          const nextCombo = s.combo + 1
          const comboBonus = Math.floor(nextCombo / 5)
          const superComboMultiplier = superCombo ? 2 : 1
          const eventMultiplier = specialEvent.active && specialEvent.type === 'starRain' ? 1.5 : 1
          const pointsUpgrade = (upgrades.find(u => u.id === 'starValue')?.level || 0) * 0.1 + 1
          const gain = Math.floor(((doubleScore > 0 ? 2 : 1) * starValue + comboBonus) * superComboMultiplier * eventMultiplier * pointsUpgrade)
          
          // Earn coins
          const coinMultiplier = (upgrades.find(u => u.id === 'coinMultiplier')?.level || 0) * 0.2 + 1
          const coinsEarned = Math.floor(gain * 0.1 * coinMultiplier)
          const nextScore = s.score + gain
          if (!isScoreProgressValid(s.score, nextScore)) return s
          const nextHigh = Math.max(nextScore, s.highScore)
          const nextMaxCombo = Math.max(nextCombo, s.maxCombo)
          // Level up co 10 punktów - sprawdź czy przekroczyliśmy próg
          const nextLevel = Math.floor(nextScore / 10) + 1
          if (nextHigh !== s.highScore) storage.setNumber('highScore', nextHigh)
          if (nextMaxCombo !== s.maxCombo) storage.setNumber('maxCombo', nextMaxCombo)
          
          // Achievement checks
          if (nextCombo >= 10) {
            setAchievements(prev => prev.map(a => 
              a.id === 'combo_10' ? { ...a, unlocked: true } : a
            ))
          }
          if (nextCombo >= 25) {
            setAchievements(prev => prev.map(a => 
              a.id === 'combo_25' ? { ...a, unlocked: true } : a
            ))
          }
          if (nextLevel >= 5) {
            setAchievements(prev => prev.map(a => 
              a.id === 'level_5' ? { ...a, unlocked: true } : a
            ))
          }
          if (nextLevel >= 10) {
            setAchievements(prev => prev.map(a => 
              a.id === 'level_10' ? { ...a, unlocked: true } : a
            ))
          }
          if (nextScore >= 100) {
            setAchievements(prev => prev.map(a => 
              a.id === 'score_100' ? { ...a, unlocked: true } : a
            ))
          }
          
          return { ...s, score: nextScore, highScore: nextHigh, level: nextLevel, combo: nextCombo, maxCombo: nextMaxCombo, coins: s.coins + coinsEarned }
        })
        setComboTimer(3)
        
        // Frenzy mode - faster star spawn
        if (specialEvent.active && specialEvent.type === 'frenzy') {
          setStar(createStar(gameState.level, gameState.difficulty))
        } else {
          setStar(createStar(gameState.level, gameState.difficulty))
        }
      }
      
      // coin drop collisions
      coinDrops.forEach((coin, idx) => {
        const coinCatch = coin.y + 30 > playerY && coin.x + 30 > playerX && coin.x < playerX + playerWidth
        if (coinCatch) {
          collectAudioRef.current?.play()
          
          const bonusMultiplier = specialEvent.active && specialEvent.type === 'luckyTime' ? 2 : 1
          setGameState(s => ({ ...s, coins: s.coins + coin.value * bonusMultiplier }))
          
          setCoinDrops(prev => prev.filter((_, i) => i !== idx))
          
          // Gold particles
          const newParticles: Particle[] = []
          for (let i = 0; i < 8; i++) {
            newParticles.push({
              x: coin.x + 15,
              y: coin.y + 15,
              vx: (Math.random() - 0.5) * 120,
              vy: (Math.random() - 0.5) * 120,
              life: 0.7,
              color: '#FFD700',
              size: Math.random() * 3 + 1
            })
          }
          setParticles(prev => [...prev, ...newParticles])
        }
      })
      
      // boss collision with player shots (stars)
      if (boss.active) {
        const bossHit = star.y < boss.y + 40 && star.y + 20 > boss.y - 40 && 
                       star.x + 20 > boss.x - 40 && star.x < boss.x + 40
        
        if (bossHit) {
          setBoss(prev => {
            const newHealth = prev.health - 10
            if (newHealth <= 0) {
              // Boss defeated!
              collectAudioRef.current?.play()
              setGameState(s => ({ ...s, score: s.score + 50, coins: s.coins + 20 }))
              setBossDefeated(true)
              
              // Explosion particles
              const explosionParticles: Particle[] = []
              for (let i = 0; i < 30; i++) {
                explosionParticles.push({
                  x: prev.x,
                  y: prev.y,
                  vx: (Math.random() - 0.5) * 300,
                  vy: (Math.random() - 0.5) * 300,
                  life: 1.5,
                  color: ['#FF0000', '#FF8800', '#FFFF00'][Math.floor(Math.random() * 3)],
                  size: Math.random() * 6 + 2
                })
              }
              setParticles(prev => [...prev, ...explosionParticles])
              
              return { ...prev, active: false, health: 0 }
            }
            return { ...prev, health: newHealth }
          })
          setStar(createStar(gameState.level, gameState.difficulty))
        }
      }
      
      // power-up drop collisions
      powerUpDrops.forEach((p, idx) => {
        const dropCatch = p.y + 30 > playerY && p.x + 30 > playerX && p.x < playerX + playerWidth
        if (dropCatch) {
          collectAudioRef.current?.play()
          if (p.type === 'shield') setShield(5)
          else if (p.type === 'double') setDoubleScore(5)
          else if (p.type === 'slow') setSlowTime(5)
          else setMagnet(8)
          
          setPowerUpDrops(prev => prev.filter((_, i) => i !== idx))
          
          // particles
          const colors = p.type === 'shield' ? ['#00FFFF'] : p.type === 'double' ? ['#FFD700'] : p.type === 'slow' ? ['#AA44FF'] : ['#FF00FF']
          const newParticles: Particle[] = []
          for (let i = 0; i < 10; i++) {
            newParticles.push({
              x: p.x + 15,
              y: p.y + 15,
              vx: (Math.random() - 0.5) * 150,
              vy: (Math.random() - 0.5) * 150,
              life: 0.8,
              color: colors[0],
              size: Math.random() * 3 + 2
            })
          }
          setParticles(prev => [...prev, ...newParticles])
        }
      })
      
      // meteor near-miss bonus
      meteors.forEach((m, idx) => {
        const distance = Math.sqrt(
          Math.pow(m.x + m.size/2 - (playerX + playerWidth/2), 2) +
          Math.pow(m.y + m.size/2 - (playerY + playerHeight/2), 2)
        )
        
        // Near miss bonus (within 60px but not hit)
        if (distance < 60 && m.y > playerY - 50 && m.y < playerY + 50) {
          const alreadyScored = (m as any).scored
          if (!alreadyScored) {
            (m as any).scored = true
            setGameState(s => ({ ...s, score: s.score + 3 }))
            setAchievements(prev => prev.map(a => 
              a.id === 'meteor_dodge' ? { ...a, unlocked: true } : a
            ))
            
            // Green particles for near miss
            const newParticles: Particle[] = []
            for (let i = 0; i < 8; i++) {
              newParticles.push({
                x: m.x + m.size/2,
                y: m.y + m.size/2,
                vx: (Math.random() - 0.5) * 100,
                vy: (Math.random() - 0.5) * 100,
                life: 0.6,
                color: '#00FF00',
                size: Math.random() * 3 + 1
              })
            }
            setParticles(prev => [...prev, ...newParticles])
          }
        }
      })

      obstacles.forEach(o => {
        const hit = playerX < o.x + o.width && playerX + playerWidth > o.x && playerY < o.y + o.height && playerY + playerHeight > o.y
        if (hit) {
          const isInvincible = specialEvent.active && specialEvent.type === 'invincible'
          if (shield <= 0 && !isInvincible) {
            failAudioRef.current?.play()
            setScreenShake(1)
            
            // Red particles for damage
            const damageParticles: Particle[] = []
            for (let i = 0; i < 10; i++) {
              damageParticles.push({
                x: playerX + playerWidth/2,
                y: playerY + playerHeight/2,
                vx: (Math.random() - 0.5) * 150,
                vy: (Math.random() - 0.5) * 150,
                life: 0.8,
                color: '#FF0000',
                size: Math.random() * 3 + 1
              })
            }
            setParticles(prev => [...prev, ...damageParticles])
            
            setGameState((s: GameState) => {
              const nextLives = s.lives - 1
              if (nextLives <= 0) setTimeout(endGame)
              return { ...s, lives: nextLives, combo: 0 }
            })
            setComboTimer(0)
          }
          setObstacles(prev => prev.map(p => (p === o ? createObstacle(gameState.level) : p)))
        }
      })

      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [gameState, isPaused, shield, doubleScore, slowTime, magnet, playerX, star, obstacles, particles, screenShake, comboTimer, powerUpDrops, meteors, superCombo, specialEvent, coinDrops, boss, bossDefeated])

  // Removed drawStar - using imported function from rendering.ts

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'p') setIsPaused(v => !v)
      if (e.key.toLowerCase() === 'q') setShield(5)
      if (e.key.toLowerCase() === 'w') setDoubleScore(5)
      if (e.key.toLowerCase() === 'e') setSlowTime(5)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <div className="main-content" style={{ display: showIntro ? 'none' as const : 'flex' }}>
      {showIntro && (
        <div className="intro">
          <div className="intro-text agames">MateSpark Studio</div>
          <div className="intro-text presents">prezentuje</div>
          <div className="intro-text title">StarCatch</div>
        </div>
      )}

      {!showIntro && (
        <div className="app-layout">
          <header className="topbar">
            <div className="brand">⭐ StarCatch</div>
            <div className="topbar-info">
              <span className="username" onClick={() => setShowProfile(!showProfile)}>👤 {playerProfile.username}</span>
              <span className="player-level">Lv.{playerProfile.level}</span>
              <span className="coins" onClick={() => setShowShop(!showShop)}>💰 {playerProfile.coins}</span>
            </div>
            <div className="topbar-controls">
              <button className="btn" onClick={() => setShowProfile(!showProfile)}>Profil</button>
              <button className="btn" onClick={() => setShowShop(!showShop)}>Sklep</button>
              <button className="btn" onClick={() => setIsPaused(v => !v)}>{isPaused ? 'Wznów' : 'Pauza'}</button>
              <button className="btn" onClick={startGame}>{gameState.isPlaying ? 'Restart' : 'Start'}</button>
            </div>
          </header>

          <main className="app-main">
            <aside className="sidebar">
              <div className="card">
                <h3>Zasady</h3>
                <ul>
                  <li>🎮 Poruszaj platformą myszką</li>
                  <li>⭐ Złota +1, Srebrna +2, Diament +5</li>
                  <li>💗 3 życia, co 10 pkt poziom</li>
                  <li>⚡ Łap spadające power-upy!</li>
                  <li>☄️ Meteory: unikaj = +3 bonusu</li>
                  <li>🔥 15+ combo = SUPER x2!</li>
                  <li>⏱️ P = pauza</li>
                </ul>
              </div>
              <div className="card stats">
                <div className="stat"><span className="label">Punkty</span><span className="value">{gameState.score}</span></div>
                <div className="stat"><span className="label">Życia</span><span className="value">{gameState.lives}</span></div>
                <div className="stat"><span className="label">Poziom</span><span className="value">{gameState.level}</span></div>
                <div className="stat"><span className="label">Rekord</span><span className="value">{gameState.highScore}</span></div>
                <div className="stat combo"><span className="label">Combo</span><span className="value" style={{color: gameState.combo > 10 ? '#FF00FF' : gameState.combo > 5 ? '#FF8800' : '#FFD700'}}>{gameState.combo}x {superCombo && '🔥'}</span></div>
                <div className="stat"><span className="label">Max Combo</span><span className="value">{gameState.maxCombo}x</span></div>
                {superCombo && <div className="super-combo-banner">⚡ SUPER COMBO x2! ⚡</div>}
                <div className="badges">
                  <span className={`badge ${shield > 0 ? 'on' : ''}`} title="Tarcza">🛡️</span>
                  <span className={`badge ${doubleScore > 0 ? 'on' : ''}`} title="x2 Punkty">✖️2</span>
                  <span className={`badge ${slowTime > 0 ? 'on' : ''}`} title="Slow-Mo">🐢</span>
                  <span className={`badge ${magnet > 0 ? 'on' : ''}`} title="Magnes">🧲</span>
                </div>
                {specialEvent.active && (
                  <div className="special-event">
                    {specialEvent.type === 'starRain' && '🌟 DESZCZ GWIAZDEK x1.5!'}
                    {specialEvent.type === 'slowMotion' && '⏱️ SLOW MOTION!'}
                    {specialEvent.type === 'invincible' && '🛡️ NIEZNISZCZALNY!'}
                    {specialEvent.type === 'coinRain' && '💰 DESZCZ MONET!'}
                    {specialEvent.type === 'frenzy' && '⚡ FRENZY MODE!'}
                    {specialEvent.type === 'luckyTime' && '🍀 LUCKY TIME x2!'}
                    {specialEvent.type === 'shieldRain' && '🛡️ TARCZA AKTYWNA!'}
                  </div>
                )}
                {boss.active && (
                  <div className="boss-warning">
                    ⚠️ BOSS BATTLE! ⚠️
                  </div>
                )}
                <div className="achievements-mini">
                  {achievements.filter(a => a.unlocked).length}/8 🏆
                </div>
              </div>
              <div className="card quick">
                <h3>Power-upy</h3>
                <button 
                  className={`btn boost-btn ${!gameState.isPlaying ? 'disabled' : ''} ${shield > 0 ? 'active' : ''}`}
                  onClick={() => gameState.isPlaying && setShield(5)}
                  disabled={!gameState.isPlaying}
                  title="Klawisz: Q"
                >
                  🛡️ Tarcza
                  {shield > 0 && <span className="timer">{Math.ceil(shield)}s</span>}
                </button>
                <button 
                  className={`btn boost-btn ${!gameState.isPlaying ? 'disabled' : ''} ${doubleScore > 0 ? 'active' : ''}`}
                  onClick={() => gameState.isPlaying && setDoubleScore(5)}
                  disabled={!gameState.isPlaying}
                  title="Klawisz: W"
                >
                  ✖️2 Punkty
                  {doubleScore > 0 && <span className="timer">{Math.ceil(doubleScore)}s</span>}
                </button>
                <button 
                  className={`btn boost-btn ${!gameState.isPlaying ? 'disabled' : ''} ${slowTime > 0 ? 'active' : ''}`}
                  onClick={() => gameState.isPlaying && setSlowTime(5)}
                  disabled={!gameState.isPlaying}
                  title="Klawisz: E"
                >
                  🐢 Slow-Mo
                  {slowTime > 0 && <span className="timer">{Math.ceil(slowTime)}s</span>}
                </button>
              </div>
            </aside>

            <section className="stage">
              <div id="gameStats" className="hud">
                <span>Pkt: {gameState.score}</span>
                <span>💰: {gameState.coins}</span>
                <span>HP: {gameState.lives}</span>
                <span>Lv: {gameState.level}</span>
                <span>{isPaused ? 'Pauza' : boss.active ? `BOSS: ${Math.ceil(boss.health)}/${boss.maxHealth}` : '\u00A0'}</span>
              </div>
              <div className="canvas-wrap">
                <canvas
                  ref={canvasRef}
                  id="gameCanvas"
                  width={400}
                  height={400}
                  style={{ position: 'relative', zIndex: 1 }}
                  onMouseMove={(e: React.MouseEvent<HTMLCanvasElement>) => {
                    if (!gameState.isPlaying) return
                    const rect = (e.target as HTMLCanvasElement).getBoundingClientRect()
                    let next = e.clientX - rect.left - playerWidth / 2
                    if (next < 0) next = 0
                    if (next + playerWidth > 400) next = 400 - playerWidth
                    setPlayerX(next)
                  }}
                />
                {!gameState.isPlaying && (
                  <div id="menu" className="menu">
                    <h2>StarCatch</h2>
                    <button className="btn" onClick={startGame}>
                      {gameState.score > 0 ? 'Zagraj ponownie' : 'Start Gry'}
                    </button>
                    <button className="btn" onClick={toggleDifficulty}>
                      Poziom: {gameState.difficulty === 'normal' ? 'Normalny' : 'Trudny'}
                    </button>
                    <div className="high-score">
                      Najlepszy wynik: <span>{gameState.highScore}</span>
                    </div>
                  </div>
                )}
              </div>
            </section>
          </main>

          <footer className="app-footer">
            <div className="left">v1.0.3 © 2024-2025</div>
            <div className="center"><a href="/changelog.html" target="_blank" rel="noopener noreferrer">Changelog</a></div>
            <div className="right"><a href="https://github.com/M4t3k33" target="_blank" rel="noopener noreferrer">GitHub</a> · <a href="https://mateuszdymowski.netlify.app/" target="_blank" rel="noopener noreferrer">Portfolio</a></div>
          </footer>

          {/* Shop Modal */}
          {showShop && (
            <div className="modal-overlay" onClick={() => setShowShop(false)}>
              <div className="modal-content shop-modal" onClick={(e) => e.stopPropagation()}>
                <h2>🛒 Sklep</h2>
                <div className="shop-balance">💰 Monety: {playerProfile.coins}</div>
                
                <div className="shop-section">
                  <h3>⬆️ Ulepszenia</h3>
                  <div className="shop-items">
                    {upgrades.map(upgrade => {
                      const cost = upgrade.cost * (upgrade.level + 1)
                      const canAfford = playerProfile.coins >= cost
                      const maxed = upgrade.level >= upgrade.maxLevel
                      return (
                        <div key={upgrade.id} className={`shop-item ${!canAfford || maxed ? 'disabled' : ''}`}>
                          <div className="item-info">
                            <div className="item-name">{upgrade.name}</div>
                            <div className="item-desc">{upgrade.description}</div>
                            <div className="item-level">Poziom: {upgrade.level}/{upgrade.maxLevel}</div>
                          </div>
                          <button 
                            className="btn shop-btn"
                            onClick={() => buyUpgrade(upgrade.id)}
                            disabled={!canAfford || maxed}
                          >
                            {maxed ? 'MAX' : `💰 ${cost}`}
                          </button>
                        </div>
                      )
                    })}
                  </div>
                </div>

                <div className="shop-section">
                  <h3>🎨 Skiny</h3>
                  <div className="shop-items">
                    {skins.map(skin => {
                      const canAfford = playerProfile.coins >= skin.cost
                      const isSelected = playerProfile.selectedSkin === skin.id
                      return (
                        <div key={skin.id} className={`shop-item skin-item ${!canAfford && !skin.unlocked ? 'disabled' : ''} ${isSelected ? 'selected' : ''}`}>
                          <div className="skin-preview" style={{background: skin.color === 'rainbow' ? 'linear-gradient(90deg, red, orange, yellow, green, blue, purple)' : skin.color}}></div>
                          <div className="item-info">
                            <div className="item-name">{skin.name}</div>
                            <div className="item-cost">{skin.cost === 0 ? 'Darmowy' : `💰 ${skin.cost}`}</div>
                          </div>
                          {!skin.unlocked ? (
                            <button 
                              className="btn shop-btn"
                              onClick={() => buySkin(skin.id)}
                              disabled={!canAfford}
                            >
                              Kup
                            </button>
                          ) : isSelected ? (
                            <span className="selected-badge">✓ Wybrany</span>
                          ) : (
                            <button 
                              className="btn shop-btn"
                              onClick={() => selectSkin(skin.id)}
                            >
                              Wybierz
                            </button>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
                
                <button className="btn close-btn" onClick={() => setShowShop(false)}>Zamknij</button>
              </div>
            </div>
          )}

          {/* Profile Modal */}
          {showProfile && (
            <div className="modal-overlay" onClick={() => setShowProfile(false)}>
              <div className="modal-content profile-modal" onClick={(e) => e.stopPropagation()}>
                <h2>👤 Profil Gracza</h2>
                
                <div className="profile-info">
                  <div className="profile-stat">
                    <span className="stat-label">Nazwa:</span>
                    <input 
                      type="text" 
                      value={playerProfile.username}
                      onChange={(e) => changeUsername(e.target.value)}
                      maxLength={20}
                      className="username-input"
                    />
                  </div>
                  <div className="profile-stat">
                    <span className="stat-label">Poziom:</span>
                    <span className="stat-value">{playerProfile.level}</span>
                  </div>
                  <div className="profile-stat">
                    <span className="stat-label">XP:</span>
                    <span className="stat-value">{playerProfile.xp} / {playerProfile.level * 100}</span>
                  </div>
                  <div className="profile-progress">
                    <div className="progress-bar" style={{width: `${(playerProfile.xp % 100)}%`}}></div>
                  </div>
                  <div className="profile-stat">
                    <span className="stat-label">Monety:</span>
                    <span className="stat-value">💰 {playerProfile.coins}</span>
                  </div>
                  <div className="profile-stat">
                    <span className="stat-label">Rekord:</span>
                    <span className="stat-value">{gameState.highScore}</span>
                  </div>
                  <div className="profile-stat">
                    <span className="stat-label">Max Combo:</span>
                    <span className="stat-value">{gameState.maxCombo}x</span>
                  </div>
                  <div className="profile-stat">
                    <span className="stat-label">Osiągnięcia:</span>
                    <span className="stat-value">{achievements.filter(a => a.unlocked).length}/8 🏆</span>
                  </div>
                </div>

                <div className="achievements-list">
                  <h3>🏆 Osiągnięcia</h3>
                  {achievements.map(ach => (
                    <div key={ach.id} className={`achievement ${ach.unlocked ? 'unlocked' : 'locked'}`}>
                      <span>{ach.unlocked ? '✓' : '🔒'}</span>
                      <span>{ach.name}</span>
                    </div>
                  ))}
                </div>
                
                <button className="btn close-btn" onClick={() => setShowProfile(false)}>Zamknij</button>
              </div>
            </div>
          )}

          <audio ref={collectAudioRef} src="https://www.soundjay.com/button/sounds/button-09.mp3" />
          <audio ref={failAudioRef} src="https://www.soundjay.com/button/sounds/button-10.mp3" />
        </div>
      )}
    </div>
  )
}


