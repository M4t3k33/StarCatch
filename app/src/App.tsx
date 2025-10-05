import React, { useEffect, useMemo, useRef, useState } from 'react'
import { isDeltaSuspicious, isDevToolsLikelyOpen, isScoreProgressValid } from './antiCheat'
import { storage } from './storage'

type GameState = {
  score: number
  lives: number
  level: number
  isPlaying: boolean
  difficulty: 'normal' | 'hard'
  highScore: number
  combo: number
  maxCombo: number
}

type Star = { x: number; y: number; speed: number; rotation: number }
type Obstacle = { x: number; y: number; width: number; height: number; speed: number; rotation: number; type: number }
type Particle = { x: number; y: number; vx: number; vy: number; life: number; color: string; size: number }

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
  }))
  const [showIntro, setShowIntro] = useState(true)
  const [playerX, setPlayerX] = useState(200)
  const playerY = 370
  const playerWidth = 50
  const playerHeight = 20

  const collectAudioRef = useRef<HTMLAudioElement | null>(null)
  const failAudioRef = useRef<HTMLAudioElement | null>(null)

  const [star, setStar] = useState<Star>(() => ({ x: Math.random() * 380, y: 0, speed: 2, rotation: 0 }))
  const [obstacles, setObstacles] = useState<Obstacle[]>(() => [
    { x: Math.random() * 370, y: -50, width: 30, height: 30, speed: 3, rotation: 0, type: 0 },
    { x: Math.random() * 370, y: -150, width: 30, height: 30, speed: 3, rotation: 0, type: 1 },
  ])
  const [particles, setParticles] = useState<Particle[]>([])
  const [screenShake, setScreenShake] = useState(0)
  const [comboTimer, setComboTimer] = useState(0)

  const [shield, setShield] = useState(0)
  const [doubleScore, setDoubleScore] = useState(0)
  const [slowTime, setSlowTime] = useState(0)
  const [isPaused, setIsPaused] = useState(false)

  useEffect(() => {
    const timeout = setTimeout(() => setShowIntro(false), 7000)
    return () => clearTimeout(timeout)
  }, [])

  const resetStar = useMemo(() => {
    return (level: number, difficulty: 'normal' | 'hard'): Star => {
      const base = 2 + level * 0.5
      const speed = difficulty === 'hard' ? base * 1.5 : base
      return { x: Math.random() * 380, y: 0, speed, rotation: Math.random() * Math.PI * 2 }
    }
  }, [])

  const resetObstacle = useMemo(() => {
    return (level: number): Obstacle => ({
      x: Math.random() * 370,
      y: -50,
      width: 30,
      height: 30,
      speed: 3 + level * 0.3,
      rotation: Math.random() * Math.PI * 2,
      type: Math.floor(Math.random() * 3),
    })
  }, [])

  function startGame(): void {
    setGameState((s: GameState) => ({ ...s, score: 0, lives: 3, level: 1, isPlaying: true, combo: 0 }))
    setStar(resetStar(1, gameState.difficulty))
    setObstacles([resetObstacle(1), resetObstacle(1)])
    setShield(0)
    setDoubleScore(0)
    setSlowTime(0)
    setIsPaused(false)
    setParticles([])
    setScreenShake(0)
    setComboTimer(0)
  }

  function endGame(): void {
    setGameState((s: GameState) => ({ ...s, isPlaying: false }))
  }

  function toggleDifficulty(): void {
    setGameState((s: GameState) => ({
      ...s,
      difficulty: s.difficulty === 'normal' ? 'hard' : 'normal',
    }))
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
          setStar(resetStar(gameState.level, gameState.difficulty))
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
          return newY > canvas.height ? resetObstacle(gameState.level) : { ...o, y: newY, rotation: newRot }
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
        
        // combo timer
        if (comboTimer > 0) {
          setComboTimer(v => Math.max(0, v - dt))
          if (comboTimer - dt <= 0) {
            setGameState(s => ({ ...s, combo: 0 }))
          }
        }
        
        // screen shake decay
        if (screenShake > 0) setScreenShake(v => Math.max(0, v - dt * 10))
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
      particles.forEach(p => {
        ctx.fillStyle = p.color
        ctx.globalAlpha = p.life
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
        ctx.fill()
      })
      ctx.globalAlpha = 1

      // draw star (animated)
      ctx.save()
      ctx.translate(star.x + 10, star.y + 10)
      ctx.rotate(star.rotation)
      ctx.fillStyle = '#FFD700'
      ctx.shadowBlur = 15
      ctx.shadowColor = '#FFD700'
      drawStar(ctx, 0, 0, 5, 10, 5)
      ctx.restore()

      // draw obstacles (different types)
      obstacles.forEach(o => {
        ctx.save()
        ctx.translate(o.x + o.width/2, o.y + o.height/2)
        ctx.rotate(o.rotation)
        
        if (o.type === 0) {
          // Red square
          ctx.fillStyle = '#FF4444'
          ctx.shadowBlur = 10
          ctx.shadowColor = '#FF0000'
          ctx.fillRect(-o.width/2, -o.height/2, o.width, o.height)
        } else if (o.type === 1) {
          // Purple triangle
          ctx.fillStyle = '#AA44FF'
          ctx.shadowBlur = 10
          ctx.shadowColor = '#8800FF'
          ctx.beginPath()
          ctx.moveTo(0, -o.height/2)
          ctx.lineTo(o.width/2, o.height/2)
          ctx.lineTo(-o.width/2, o.height/2)
          ctx.closePath()
          ctx.fill()
        } else {
          // Orange circle
          ctx.fillStyle = '#FF8844'
          ctx.shadowBlur = 10
          ctx.shadowColor = '#FF6600'
          ctx.beginPath()
          ctx.arc(0, 0, o.width/2, 0, Math.PI * 2)
          ctx.fill()
        }
        ctx.restore()
      })

      // draw player (spaceship style)
      ctx.save()
      ctx.translate(playerX + playerWidth/2, playerY + playerHeight/2)
      ctx.fillStyle = shield > 0 ? '#00FFFF' : '#4444FF'
      ctx.shadowBlur = shield > 0 ? 20 : 10
      ctx.shadowColor = shield > 0 ? '#00FFFF' : '#4444FF'
      
      // Spaceship shape
      ctx.beginPath()
      ctx.moveTo(0, -playerHeight/2)
      ctx.lineTo(playerWidth/2, playerHeight/2)
      ctx.lineTo(playerWidth/4, playerHeight/4)
      ctx.lineTo(-playerWidth/4, playerHeight/4)
      ctx.lineTo(-playerWidth/2, playerHeight/2)
      ctx.closePath()
      ctx.fill()
      
      // Engine glow
      if (gameState.isPlaying) {
        ctx.fillStyle = '#FF8800'
        ctx.globalAlpha = 0.7 + Math.sin(performance.now() / 100) * 0.3
        ctx.beginPath()
        ctx.arc(-playerWidth/6, playerHeight/3, 3, 0, Math.PI * 2)
        ctx.fill()
        ctx.beginPath()
        ctx.arc(playerWidth/6, playerHeight/3, 3, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.restore()
      
      ctx.restore() // restore shake

      // collisions
      const starCatch = star.y + 20 > playerY && star.x + 20 > playerX && star.x < playerX + playerWidth
      if (starCatch) {
        collectAudioRef.current?.play()
        
        // Create particles
        const newParticles: Particle[] = []
        for (let i = 0; i < 15; i++) {
          newParticles.push({
            x: star.x + 10,
            y: star.y + 10,
            vx: (Math.random() - 0.5) * 200,
            vy: (Math.random() - 0.5) * 200 - 50,
            life: 1,
            color: ['#FFD700', '#FFA500', '#FFFF00'][Math.floor(Math.random() * 3)],
            size: Math.random() * 4 + 2
          })
        }
        setParticles(prev => [...prev, ...newParticles])
        
        setGameState((s: GameState) => {
          const nextCombo = s.combo + 1
          const comboBonus = Math.floor(nextCombo / 5)
          const gain = (doubleScore > 0 ? 2 : 1) + comboBonus
          const nextScore = s.score + gain
          if (!isScoreProgressValid(s.score, nextScore)) return s
          const nextHigh = Math.max(nextScore, s.highScore)
          const nextMaxCombo = Math.max(nextCombo, s.maxCombo)
          const nextLevel = nextScore % 10 === 0 ? s.level + 1 : s.level
          if (nextHigh !== s.highScore) storage.setNumber('highScore', nextHigh)
          if (nextMaxCombo !== s.maxCombo) storage.setNumber('maxCombo', nextMaxCombo)
          return { ...s, score: nextScore, highScore: nextHigh, level: nextLevel, combo: nextCombo, maxCombo: nextMaxCombo }
        })
        setComboTimer(3)
        setStar(resetStar(gameState.level, gameState.difficulty))
      }

      obstacles.forEach(o => {
        const hit = playerX < o.x + o.width && playerX + playerWidth > o.x && playerY < o.y + o.height && playerY + playerHeight > o.y
        if (hit) {
          if (shield <= 0) {
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
          setObstacles(prev => prev.map(p => (p === o ? resetObstacle(gameState.level) : p)))
        }
      })

      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [gameState.isPlaying, isPaused, shield, doubleScore, slowTime, playerX, star, obstacles, particles, screenShake, comboTimer, resetStar, resetObstacle])

  // Helper function to draw a star shape
  function drawStar(ctx: CanvasRenderingContext2D, cx: number, cy: number, spikes: number, outerRadius: number, innerRadius: number) {
    let rot = Math.PI / 2 * 3
    let x = cx
    let y = cy
    const step = Math.PI / spikes

    ctx.beginPath()
    ctx.moveTo(cx, cy - outerRadius)
    for (let i = 0; i < spikes; i++) {
      x = cx + Math.cos(rot) * outerRadius
      y = cy + Math.sin(rot) * outerRadius
      ctx.lineTo(x, y)
      rot += step

      x = cx + Math.cos(rot) * innerRadius
      y = cy + Math.sin(rot) * innerRadius
      ctx.lineTo(x, y)
      rot += step
    }
    ctx.lineTo(cx, cy - outerRadius)
    ctx.closePath()
    ctx.fill()
  }

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
            <div className="topbar-controls">
              <button className="btn" onClick={() => setIsPaused(v => !v)}>{isPaused ? 'Wznów' : 'Pauza'}</button>
              <button className="btn" onClick={toggleDifficulty}>Tryb: {gameState.difficulty === 'normal' ? 'Normalny' : 'Trudny'}</button>
              <button className="btn" onClick={startGame}>{gameState.isPlaying ? 'Restart' : 'Start'}</button>
            </div>
          </header>

          <main className="app-main">
            <aside className="sidebar">
              <div className="card">
                <h3>Zasady</h3>
                <ul>
                  <li>🎮 Poruszaj platformą myszką</li>
                  <li>⭐ Łap gwiazdki, unikaj przeszkód</li>
                  <li>💗 3 życia, co 10 pkt poziom</li>
                  <li>⚡ Power-upy: Tarcza, x2, Slow</li>
                  <li>⏱️ P = pauza</li>
                </ul>
              </div>
              <div className="card stats">
                <div className="stat"><span className="label">Punkty</span><span className="value">{gameState.score}</span></div>
                <div className="stat"><span className="label">Życia</span><span className="value">{gameState.lives}</span></div>
                <div className="stat"><span className="label">Poziom</span><span className="value">{gameState.level}</span></div>
                <div className="stat"><span className="label">Rekord</span><span className="value">{gameState.highScore}</span></div>
                <div className="stat combo"><span className="label">Combo</span><span className="value" style={{color: gameState.combo > 10 ? '#FF00FF' : gameState.combo > 5 ? '#FF8800' : '#FFD700'}}>{gameState.combo}x</span></div>
                <div className="stat"><span className="label">Max Combo</span><span className="value">{gameState.maxCombo}x</span></div>
                <div className="badges">
                  <span className={`badge ${shield > 0 ? 'on' : ''}`}>🛡️</span>
                  <span className={`badge ${doubleScore > 0 ? 'on' : ''}`}>✖️2</span>
                  <span className={`badge ${slowTime > 0 ? 'on' : ''}`}>🐢</span>
                </div>
                <div className="anticheat">{isDevToolsLikelyOpen() ? 'ANTICHEAT: DEVTOOLS' : ''}</div>
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
                <span>HP: {gameState.lives}</span>
                <span>Lv: {gameState.level}</span>
                <span>{isPaused ? 'Pauza' : '\u00A0'}</span>
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
            <div className="left">v1.0.1 © 2024-2025</div>
            <div className="center"><a href="/changelog.html" target="_blank" rel="noopener noreferrer">Changelog</a></div>
            <div className="right"><a href="https://github.com/M4t3k33" target="_blank" rel="noopener noreferrer">GitHub</a> · <a href="https://mateuszdymowski.netlify.app/" target="_blank" rel="noopener noreferrer">Portfolio</a></div>
          </footer>

          <audio ref={collectAudioRef} src="https://www.soundjay.com/button/sounds/button-09.mp3" />
          <audio ref={failAudioRef} src="https://www.soundjay.com/button/sounds/button-10.mp3" />
        </div>
      )}
    </div>
  )
}


