import { Difficulty, EngineConfig, EngineEvents, GameState, Obstacle, PowerUps, Star } from './types'

export class GameEngine {
	private readonly config: EngineConfig
	private readonly events: EngineEvents
    private ctx: CanvasRenderingContext2D

	// world
	private star: Star
	private obstacles: Obstacle[]
	private powerUps: PowerUps = { shieldSeconds: 0, doubleScoreSeconds: 0, slowTimeSeconds: 0 }
	public state: GameState
    private player = { x: 200, y: 370, width: 50, height: 20 }

    constructor(ctx: CanvasRenderingContext2D, config: EngineConfig, initial: GameState, events: EngineEvents) {
		this.ctx = ctx
		this.config = config
		this.events = events
		this.state = { ...initial }
		this.star = this.createStar()
		this.obstacles = [this.createObstacle(), this.createObstacle()]
	}

    private starSpeed(level: number, difficulty: Difficulty): number {
        // px/s
        const base = 120 + level * 30
        return difficulty === 'hard' ? base * 1.5 : base
	}

	private createStar(): Star {
		return { position: { x: Math.random() * (this.config.width - 20), y: 0 }, speed: this.starSpeed(this.state.level, this.state.difficulty) }
	}

	private createObstacle(): Obstacle {
		return { position: { x: Math.random() * (this.config.width - 30), y: -50 }, size: { x: 30, y: 30 }, speed: 3 + this.state.level * 0.3 }
	}

	public setPowerUps(next: Partial<PowerUps>): void {
		this.powerUps = { ...this.powerUps, ...next }
	}

    public setPlayerX(x: number): void {
        const min = 0
        const max = this.config.width - this.player.width
        this.player.x = Math.min(max, Math.max(min, x))
    }

	public updateDifficulty(d: Difficulty): void {
		this.state.difficulty = d
	}

    public update(dt: number): void {
		// decay power-ups
		if (this.powerUps.shieldSeconds > 0) this.powerUps.shieldSeconds = Math.max(0, this.powerUps.shieldSeconds - dt)
		if (this.powerUps.doubleScoreSeconds > 0) this.powerUps.doubleScoreSeconds = Math.max(0, this.powerUps.doubleScoreSeconds - dt)
		if (this.powerUps.slowTimeSeconds > 0) this.powerUps.slowTimeSeconds = Math.max(0, this.powerUps.slowTimeSeconds - dt)

		// star update
        const timeScale = this.powerUps.slowTimeSeconds > 0 ? 0.5 : 1
        this.star.position.y += this.star.speed * timeScale * dt
		if (this.star.position.y > this.config.height) {
			this.star = this.createStar()
			if (this.state.isPlaying) {
				this.state.lives -= 1
				this.events.onLife(this.state.lives)
				if (this.state.lives <= 0) this.events.onGameOver()
			}
		}

		// obstacles
    for (let i = 0; i < this.obstacles.length; i++) {
			const o = this.obstacles[i]
            o.position.y += o.speed * timeScale * dt
			if (o.position.y > this.config.height) this.obstacles[i] = this.createObstacle()
		}

		// collisions (gracz vs gwiazda)
        const starCatch = this.star.position.y + 20 > this.player.y &&
            this.star.position.x + 20 > this.player.x &&
            this.star.position.x < this.player.x + this.player.width
        if (starCatch) {
            const gain = this.powerUps.doubleScoreSeconds > 0 ? 2 : 1
            const nextScore = this.state.score + gain
            this.state.score = nextScore
            this.events.onScore(nextScore)
            if (nextScore % 10 === 0) {
                this.state.level += 1
                this.events.onLevel(this.state.level)
            }
            this.star = this.createStar()
        }

        // collisions (gracz vs przeszkody)
        for (let i = 0; i < this.obstacles.length; i++) {
            const o = this.obstacles[i]
            const hit = this.player.x < o.position.x + o.size.x &&
                this.player.x + this.player.width > o.position.x &&
                this.player.y < o.position.y + o.size.y &&
                this.player.y + this.player.height > o.position.y
            if (hit) {
                if (this.powerUps.shieldSeconds <= 0) {
                    this.state.lives -= 1
                    this.events.onLife(this.state.lives)
                    if (this.state.lives <= 0) this.events.onGameOver()
                }
                this.obstacles[i] = this.createObstacle()
            }
        }
	}

    public render(): void {
		const ctx = this.ctx
		ctx.clearRect(0, 0, this.config.width, this.config.height)

		// star
		ctx.fillStyle = 'gold'
		ctx.beginPath()
		ctx.moveTo(this.star.position.x + 10, this.star.position.y)
		ctx.lineTo(this.star.position.x + 20, this.star.position.y + 20)
		ctx.lineTo(this.star.position.x, this.star.position.y + 20)
		ctx.closePath()
		ctx.fill()

		// obstacles
		ctx.fillStyle = 'red'
		for (const o of this.obstacles) {
			ctx.fillRect(o.position.x, o.position.y, o.size.x, o.size.y)
		}

        // player
        ctx.fillStyle = 'blue'
        ctx.fillRect(this.player.x, this.player.y, this.player.width, this.player.height)
	}

	public getStar() { return this.star }
	public getObstacles() { return this.obstacles }

    public resetStar(): void { this.star = this.createStar() }
    public resetObstacle(target: Obstacle): void {
        const idx = this.obstacles.indexOf(target)
        if (idx >= 0) this.obstacles[idx] = this.createObstacle()
    }
}
