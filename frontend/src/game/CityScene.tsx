import { useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Sky, Stars } from '@react-three/drei';
import * as THREE from 'three';
import {
  useCity,
  blockToWorld,
  BLOCK,
  ROAD,
  GRID,
  PITCH,
  DISTRICT_COLORS,
  type Building,
  type District,
  type Meteor as MeteorT,
} from './store';

// ---------- shared window texture ----------
let winTex: THREE.CanvasTexture | null = null;
function windowsTexture(): THREE.CanvasTexture {
  if (winTex) return winTex;
  const c = document.createElement('canvas');
  c.width = 64;
  c.height = 128;
  const g = c.getContext('2d')!;
  g.fillStyle = '#000000';
  g.fillRect(0, 0, 64, 128);
  for (let y = 5; y < 122; y += 9) {
    for (let x = 5; x < 58; x += 9) {
      if (Math.random() < 0.5) {
        g.fillStyle = Math.random() < 0.82 ? '#ffd27a' : '#9adcff';
        g.fillRect(x, y, 5, 5);
      }
    }
  }
  winTex = new THREE.CanvasTexture(c);
  winTex.colorSpace = THREE.SRGBColorSpace;
  return winTex;
}

const matCache = new Map<District, THREE.MeshStandardMaterial>();
function districtMat(d: District): THREE.MeshStandardMaterial {  let m = matCache.get(d);
  if (!m) {
    m = new THREE.MeshStandardMaterial({
      color: DISTRICT_COLORS[d],
      roughness: 0.85,
      metalness: 0.08,
      emissive: 0xffffff,
      emissiveMap: windowsTexture(),
      emissiveIntensity: 0.7,
    });
    matCache.set(d, m);
  }
  return m;
}

export function setWindowGlow(v: number) {
  matCache.forEach((m) => {
    m.emissiveIntensity = v;
  });
}

// ---------- ground & roads ----------
function Ground() {
  const size = GRID * PITCH + ROAD * 3;
  return (
    <mesh rotation-x={-Math.PI / 2} position={[0, -0.06, 0]} receiveShadow>
      <planeGeometry args={[size, size]} />
      <meshStandardMaterial color="#1c2a20" roughness={1} />
    </mesh>
  );
}

function Roads() {
  const strips = useMemo(() => {
    const arr: Array<{ x: number; z: number; w: number; d: number }> = [];
    const start = blockToWorld(0) - BLOCK / 2 - ROAD / 2;
    const len = GRID * PITCH + ROAD;
    for (let i = 0; i <= GRID; i++) {
      const c = start + i * PITCH;
      arr.push({ x: c, z: 0, w: ROAD, d: len });
      arr.push({ x: 0, z: c, w: len, d: ROAD });
    }
    return arr;
  }, []);
  return (
    <group>
      {strips.map((s, i) => (
        <mesh key={i} rotation-x={-Math.PI / 2} position={[s.x, 0, s.z]} receiveShadow>
          <planeGeometry args={[s.w, s.d]} />
          <meshStandardMaterial color="#2b3140" roughness={0.95} />
        </mesh>
      ))}
    </group>
  );
}

// ---------- buildings ----------
function BuildingMesh({ b }: { b: Building }) {
  const ref = useRef<THREE.Group>(null);
  useFrame(() => {
    if (!ref.current) return;
    const t = Math.min(1, (performance.now() / 1000 - b.born) * 2.4);
    const s = 1 - Math.pow(1 - t, 3);
    ref.current.scale.set(1, Math.max(0.001, s), 1);
  });
  const x = blockToWorld(b.bx);
  const z = blockToWorld(b.bz);
  return (
    <group ref={ref} position={[x, 0, z]}>
      <mesh castShadow position={[0, b.h / 2, 0]} material={districtMat(b.district)}>
        <boxGeometry args={[b.w, b.h, b.d]} />
      </mesh>
      <mesh castShadow position={[0, b.h + 0.18, 0]}>
        <boxGeometry args={[b.w + 0.5, 0.36, b.d + 0.5]} />
        <meshStandardMaterial color="#252c3d" roughness={0.9} />
      </mesh>
      {b.health < 70 && <DamageBeacon y={b.h + 1.4} />}
    </group>
  );
}

function DamageBeacon({ y }: { y: number }) {
  const mat = useRef<THREE.MeshStandardMaterial>(null);
  useFrame(({ clock }) => {
    if (mat.current) {
      mat.current.emissiveIntensity = 1.5 + 2.5 * (0.5 + 0.5 * Math.sin(clock.elapsedTime * 7));
    }
  });
  return (
    <mesh position={[0, y, 0]}>
      <sphereGeometry args={[0.55, 12, 12]} />
      <meshStandardMaterial ref={mat} color="#ff2222" emissive="#ff2222" emissiveIntensity={2} />
      <pointLight color="#ff3333" intensity={10} distance={14} />
    </mesh>
  );
}

function Buildings() {
  const buildings = useCity((s) => s.buildings);
  return (
    <group>
      {buildings.map((b) => (
        <BuildingMesh key={b.id} b={b} />
      ))}
    </group>
  );
}

// ---------- request cars ----------
const CAR_COLORS = ['#ffd27a', '#9adcff', '#ff8a8a', '#f2f2f2', '#b6ff9e'];

interface CarSpec {
  id: number;
  x0: number;
  x1: number;
  z0: number;
  z1: number;
  per: number;
  s: number;
  speed: number;
  color: string;
}

function CarMesh({ spec }: { spec: CarSpec }) {
  const ref = useRef<THREE.Group>(null);
  const s = useRef(spec.s);
  useFrame((_, dt) => {
    const g = ref.current;
    if (!g) return;
    const load = Math.min(1, useCity.getState().buildings.length / 28);
    s.current += spec.speed * (1 - 0.5 * load) * dt;
    if (s.current >= spec.per) {
      s.current -= spec.per;
      useCity.getState().serve(1 + Math.floor(Math.random() * 3));
    }
    const { x0, x1, z0, z1 } = spec;
    const w = x1 - x0;
    const h = z1 - z0;
    let x = x0;
    let z = z0;
    let dx = 1;
    let dz = 0;
    let d = s.current;
    if (d < w) {
      x = x0 + d;
    } else if (d < w + h) {
      x = x1;
      z = z0 + (d - w);
      dx = 0;
      dz = 1;
    } else if (d < 2 * w + h) {
      x = x1 - (d - w - h);
      z = z1;
      dx = -1;
      dz = 0;
    } else {
      x = x0;
      z = z1 - (d - 2 * w - h);
      dx = 0;
      dz = -1;
    }
    g.position.set(x, 0.45, z);
    g.rotation.y = Math.atan2(dx, dz);
  });
  return (
    <group ref={ref}>
      <mesh castShadow>
        <boxGeometry args={[1.1, 0.7, 2.4]} />
        <meshStandardMaterial color={spec.color} roughness={0.4} metalness={0.3} emissive={spec.color} emissiveIntensity={0.25} />
      </mesh>
    </group>
  );
}

function Cars() {
  const cars = useMemo<CarSpec[]>(() => {
    const arr: CarSpec[] = [];
    for (let i = 0; i < 16; i++) {
      const cx = Math.floor(Math.random() * GRID);
      const cz = Math.floor(Math.random() * GRID);
      const x0 = blockToWorld(cx) - PITCH / 2;
      const x1 = blockToWorld(cx) + PITCH / 2;
      const z0 = blockToWorld(cz) - PITCH / 2;
      const z1 = blockToWorld(cz) + PITCH / 2;
      const per = 4 * PITCH;
      arr.push({
        id: i,
        x0,
        x1,
        z0,
        z1,
        per,
        s: Math.random() * per,
        speed: 6 + Math.random() * 5,
        color: CAR_COLORS[i % CAR_COLORS.length],
      });
    }
    return arr;
  }, []);
  return (
    <group>
      {cars.map((c) => (
        <CarMesh key={c.id} spec={c} />
      ))}
    </group>
  );
}

// ---------- meteors ----------
function MeteorMesh({ m }: { m: MeteorT }) {
  const ref = useRef<THREE.Mesh>(null);
  const y = useRef(m.y);
  const done = useRef(false);
  useFrame((_, dt) => {
    y.current -= dt * 60;
    if (ref.current) ref.current.position.set(m.x, y.current, m.z);
    if (y.current <= 5 && !done.current) {
      done.current = true;
      useCity.getState().impact(m);
    }
  });
  return (
    <mesh ref={ref} position={[m.x, m.y, m.z]}>
      <sphereGeometry args={[1.3, 16, 16]} />
      <meshStandardMaterial color="#ff7a2a" emissive="#ff5a00" emissiveIntensity={2.4} />
      <pointLight color="#ff8a3d" intensity={60} distance={26} />
    </mesh>
  );
}

function Meteors() {
  const meteors = useCity((s) => s.meteors);
  return (
    <group>
      {meteors.map((m) => (
        <MeteorMesh key={m.id} m={m} />
      ))}
    </group>
  );
}

// ---------- explosion particles ----------
const BOOM_COUNT = 70;

function BoomBurst({ x, y, z, onDone }: { x: number; y: number; z: number; onDone: () => void }) {
  const ref = useRef<THREE.Points>(null);
  const mat = useRef<THREE.PointsMaterial>(null);
  const { pos, vel } = useMemo(() => {
    const pos = new Float32Array(BOOM_COUNT * 3);
    const vel = new Float32Array(BOOM_COUNT * 3);
    for (let i = 0; i < BOOM_COUNT; i++) {
      pos[i * 3] = x;
      pos[i * 3 + 1] = y + Math.random() * 2;
      pos[i * 3 + 2] = z;
      const a = Math.random() * Math.PI * 2;
      const sp = 6 + Math.random() * 14;
      vel[i * 3] = Math.cos(a) * sp;
      vel[i * 3 + 1] = 8 + Math.random() * 16;
      vel[i * 3 + 2] = Math.sin(a) * sp;
    }
    return { pos, vel };
  }, [x, y, z]);
  const life = useRef(0);
  const done = useRef(false);
  useFrame((_, dt) => {
    life.current += dt;
    const p = ref.current;
    if (!p) return;
    const arr = (p.geometry.getAttribute('position') as THREE.BufferAttribute).array as Float32Array;
    for (let i = 0; i < BOOM_COUNT; i++) {
      arr[i * 3] += vel[i * 3] * dt;
      arr[i * 3 + 1] += vel[i * 3 + 1] * dt;
      arr[i * 3 + 2] += vel[i * 3 + 2] * dt;
      vel[i * 3 + 1] -= 26 * dt;
      if (arr[i * 3 + 1] < 0.2) arr[i * 3 + 1] = 0.2;
    }
    p.geometry.getAttribute('position').needsUpdate = true;
    if (mat.current) mat.current.opacity = Math.max(0, 1 - life.current / 1.5);
    if (life.current > 1.5 && !done.current) {
      done.current = true;
      onDone();
    }
  });
  return (
    <points ref={ref} position={[0, 0, 0]}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[pos, 3]} />
      </bufferGeometry>
      <pointsMaterial ref={mat} size={1.1} color="#ffb347" transparent depthWrite={false} />
    </points>
  );
}

function Booms() {
  const booms = useCity((s) => s.booms);
  const removeBoom = useCity((s) => s.removeBoom);
  return (
    <group>
      {booms.map((b) => (
        <BoomBurst key={b.id} x={b.x} y={b.y} z={b.z} onDone={() => removeBoom(b.id)} />
      ))}
    </group>
  );
}

// ---------- day/night sun rig ----------
function SunRig() {
  const time = useCity((s) => s.time);
  const ang = ((time - 6) / 12) * Math.PI;
  const el = Math.sin(ang);
  const dayness = THREE.MathUtils.smoothstep(el, -0.08, 0.3);
  const sunPos = useMemo<[number, number, number]>(
    () => [Math.cos(ang) * 130, Math.max(6, el * 120), 45],
    [ang, el],
  );
  useFrame(() => {
    setWindowGlow(1.35 - dayness * 0.95);
  });
  return (
    <>
      <ambientLight intensity={0.16 + dayness * 0.3} />
      <directionalLight
        castShadow
        position={sunPos}
        intensity={0.1 + dayness * 1.7}
        color={el > 0.3 ? '#ffd9a0' : '#ff9a5a'}
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-75}
        shadow-camera-right={75}
        shadow-camera-top={75}
        shadow-camera-bottom={-75}
        shadow-camera-near={10}
        shadow-camera-far={350}
      />
      <Sky sunPosition={sunPos} turbidity={7} rayleigh={2.2} />
    </>
  );
}

// ---------- economy + sim ticker ----------
function SimTicker() {
  const acc = useRef(0);
  useFrame((_, dt) => {
    acc.current += dt;
    if (acc.current >= 0.5) {
      const st = useCity.getState();
      st.tickSim(acc.current);
      st.tickBill(Math.round(st.buildings.length * acc.current * 2));
      acc.current = 0;
    }
  });
  return null;
}

// ---------- scene ----------
export function CityScene() {
  return (
    <>
      <color attach="background" args={['#0e152e']} />
      <fog attach="fog" args={['#0e152e', 110, 260]} />
      <SunRig />
      <Stars radius={280} depth={60} count={2200} factor={4} fade speed={0.6} />
      <Ground />
      <Roads />
      <Buildings />
      <Cars />
      <Meteors />
      <Booms />
      <SimTicker />
      <OrbitControls
        makeDefault
        target={[0, 3, 0]}
        maxPolarAngle={1.42}
        minDistance={25}
        maxDistance={190}
        enableDamping
      />
    </>
  );
}

export function CityCanvas() {
  return (
    <Canvas shadows dpr={[1, 2]} camera={{ position: [46, 40, 46], fov: 45 }}>
      <CityScene />
    </Canvas>
  );
}
