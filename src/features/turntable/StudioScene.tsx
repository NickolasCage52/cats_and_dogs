import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import { CanvasTexture } from 'three'
import type { Group, Mesh, PerspectiveCamera } from 'three'
import type { Species } from '../animal-detection/logic'
import { genres } from '../music/genres'
import type { GenreId } from '../music/genres'

function CameraRig() {
  const { camera, size } = useThree()
  useEffect(() => {
    const view = camera as PerspectiveCamera
    if (size.width < 500) { view.position.set(3.6, 3.5, 5.5); view.fov = 37 }
    else { view.position.set(3.7, 3.4, 5.5); view.fov = 34 }
    view.lookAt(0, 0, 0)
    view.updateProjectionMatrix()
  }, [camera, size.width])
  return null
}

function Player({ playing, color, reduced }: { playing: boolean; color: string; reduced: boolean }) {
  const record = useRef<Group>(null), arm = useRef<Group>(null), speed = useRef(0)
  const wood = useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = canvas.height = 256
    const ctx = canvas.getContext('2d')
    if (!ctx) return null
    ctx.fillStyle = '#c48d65'; ctx.fillRect(0, 0, 256, 256)
    for (let i = 0; i < 85; i++) {
      const y = (i * 31) % 256, drift = Math.sin(i * 3.7) * 8
      ctx.strokeStyle = i % 3 ? 'rgba(81,45,28,.075)' : 'rgba(255,225,178,.12)'
      ctx.lineWidth = i % 7 === 0 ? 2 : 0.7
      ctx.beginPath(); ctx.moveTo(0, y); ctx.bezierCurveTo(74, y + drift, 181, y - drift, 256, y + drift / 2); ctx.stroke()
    }
    return new CanvasTexture(canvas)
  }, [])
  useEffect(() => () => wood?.dispose(), [wood])
  useFrame((_, delta) => {
    const target = playing && !reduced ? Math.PI * 2 * 33.333 / 60 : 0
    speed.current += (target - speed.current) * Math.min(1, delta * 2.6)
    if (record.current) record.current.rotation.y += speed.current * delta
    if (arm.current) {
      const targetAngle = playing ? -0.38 : 0.16
      arm.current.rotation.y += (targetAngle - arm.current.rotation.y) * Math.min(1, delta * 3)
      arm.current.position.y += ((playing ? 0.36 : 0.39) - arm.current.position.y) * Math.min(1, delta * 3)
    }
  })
  return <group position={[-0.7, -0.44, 0]} rotation={[0, -0.16, 0]}>
    <mesh receiveShadow castShadow><boxGeometry args={[3.45, 0.24, 2.9]} /><meshStandardMaterial color="#8e5940" roughness={0.63} /></mesh>
    <mesh position={[0, 0.13, 0]} receiveShadow><boxGeometry args={[3.33, 0.035, 2.78]} /><meshStandardMaterial color="#ffffff" map={wood ?? undefined} roughness={0.69} /></mesh>
    <mesh position={[0, 0.154, -1.34]}><boxGeometry args={[3.25, 0.008, 0.015]} /><meshStandardMaterial color="#e1b786" metalness={0.45} roughness={0.45} /></mesh>
    <mesh position={[-1.6, 0.154, 0]}><boxGeometry args={[0.015, 0.008, 2.6]} /><meshStandardMaterial color="#e1b786" metalness={0.45} roughness={0.45} /></mesh>
    <mesh position={[-0.32, 0.16, 0]}><cylinderGeometry args={[1.13, 1.13, 0.06, 80]} /><meshStandardMaterial color="#65564a" metalness={0.48} roughness={0.4} /></mesh>
    <group ref={record} position={[-0.32, 0.205, 0]}>
      <mesh castShadow><cylinderGeometry args={[1.09, 1.09, 0.028, 96]} /><meshStandardMaterial color="#211e1e" metalness={0.26} roughness={0.25} /></mesh>
      {Array.from({ length: 12 }, (_, i) => <mesh key={i} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.019, 0]}>
        <torusGeometry args={[0.46 + i * 0.047, 0.003, 4, 96]} /><meshStandardMaterial color={i % 3 === 0 ? '#77716b' : '#4f4b49'} metalness={0.65} roughness={0.24} />
      </mesh>)}
      <mesh position={[0, 0.026, 0]}><cylinderGeometry args={[0.34, 0.34, 0.007, 64]} /><meshStandardMaterial color={color} roughness={0.55} /></mesh>
      <mesh position={[0, 0.042, 0]}><cylinderGeometry args={[0.026, 0.026, 0.06, 24]} /><meshStandardMaterial color="#e8d8b9" metalness={0.86} roughness={0.18} /></mesh>
    </group>
    <group ref={arm} position={[1.16, 0.39, -0.92]} rotation={[0, 0.16, 0]}>
      <mesh><cylinderGeometry args={[0.15, 0.15, 0.11, 32]} /><meshStandardMaterial color="#b8a88e" metalness={0.8} roughness={0.25} /></mesh>
      <mesh position={[-0.54, 0, 0.37]} rotation={[0, 0.97, Math.PI / 2]}><cylinderGeometry args={[0.025, 0.025, 1.31, 12]} /><meshStandardMaterial color="#e1d8c7" metalness={0.8} roughness={0.22} /></mesh>
      <mesh position={[-1.08, -0.02, 0.72]}><boxGeometry args={[0.25, 0.1, 0.18]} /><meshStandardMaterial color="#2c2726" metalness={0.25} /></mesh>
      <mesh position={[-1.08, -0.09, 0.72]}><coneGeometry args={[0.018, 0.07, 10]} /><meshStandardMaterial color="#d8c7af" metalness={0.8} /></mesh>
    </group>
    <mesh position={[1.27, 0.23, 0.9]}><cylinderGeometry args={[0.12, 0.12, 0.07, 32]} /><meshStandardMaterial color={playing ? '#e8c180' : '#4c3730'} metalness={0.5} /></mesh>
    <mesh position={[1.03, 0.19, 1.04]}><boxGeometry args={[0.28, 0.035, 0.06]} /><meshStandardMaterial color="#ead2a5" metalness={0.65} /></mesh>
  </group>
}

function Performer({ species, genre, playing, beat, reduced }: { species: Species; genre: GenreId; playing: boolean; beat: number; reduced: boolean }) {
  const character = useRef<Group>(null), paw = useRef<Group>(null), head = useRef<Group>(null), tail = useRef<Mesh>(null)
  const pulse = useRef(0)
  const dog = species === 'dog', instrument = genres[genre].instrument
  useEffect(() => { if (playing) pulse.current = 1 }, [beat, playing])
  useFrame(({ clock }, delta) => {
    const t = clock.elapsedTime, active = playing && !reduced
    pulse.current = Math.max(0, pulse.current - delta * 3)
    const accent = active ? pulse.current : 0
    if (character.current) {
      const target = active ? (beat % 2 ? -0.09 : 0.09) * accent : Math.sin(t * 0.7) * 0.015
      character.current.rotation.z += (target - character.current.rotation.z) * Math.min(1, delta * 6)
      character.current.position.y = 0.07 + (active ? accent * 0.085 : Math.sin(t) * 0.015)
    }
    if (paw.current) paw.current.rotation.x += ((active ? -0.2 - accent * 0.55 : -0.2) - paw.current.rotation.x) * Math.min(1, delta * 7)
    if (head.current) head.current.rotation.z += ((active ? (beat % 2 ? 0.09 : -0.09) * accent : 0) - head.current.rotation.z) * Math.min(1, delta * 5)
    if (tail.current) tail.current.rotation.z = active ? accent * 0.14 : Math.sin(t) * 0.05
  })
  const body = dog ? '#d9a06d' : '#d88950', inner = dog ? '#f8e8cb' : '#efb27d'
  return <group position={[1.48, -0.34, -0.12]} scale={0.72}>
    <mesh position={[0, -0.08, 0]} receiveShadow><cylinderGeometry args={[0.88, 0.96, 0.16, 40]} /><meshStandardMaterial color="#8b5a45" /></mesh>
    <group ref={character} position={[0, 0.07, 0]}>
      <mesh position={[0, 0.56, 0]} castShadow><sphereGeometry args={[0.42, 24, 16]} /><meshStandardMaterial color={body} roughness={0.85} /></mesh>
      <mesh position={[0, 0.54, 0.32]} scale={[0.66, 0.8, 0.2]}><sphereGeometry args={[0.38, 20, 12]} /><meshStandardMaterial color={inner} /></mesh>
      <group ref={head} position={[0, 1.2, 0.03]}>
        <mesh castShadow><sphereGeometry args={[0.45, 32, 20]} /><meshStandardMaterial color={body} roughness={0.82} /></mesh>
        {[-1, 1].map(side => <group key={side}>
          <mesh position={[side * 0.31, 0.35, 0]} rotation={[0, 0, side * -0.18]}><coneGeometry args={[dog ? 0.24 : 0.19, dog ? 0.55 : 0.38, 5]} /><meshStandardMaterial color={body} /></mesh>
          <mesh position={[side * 0.17, 0.045, 0.39]}><sphereGeometry args={[0.047, 12, 12]} /><meshStandardMaterial color="#302a28" /></mesh>
          <mesh position={[side * 0.18, 0.07, 0.427]}><sphereGeometry args={[0.014, 8, 8]} /><meshBasicMaterial color="#fff8ed" /></mesh>
        </group>)}
        <mesh position={[0, -0.17, 0.38]} scale={[0.51, 0.31, 0.26]}><sphereGeometry args={[0.35, 20, 12]} /><meshStandardMaterial color={inner} /></mesh>
        <mesh position={[0, -0.12, 0.56]}><sphereGeometry args={[0.045, 12, 12]} /><meshStandardMaterial color="#5b4035" /></mesh>
      </group>
      <mesh position={[-0.28, 0.07, 0.1]}><sphereGeometry args={[0.16, 12, 10]} /><meshStandardMaterial color={body} /></mesh>
      <mesh position={[0.28, 0.07, 0.1]}><sphereGeometry args={[0.16, 12, 10]} /><meshStandardMaterial color={body} /></mesh>
      <mesh ref={tail} position={[0.4, 0.49, -0.32]} rotation={[0, 0, -0.5]}><capsuleGeometry args={[0.09, 0.52, 5, 12]} /><meshStandardMaterial color={body} /></mesh>
      <group ref={paw} position={[0.35, 0.83, 0.33]}><mesh rotation={[0, 0, 0.5]}><capsuleGeometry args={[0.11, 0.39, 5, 12]} /><meshStandardMaterial color={body} /></mesh></group>
      <mesh position={[-0.36, 0.77, 0.37]} rotation={[0, 0, -0.55]}><capsuleGeometry args={[0.11, 0.36, 5, 12]} /><meshStandardMaterial color={body} /></mesh>
    </group>
    {instrument === 'guitar' || instrument === 'bass' ? <group position={[0.04, 0.52, 0.54]} rotation={[0, 0, -0.47]}>
      <mesh><sphereGeometry args={[0.25, 20, 12]} /><meshStandardMaterial color={instrument === 'bass' ? '#b7c08b' : '#c9885b'} metalness={0.15} /></mesh>
      <mesh position={[0, 0.47, 0]}><boxGeometry args={[0.12, 0.77, 0.07]} /><meshStandardMaterial color="#80583f" /></mesh>
      <mesh position={[0, 0.87, 0]}><boxGeometry args={[0.19, 0.2, 0.07]} /><meshStandardMaterial color="#bd9571" /></mesh>
      <mesh position={[0, 0, 0.22]}><cylinderGeometry args={[0.055, 0.055, 0.012, 20]} /><meshStandardMaterial color="#5e4038" /></mesh>
    </group> : <group position={[0, 0.34, 0.7]}>
      <mesh><boxGeometry args={[0.84, 0.15, 0.31]} /><meshStandardMaterial color={instrument === 'synth' ? '#62536c' : '#5f463c'} /></mesh>
      {Array.from({ length: 7 }, (_, i) => <mesh key={i} position={[-0.32 + i * 0.107, 0.09, 0]}><boxGeometry args={[0.075, 0.012, 0.23]} /><meshStandardMaterial color="#f1e7d4" /></mesh>)}
    </group>}
  </group>
}

export function StudioScene({ species, genre, playing, beat, reduced }: { species: Species; genre: GenreId; playing: boolean; beat: number; reduced: boolean }) {
  return <Canvas camera={{ position: [4.6, 4.3, 6.2], fov: 37 }} shadows dpr={[1, 1.6]} gl={{ antialias: true, powerPreference: 'low-power' }} fallback={<div className="scene-fallback" aria-hidden="true">3D недоступно — музыка и коллекция работают.</div>}>
    <CameraRig />
    <color attach="background" args={['#f4e6d3']} />
    <ambientLight intensity={1.25} />
    <directionalLight position={[3, 7, 5]} intensity={2.4} castShadow shadow-mapSize={[1024, 1024]} />
    <pointLight position={[-4, 3, -2]} intensity={1.5} color="#ffd6a5" />
    <mesh position={[0, -0.65, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow><planeGeometry args={[200, 200]} /><meshStandardMaterial color="#e2cfb5" roughness={0.9} /></mesh>
    <mesh position={[1.55, 0.7, -1.5]}><circleGeometry args={[1.42, 48]} /><meshStandardMaterial color="#d9bea1" roughness={1} /></mesh>
    <mesh position={[1.55, 0.7, -1.48]}><ringGeometry args={[1.46, 1.49, 48]} /><meshStandardMaterial color="#f5e9d8" roughness={1} /></mesh>
    <Player playing={playing} color={genres[genre].color} reduced={reduced} />
    <Performer species={species} genre={genre} playing={playing} beat={beat} reduced={reduced} />
  </Canvas>
}
