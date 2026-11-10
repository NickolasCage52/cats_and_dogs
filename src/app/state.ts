import type { Species } from '../features/animal-detection/logic'

export type Phase = 'idle' | 'loading-model' | 'analyzing' | 'found' | 'wrong-species' | 'not-found' | 'uncertain' | 'error'
export type AudioPhase = 'paused' | 'starting' | 'playing'
export type AppState = { phase: Phase; audio: AudioPhase; count: number; otherSpecies: Species | null; message: string }
export type Action =
  | { type: 'RESET' | 'LOADING' | 'ANALYZING' | 'NOT_FOUND' | 'UNCERTAIN' | 'START' | 'PLAY' | 'PAUSE' }
  | { type: 'FOUND'; count: number }
  | { type: 'WRONG_SPECIES'; species: Species }
  | { type: 'ERROR'; message: string }

export const initialState: AppState = { phase: 'idle', audio: 'paused', count: 0, otherSpecies: null, message: '' }
export function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'RESET': return initialState
    case 'LOADING': return { ...initialState, phase: 'loading-model' }
    case 'ANALYZING': return { ...state, phase: 'analyzing' }
    case 'FOUND': return { phase: 'found', audio: 'paused', count: action.count, otherSpecies: null, message: '' }
    case 'WRONG_SPECIES': return { ...initialState, phase: 'wrong-species', otherSpecies: action.species }
    case 'NOT_FOUND': return { ...initialState, phase: 'not-found' }
    case 'UNCERTAIN': return { ...initialState, phase: 'uncertain' }
    case 'ERROR': return { ...initialState, phase: 'error', message: action.message }
    case 'START': return state.phase === 'found' ? { ...state, audio: 'starting' } : state
    case 'PLAY': return state.phase === 'found' ? { ...state, audio: 'playing' } : state
    case 'PAUSE': return { ...state, audio: 'paused' }
  }
}
