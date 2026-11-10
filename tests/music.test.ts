import { afterEach, describe, expect, it, vi } from 'vitest'
import { MusicEngine } from '../src/features/music/engine'
let starts = 0, stops = 0, closes = 0
const targets: number[] = []
const frequencies: number[] = []
const param = () => ({ value: 0, setValueAtTime(value: number) { frequencies.push(value) }, exponentialRampToValueAtTime() {}, setTargetAtTime(value: number) { targets.push(value) } })
const node = () => ({ connect() { return this }, disconnect() {} })
class FakeAudioContext {
  currentTime = 1; sampleRate = 1000; destination = node()
  createGain() { return { ...node(), gain: param() } }
  createBiquadFilter() { return { ...node(), frequency: param(), type: 'lowpass' } }
  createOscillator() { return { ...node(), frequency: param(), type: 'sine', onended: null as (() => void) | null, start() { starts++ }, stop() { stops++; this.onended?.() } } }
  createBuffer(_channels: number, length: number) { return { getChannelData: () => new Float32Array(length) } }
  createBufferSource() { return { ...node(), buffer: null, loop: false, start() { starts++ }, stop() { stops++ } } }
  async resume() {}
  async close() { closes++ }
}
afterEach(() => { vi.unstubAllGlobals(); starts = 0; stops = 0; closes = 0; targets.length = 0; frequencies.length = 0 })
describe('music engine', () => {
  it('starts musical voices and vinyl noise, changes genre, then releases context', async () => {
    vi.stubGlobal('AudioContext', FakeAudioContext)
    const engine = new MusicEngine()
    engine.setVinylEnabled(false)
    await engine.play('lofi', 99)
    expect(engine.playing).toBe(true)
    expect(starts).toBeGreaterThan(3)
    const first = starts
    engine.setVinylEnabled(true)
    expect(targets.at(-1)).toBeCloseTo(0.012)
    engine.setMuted(true)
    expect(targets.at(-1)).toBe(0)
    engine.setMuted(false); engine.setVolume(0.4)
    expect(targets.at(-1)).toBeCloseTo(0.4 * 0.32)
    await engine.changeGenre('rock')
    expect(starts).toBeGreaterThan(first)
    engine.pause()
    expect(engine.playing).toBe(false)
    expect(stops).toBeGreaterThan(0)
    await engine.dispose()
    expect(closes).toBe(1)
  })
  it('schedules the same opening notes for the same saved seed and genre', async () => {
    vi.stubGlobal('AudioContext', FakeAudioContext)
    const one = new MusicEngine(); await one.play('bossa', 2026)
    const opening = frequencies.slice()
    await one.dispose(); frequencies.length = 0
    const two = new MusicEngine(); await two.play('bossa', 2026)
    expect(frequencies).toEqual(opening)
    await two.dispose()
  })
  it('does not start a cycle after a pending AudioContext resume was cancelled', async () => {
    let resume!: () => void
    class SlowAudioContext extends FakeAudioContext { override resume() { return new Promise<void>(resolve => { resume = resolve }) } }
    vi.stubGlobal('AudioContext', SlowAudioContext)
    const engine = new MusicEngine()
    const pending = engine.play('jazz', 11)
    engine.pause()
    resume()
    expect(await pending).toBe(false)
    expect(engine.playing).toBe(false)
    await engine.dispose()
  })
})
