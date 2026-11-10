import { genres, seededIndex, semitone } from './genres'
import type { GenreId } from './genres'

export class MusicEngine {
  private context: AudioContext | null = null
  private master: GainNode | null = null
  private warmth: BiquadFilterNode | null = null
  private timer: ReturnType<typeof setInterval> | null = null
  private active = new Set<OscillatorNode>()
  private noise: AudioBufferSourceNode | null = null
  private noiseGain: GainNode | null = null
  private beatTimers = new Set<ReturnType<typeof setTimeout>>()
  private epoch = 0
  private nextTime = 0
  private step = 0
  private genre: GenreId = 'lofi'
  private seed = 1
  private volume = 0.7
  private muted = false
  private vinyl = true
  private onBeat?: (step: number) => void
  playing = false

  setBeatListener(listener?: (step: number) => void) { this.onBeat = listener }
  private async ensureContext() {
    if (!this.context) {
      this.context = new AudioContext()
      this.master = this.context.createGain()
      this.warmth = this.context.createBiquadFilter()
      this.warmth.type = 'lowpass'
      this.warmth.frequency.value = 15000
      this.warmth.connect(this.master).connect(this.context.destination)
      this.updateVolume()
    }
    await this.context.resume()
  }
  private updateVolume() {
    if (this.master && this.context) this.master.gain.setTargetAtTime(this.muted ? 0 : this.volume * 0.32, this.context.currentTime, 0.025)
  }
  setVolume(value: number) { this.volume = Math.max(0, Math.min(1, value)); this.updateVolume() }
  setMuted(value: boolean) { this.muted = value; this.updateVolume() }
  setVinylEnabled(value: boolean) {
    this.vinyl = value
    if (this.warmth && this.context) this.warmth.frequency.setTargetAtTime(value ? 4200 : 15000, this.context.currentTime, 0.15)
    if (this.noiseGain && this.context) this.noiseGain.gain.setTargetAtTime(value ? 0.012 : 0, this.context.currentTime, 0.15)
  }
  private startVinyl() {
    const ctx = this.context!
    const length = Math.round(ctx.sampleRate * 4)
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate)
    const samples = buffer.getChannelData(0)
    let s = (this.seed || 1) >>> 0, previous = 0
    for (let i = 0; i < length; i++) {
      s ^= s << 13; s ^= s >>> 17; s ^= s << 5
      const white = (s >>> 0) / 0xffffffff * 2 - 1
      previous = previous * 0.82 + white * 0.18
      const crackle = i % 503 === (this.seed % 503) && ((s >>> 0) % 7 === 0) ? 0.08 : 0
      const dust = i % 23017 === (this.seed % 23017) && ((s >>> 0) % 13 === 0) ? 0.55 : 0
      const edge = Math.min(1, i / 400, (length - 1 - i) / 400)
      samples[i] = (previous * 0.26 + crackle + dust) * edge
    }
    this.noiseGain = ctx.createGain()
    this.noiseGain.gain.value = this.vinyl ? 0.012 : 0
    this.noise = ctx.createBufferSource()
    this.noise.buffer = buffer
    this.noise.loop = true
    this.noise.connect(this.noiseGain).connect(this.master!)
    this.noise.start()
  }
  async play(genre: GenreId, seed = this.seed) {
    const epoch = ++this.epoch
    await this.ensureContext()
    if (epoch !== this.epoch) return false
    this.stopCycle()
    this.genre = genre; this.seed = seed >>> 0; this.step = 0
    this.playing = true
    this.setVinylEnabled(this.vinyl)
    this.startVinyl()
    this.nextTime = this.context!.currentTime + 0.04
    this.schedule()
    this.timer = setInterval(() => this.schedule(), 70)
    return true
  }
  private tone(frequency: number, time: number, duration: number, gain: number, wave: OscillatorType, filterHz = 2200) {
    const ctx = this.context!
    const oscillator = ctx.createOscillator(), filter = ctx.createBiquadFilter(), envelope = ctx.createGain()
    oscillator.type = wave; oscillator.frequency.setValueAtTime(frequency, time)
    filter.type = 'lowpass'; filter.frequency.value = filterHz
    envelope.gain.setValueAtTime(0.0001, time)
    envelope.gain.exponentialRampToValueAtTime(Math.max(0.0002, gain), time + Math.min(0.025, duration / 3))
    envelope.gain.exponentialRampToValueAtTime(0.0001, time + duration)
    oscillator.connect(filter).connect(envelope).connect(this.warmth!)
    oscillator.onended = () => { this.active.delete(oscillator); oscillator.disconnect(); filter.disconnect(); envelope.disconnect() }
    this.active.add(oscillator); oscillator.start(time); oscillator.stop(time + duration + 0.03)
  }
  private percussion(time: number, strong: boolean) {
    const ctx = this.context!, osc = ctx.createOscillator(), env = ctx.createGain()
    osc.type = 'sine'; osc.frequency.setValueAtTime(strong ? 115 : 230, time)
    osc.frequency.exponentialRampToValueAtTime(strong ? 42 : 100, time + 0.1)
    env.gain.setValueAtTime(strong ? 0.16 : 0.055, time)
    env.gain.exponentialRampToValueAtTime(0.0001, time + 0.18)
    osc.connect(env).connect(this.warmth!)
    osc.onended = () => { this.active.delete(osc); osc.disconnect(); env.disconnect() }
    this.active.add(osc); osc.start(time); osc.stop(time + 0.19)
  }
  private schedule() {
    if (!this.playing || !this.context) return
    const preset = genres[this.genre], beat = 60 / preset.bpm, stepsPerBar = preset.beats * 4
    while (this.nextTime < this.context.currentTime + 0.25) {
      const step = this.step, local = step % stepsPerBar, bar = Math.floor(step / stepsPerBar) % 4, time = this.nextTime, root = preset.roots[bar]
      if (local % 4 === 0) {
        if (local === 0 || preset.id !== 'ambient') preset.intervals.forEach(interval => this.tone(semitone(root, interval), time, beat * (preset.id === 'ambient' ? 3.7 : 1.35), preset.id === 'rock' ? 0.014 : 0.022, preset.wave, preset.id === 'rock' ? 1250 : 2400))
        this.tone(root / 2, time, beat * 0.85, 0.1, preset.bassWave, 650)
        if (this.onBeat) {
          const scheduledEpoch = this.epoch
          const timeout = setTimeout(() => {
            this.beatTimers.delete(timeout)
            if (scheduledEpoch === this.epoch && this.playing) this.onBeat?.(step)
          }, Math.max(0, (time - this.context!.currentTime) * 1000))
          this.beatTimers.add(timeout)
        }
      }
      if (preset.drum.includes(local)) this.percussion(time, local === 0 || local === 8)
      if (preset.accents.includes(local)) {
        const note = preset.melody[(Math.floor(step / 2) + seededIndex(this.seed, step, 3)) % preset.melody.length]
        this.tone(semitone(root * 2, note), time, beat * (preset.id === 'ambient' ? 1.5 : 0.48), preset.id === 'rock' ? 0.026 : 0.035, preset.wave, preset.id === 'synthwave' ? 1500 : 3000)
      }
      this.step++; this.nextTime += beat / 4
    }
  }
  private stopCycle() {
    this.playing = false
    if (this.timer) clearInterval(this.timer)
    this.timer = null
    for (const timeout of this.beatTimers) clearTimeout(timeout)
    this.beatTimers.clear()
    if (this.noise) { try { this.noise.stop() } catch { /* already stopped */ } this.noise.disconnect(); this.noise = null }
    this.noiseGain?.disconnect(); this.noiseGain = null
    for (const source of this.active) { try { source.stop() } catch { /* already ended */ } }
    this.active.clear()
  }
  pause() { this.epoch++; this.stopCycle() }
  async changeGenre(genre: GenreId) { if (this.playing) await this.play(genre, this.seed); else this.genre = genre }
  async dispose() { this.pause(); await this.context?.close(); this.context = null; this.master = null; this.warmth = null }
}
