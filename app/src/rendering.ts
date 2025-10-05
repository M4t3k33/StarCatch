import { Star, Obstacle, Particle, PowerUpDrop, Meteor, CoinDrop, Boss, Skin } from './types'
import { PLAYER_WIDTH, PLAYER_HEIGHT } from './constants'

// Helper function to draw a star shape
export function drawStar(ctx: CanvasRenderingContext2D, cx: number, cy: number, spikes: number, outerRadius: number, innerRadius: number) {
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

// Draw particles
export function drawParticles(ctx: CanvasRenderingContext2D, particles: Particle[]) {
  particles.forEach(p => {
    ctx.fillStyle = p.color
    ctx.globalAlpha = p.life
    ctx.beginPath()
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
    ctx.fill()
  })
  ctx.globalAlpha = 1
}

// Draw star (game object)
export function drawGameStar(ctx: CanvasRenderingContext2D, star: Star) {
  ctx.save()
  ctx.translate(star.x + 10, star.y + 10)
  ctx.rotate(star.rotation)
  
  if (star.type === 'gold') {
    ctx.fillStyle = '#FFD700'
    ctx.shadowBlur = 15
    ctx.shadowColor = '#FFD700'
    drawStar(ctx, 0, 0, 5, 10, 5)
  } else if (star.type === 'silver') {
    ctx.fillStyle = '#C0C0C0'
    ctx.shadowBlur = 20
    ctx.shadowColor = '#C0C0C0'
    drawStar(ctx, 0, 0, 5, 12, 6)
  } else {
    // diamond
    ctx.fillStyle = '#00FFFF'
    ctx.shadowBlur = 25
    ctx.shadowColor = '#00FFFF'
    drawStar(ctx, 0, 0, 8, 14, 7)
  }
  ctx.restore()
}

// Draw power-up drops
export function drawPowerUpDrops(ctx: CanvasRenderingContext2D, powerUpDrops: PowerUpDrop[]) {
  powerUpDrops.forEach(p => {
    ctx.save()
    ctx.translate(p.x + 15, p.y + 15)
    
    if (p.type === 'shield') {
      ctx.fillStyle = '#00FFFF'
      ctx.shadowBlur = 15
      ctx.shadowColor = '#00FFFF'
      ctx.beginPath()
      ctx.arc(0, 0, 12, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#000'
      ctx.font = '16px Arial'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText('🛡️', 0, 0)
    } else if (p.type === 'double') {
      ctx.fillStyle = '#FFD700'
      ctx.shadowBlur = 15
      ctx.shadowColor = '#FFD700'
      ctx.beginPath()
      ctx.arc(0, 0, 12, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#000'
      ctx.font = '14px Arial'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText('×2', 0, 0)
    } else if (p.type === 'slow') {
      ctx.fillStyle = '#AA44FF'
      ctx.shadowBlur = 15
      ctx.shadowColor = '#AA44FF'
      ctx.beginPath()
      ctx.arc(0, 0, 12, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#000'
      ctx.font = '16px Arial'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText('🐢', 0, 0)
    } else {
      // magnet
      ctx.fillStyle = '#FF00FF'
      ctx.shadowBlur = 15
      ctx.shadowColor = '#FF00FF'
      ctx.beginPath()
      ctx.arc(0, 0, 12, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#000'
      ctx.font = '16px Arial'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText('🧲', 0, 0)
    }
    ctx.restore()
  })
}

// Draw magnet field
export function drawMagnetField(ctx: CanvasRenderingContext2D, playerX: number, playerY: number, magnet: number) {
  if (magnet > 0) {
    ctx.save()
    ctx.strokeStyle = '#FF00FF'
    ctx.globalAlpha = 0.3
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.arc(playerX + PLAYER_WIDTH/2, playerY + PLAYER_HEIGHT/2, 150, 0, Math.PI * 2)
    ctx.stroke()
    ctx.restore()
  }
}

// Draw coin drops
export function drawCoinDrops(ctx: CanvasRenderingContext2D, coinDrops: CoinDrop[]) {
  coinDrops.forEach(coin => {
    ctx.save()
    ctx.translate(coin.x + 15, coin.y + 15)
    ctx.fillStyle = '#FFD700'
    ctx.shadowBlur = 15
    ctx.shadowColor = '#FFD700'
    ctx.beginPath()
    ctx.arc(0, 0, 10, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#000'
    ctx.font = 'bold 12px Arial'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(String(coin.value), 0, 0)
    ctx.restore()
  })
}

// Draw boss
export function drawBoss(ctx: CanvasRenderingContext2D, boss: Boss) {
  if (!boss.active) return
  
  ctx.save()
  ctx.translate(boss.x, boss.y)
  
  // Boss body
  ctx.fillStyle = '#FF0000'
  ctx.shadowBlur = 20
  ctx.shadowColor = '#FF0000'
  ctx.beginPath()
  ctx.arc(0, 0, 40, 0, Math.PI * 2)
  ctx.fill()
  
  // Boss eyes
  ctx.fillStyle = '#FFFF00'
  ctx.beginPath()
  ctx.arc(-15, -10, 8, 0, Math.PI * 2)
  ctx.fill()
  ctx.beginPath()
  ctx.arc(15, -10, 8, 0, Math.PI * 2)
  ctx.fill()
  
  // Boss pupils
  ctx.fillStyle = '#000'
  ctx.beginPath()
  ctx.arc(-15, -10, 4, 0, Math.PI * 2)
  ctx.fill()
  ctx.beginPath()
  ctx.arc(15, -10, 4, 0, Math.PI * 2)
  ctx.fill()
  
  // Boss health bar
  ctx.fillStyle = 'rgba(0,0,0,0.5)'
  ctx.fillRect(-40, 50, 80, 8)
  ctx.fillStyle = boss.health < boss.maxHealth * 0.3 ? '#FF0000' : boss.health < boss.maxHealth * 0.6 ? '#FFA500' : '#00FF00'
  ctx.fillRect(-40, 50, 80 * (boss.health / boss.maxHealth), 8)
  
  ctx.restore()
}

// Draw meteors
export function drawMeteors(ctx: CanvasRenderingContext2D, meteors: Meteor[]) {
  meteors.forEach(m => {
    ctx.save()
    ctx.translate(m.x + m.size/2, m.y + m.size/2)
    ctx.rotate(m.rotation)
    ctx.fillStyle = '#8B4513'
    ctx.shadowBlur = 20
    ctx.shadowColor = '#FF4500'
    ctx.beginPath()
    ctx.arc(0, 0, m.size/2, 0, Math.PI * 2)
    ctx.fill()
    // Crater details
    ctx.fillStyle = '#654321'
    ctx.beginPath()
    ctx.arc(-m.size/6, -m.size/6, m.size/8, 0, Math.PI * 2)
    ctx.fill()
    ctx.beginPath()
    ctx.arc(m.size/6, m.size/8, m.size/10, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
  })
}

// Draw obstacles
export function drawObstacles(ctx: CanvasRenderingContext2D, obstacles: Obstacle[]) {
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
      ctx.shadowColor = '#AA00FF'
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
}

// Draw player (spaceship)
export function drawPlayer(ctx: CanvasRenderingContext2D, playerX: number, playerY: number, shield: number, skins: Skin[], selectedSkin: string) {
  ctx.save()
  ctx.translate(playerX + PLAYER_WIDTH/2, playerY + PLAYER_HEIGHT/2)
  
  const selectedSkinData = skins.find(s => s.id === selectedSkin)
  let shipColor = selectedSkinData?.color || '#4444FF'
  
  if (shipColor === 'rainbow') {
    const hue = (performance.now() / 10) % 360
    shipColor = `hsl(${hue}, 100%, 50%)`
  }
  
  ctx.fillStyle = shield > 0 ? '#00FFFF' : shipColor
  ctx.shadowBlur = shield > 0 ? 20 : 15
  ctx.shadowColor = shield > 0 ? '#00FFFF' : shipColor
  
  // Spaceship shape
  ctx.beginPath()
  ctx.moveTo(0, -PLAYER_HEIGHT/2)
  ctx.lineTo(PLAYER_WIDTH/2, PLAYER_HEIGHT/2)
  ctx.lineTo(PLAYER_WIDTH/4, PLAYER_HEIGHT/4)
  ctx.lineTo(-PLAYER_WIDTH/4, PLAYER_HEIGHT/4)
  ctx.lineTo(-PLAYER_WIDTH/2, PLAYER_HEIGHT/2)
  ctx.closePath()
  ctx.fill()
  
  // Engine flames
  ctx.fillStyle = '#FF8800'
  ctx.shadowBlur = 10
  ctx.shadowColor = '#FF4400'
  ctx.beginPath()
  ctx.moveTo(-PLAYER_WIDTH/4, PLAYER_HEIGHT/4)
  ctx.lineTo(-PLAYER_WIDTH/6, PLAYER_HEIGHT/2 + 8)
  ctx.lineTo(-PLAYER_WIDTH/12, PLAYER_HEIGHT/4)
  ctx.closePath()
  ctx.fill()
  
  ctx.beginPath()
  ctx.moveTo(PLAYER_WIDTH/12, PLAYER_HEIGHT/4)
  ctx.lineTo(PLAYER_WIDTH/6, PLAYER_HEIGHT/2 + 8)
  ctx.lineTo(PLAYER_WIDTH/4, PLAYER_HEIGHT/4)
  ctx.closePath()
  ctx.fill()
  
  ctx.restore()
}
