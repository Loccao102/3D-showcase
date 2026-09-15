"use client";

import { RoundedBox } from "@react-three/drei";

const wheelPositions: ReadonlyArray<readonly [number, number, number]> = [
  [-1.45, 0.48, 0.92],
  [1.45, 0.48, 0.92],
  [-1.45, 0.48, -0.92],
  [1.45, 0.48, -0.92],
];

export function AutomotivePrototype() {
  return (
    <group rotation={[0, -0.28, 0]} name="product-root">
      <RoundedBox
        name="body"
        args={[4.35, 0.62, 1.82]}
        radius={0.22}
        position={[0, 0.82, 0]}
        castShadow
        receiveShadow
      >
        <meshPhysicalMaterial
          name="body"
          color="#2b3038"
          metalness={0.72}
          roughness={0.2}
          clearcoat={0.9}
          clearcoatRoughness={0.12}
        />
      </RoundedBox>

      <RoundedBox
        name="cabin"
        args={[2.35, 0.68, 1.58]}
        radius={0.26}
        position={[-0.25, 1.36, 0]}
        castShadow
      >
        <meshPhysicalMaterial
          name="glass"
          color="#12171f"
          metalness={0.2}
          roughness={0.12}
          transmission={0.08}
        />
      </RoundedBox>

      <RoundedBox
        name="front-light"
        args={[0.12, 0.2, 1.45]}
        radius={0.05}
        position={[2.18, 0.9, 0]}
      >
        <meshStandardMaterial
          name="front-light-material"
          color="#f6f3dc"
          emissive="#fff6c5"
          emissiveIntensity={1.8}
        />
      </RoundedBox>

      <RoundedBox
        name="rear-light"
        args={[0.1, 0.18, 1.32]}
        radius={0.04}
        position={[-2.18, 0.88, 0]}
      >
        <meshStandardMaterial
          name="rear-light-material"
          color="#7c1218"
          emissive="#ef2636"
          emissiveIntensity={1.3}
        />
      </RoundedBox>

      {wheelPositions.map(([x, y, z], index) => (
        <group
          key={`${x}:${z}`}
          name={`wheel-${index + 1}`}
          position={[x, y, z]}
          rotation={[Math.PI / 2, 0, 0]}
        >
          <mesh castShadow name={`wheel-${index + 1}-tire`}>
            <cylinderGeometry args={[0.42, 0.42, 0.25, 32]} />
            <meshStandardMaterial
              name="tire"
              color="#111318"
              roughness={0.72}
              metalness={0.08}
            />
          </mesh>
          <mesh position={[0, 0.13, 0]} name={`wheel-${index + 1}-rim`}>
            <cylinderGeometry args={[0.24, 0.24, 0.018, 24]} />
            <meshStandardMaterial
              name="rim"
              color="#9da4ad"
              roughness={0.28}
              metalness={0.82}
            />
          </mesh>
        </group>
      ))}

      <group name="anchor:front-light" position={[2.1, 0.95, 0.7]} />
      <group name="anchor:cabin" position={[-0.2, 1.5, 0]} />
    </group>
  );
}
