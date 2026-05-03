export class SoundSystem {
  private static ctx: AudioContext | null = null

  private static getCtx(): AudioContext {
    if (!this.ctx) this.ctx = new AudioContext()
    if (this.ctx.state === 'suspended') this.ctx.resume()
    return this.ctx
  }

  // White noise buffer (1s, reused across calls)
  private static noiseBuffer: AudioBuffer | null = null
  private static getNoise(ctx: AudioContext): AudioBuffer {
    if (!this.noiseBuffer || this.noiseBuffer.sampleRate !== ctx.sampleRate) {
      const buf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate)
      const data = buf.getChannelData(0)
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1
      this.noiseBuffer = buf
    }
    return this.noiseBuffer
  }

  // ── Loops ──────────────────────────────────────────────────────────

  static startGroundSlide(getSpeed: () => number): () => void {
    const ctx = this.getCtx()
    const noise = ctx.createBufferSource()
    noise.buffer = this.getNoise(ctx)
    noise.loop = true

    const lp = ctx.createBiquadFilter()
    lp.type = 'lowpass'
    lp.frequency.value = 400

    const gain = ctx.createGain()
    gain.gain.setValueAtTime(0, ctx.currentTime)

    noise.connect(lp).connect(gain).connect(ctx.destination)
    noise.start()

    let alive = true
    const tick = () => {
      if (!alive) return
      const speed = getSpeed()
      gain.gain.setTargetAtTime(Math.min(0.25, speed / 437 * 0.25), ctx.currentTime, 0.05)
      requestAnimationFrame(tick)
    }
    tick()

    return () => {
      alive = false
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.12)
      noise.stop(ctx.currentTime + 0.15)
    }
  }

  // ── One-shots ──────────────────────────────────────────────────────

  static playCollision(): void {
    const ctx = this.getCtx()

    // Noise burst
    const noise = ctx.createBufferSource()
    noise.buffer = this.getNoise(ctx)
    const nGain = ctx.createGain()
    nGain.gain.setValueAtTime(0.6, ctx.currentTime)
    nGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4)
    noise.connect(nGain).connect(ctx.destination)
    noise.start()
    noise.stop(ctx.currentTime + 0.42)

    // Low sine drop
    const osc = ctx.createOscillator()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(180, ctx.currentTime)
    osc.frequency.exponentialRampToValueAtTime(40, ctx.currentTime + 0.5)
    const oGain = ctx.createGain()
    oGain.gain.setValueAtTime(0.4, ctx.currentTime)
    oGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5)
    osc.connect(oGain).connect(ctx.destination)
    osc.start()
    osc.stop(ctx.currentTime + 0.52)
  }

  static playMilestone(idx: number): void {
    const ctx = this.getCtx()
    // Base note C4 (261 Hz), each milestone up a major third
    const freqs = [261, 329, 415, 523, 659, 830]
    const freq = freqs[Math.min(idx, freqs.length - 1)]

    const osc = ctx.createOscillator()
    osc.type = 'sine'
    osc.frequency.value = freq

    // Harmonics
    const osc2 = ctx.createOscillator()
    osc2.type = 'sine'
    osc2.frequency.value = freq * 2

    const gain = ctx.createGain()
    gain.gain.setValueAtTime(0.22, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6)

    osc.connect(gain).connect(ctx.destination)
    osc2.connect(gain)
    osc.start(); osc2.start()
    osc.stop(ctx.currentTime + 0.65)
    osc2.stop(ctx.currentTime + 0.65)
  }

  static playEnergyDepleted(): void {
    const ctx = this.getCtx()
    const osc = ctx.createOscillator()
    osc.type = 'sawtooth'
    osc.frequency.setValueAtTime(220, ctx.currentTime)
    osc.frequency.linearRampToValueAtTime(80, ctx.currentTime + 0.35)

    const gain = ctx.createGain()
    gain.gain.setValueAtTime(0.25, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4)

    osc.connect(gain).connect(ctx.destination)
    osc.start()
    osc.stop(ctx.currentTime + 0.42)
  }
}
