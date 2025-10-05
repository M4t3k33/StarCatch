// Discord Rich Presence for Electron
// This will show your game status on Discord

export interface DiscordActivity {
  details?: string
  state?: string
  startTimestamp?: number
  largeImageKey?: string
  largeImageText?: string
  smallImageKey?: string
  smallImageText?: string
}

class DiscordRPC {
  private clientId = '1234567890' // Replace with your Discord Application ID
  private isConnected = false
  private startTime = Date.now()

  async initialize(): Promise<boolean> {
    try {
      // Check if we're in Electron environment
      if (typeof window !== 'undefined' && (window as any).electron) {
        console.log('[Discord RPC] Initializing...')
        this.isConnected = true
        this.startTime = Date.now()
        return true
      }
      return false
    } catch (error) {
      console.error('[Discord RPC] Failed to initialize:', error)
      return false
    }
  }

  updateActivity(activity: DiscordActivity): void {
    if (!this.isConnected) return

    try {
      const fullActivity = {
        ...activity,
        startTimestamp: this.startTime,
        largeImageKey: activity.largeImageKey || 'starcatch_logo',
        largeImageText: activity.largeImageText || 'StarCatch',
      }

      // Send to Electron main process
      if ((window as any).electron?.setDiscordActivity) {
        (window as any).electron.setDiscordActivity(fullActivity)
      }

      console.log('[Discord RPC] Activity updated:', fullActivity)
    } catch (error) {
      console.error('[Discord RPC] Failed to update activity:', error)
    }
  }

  clearActivity(): void {
    if (!this.isConnected) return

    try {
      if ((window as any).electron?.clearDiscordActivity) {
        (window as any).electron.clearDiscordActivity()
      }
      console.log('[Discord RPC] Activity cleared')
    } catch (error) {
      console.error('[Discord RPC] Failed to clear activity:', error)
    }
  }

  disconnect(): void {
    this.clearActivity()
    this.isConnected = false
    console.log('[Discord RPC] Disconnected')
  }
}

export const discordRPC = new DiscordRPC()

// Helper functions for game states
export function updateDiscordPlaying(score: number, level: number, lives: number): void {
  discordRPC.updateActivity({
    details: `Playing StarCatch`,
    state: `Score: ${score} | Level: ${level} | Lives: ${lives}`,
    smallImageKey: 'playing',
    smallImageText: 'In Game',
  })
}

export function updateDiscordMenu(): void {
  discordRPC.updateActivity({
    details: 'In Menu',
    state: 'Selecting options',
    smallImageKey: 'menu',
    smallImageText: 'Main Menu',
  })
}

export function updateDiscordShop(): void {
  discordRPC.updateActivity({
    details: 'In Shop',
    state: 'Browsing upgrades',
    smallImageKey: 'shop',
    smallImageText: 'Shopping',
  })
}

export function updateDiscordBossFight(bossHealth: number): void {
  discordRPC.updateActivity({
    details: 'Fighting Boss!',
    state: `Boss HP: ${Math.ceil(bossHealth)}`,
    smallImageKey: 'boss',
    smallImageText: 'Boss Battle',
  })
}
