"use client";

import { useMemo } from "react";
import * as THREE from "three";
import { mergeVertices } from "three/examples/jsm/utils/BufferGeometryUtils.js";

/** Cores vindas dos tokens do tema (claro e escuro): corpo, detalhes e a moeda verde. */
export interface PiggyPalette {
  body: string;
  detail: string;
  coin: string;
}

/** Escurece a cor do corpo em relação ao token, para o cofrinho ficar mais sóbrio no fundo. */
const BODY_SHADE = 0.75;
function shade(color: string): THREE.Color {
  return new THREE.Color(color).multiplyScalar(BODY_SHADE);
}

/** Quantidade de frisos na borda serrilhada da moeda. */
const COIN_REEDS = 56;

/**
 * Leva um ponto da esfera unitária para a superfície do corpo: pera deitada, mais cheia
 * atrás e na barriga, um pouco mais estreita na frente, com a base achatada para sentar nas
 * patas e a frente subindo de leve em direção à cabeça.
 */
function deformBody(ux: number, uy: number, uz: number): THREE.Vector3 {
  const girth = ux < 0 ? 1 + 0.1 * -ux : 1 - 0.06 * ux;
  let y = uy * 1.08 * girth * (uy < 0 ? 1.04 : 1);
  const z = uz * 1.12 * girth;
  const floor = -0.88;
  if (y < floor) y = floor + (y - floor) * 0.35;
  y += 0.07 * Math.max(ux, 0) ** 2;
  return new THREE.Vector3(ux * 1.28, y, z);
}

/** Geometria do corpo: esfera deformada, com vértices da emenda unidos para não marcar linha. */
function bodyGeometry(): THREE.BufferGeometry {
  const sphere = new THREE.SphereGeometry(1, 96, 64);
  const position = sphere.getAttribute("position");
  for (let i = 0; i < position.count; i += 1) {
    const point = deformBody(position.getX(i), position.getY(i), position.getZ(i));
    position.setXYZ(i, point.x, point.y, point.z);
  }
  sphere.deleteAttribute("normal");
  sphere.deleteAttribute("uv");
  const merged = mergeVertices(sphere);
  merged.computeVertexNormals();
  return merged;
}

/** Ponto da frente do corpo pela direção na esfera unitária (`uy` altura, `uz` lateral). */
function bodyPoint(uy: number, uz: number): THREE.Vector3 {
  return deformBody(Math.sqrt(Math.max(0, 1 - uy * uy - uz * uz)), uy, uz);
}

/**
 * Posição na superfície deformada e a rotação que deixa o eixo X local apontando para fora
 * dela, calculada pelas tangentes; usada para encostar olhos e bochechas no corpo.
 */
function onBody(uy: number, uz: number, lift = 0): { position: THREE.Vector3; quaternion: THREE.Quaternion } {
  const e = 0.01;
  const tangentY = bodyPoint(uy + e, uz).sub(bodyPoint(uy - e, uz));
  const tangentZ = bodyPoint(uy, uz + e).sub(bodyPoint(uy, uz - e));
  const normal = new THREE.Vector3().crossVectors(tangentY, tangentZ).normalize();
  if (normal.x < 0) normal.negate();
  const position = bodyPoint(uy, uz).addScaledVector(normal, lift);
  return { position, quaternion: new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(1, 0, 0), normal) };
}

/** Altura do topo da pata, em relação ao centro dela: fica escondido dentro do corpo. */
const LEG_TOP = 0.5;

/**
 * Perfil da pata: larga em cima, afinando até um pé arredondado. A lateral é uma curva
 * contínua (spline), sem quinas que acendam faixas de luz.
 */
function legProfile(): THREE.Vector2[] {
  const side = new THREE.SplineCurve(
    [
      [0.12, -0.16],
      [0.165, -0.13],
      [0.182, -0.07],
      [0.195, 0.03],
      [0.212, 0.13],
      [0.222, 0.22],
    ].map(([x, y]) => new THREE.Vector2(x, y)),
  );
  // O topo sobe bem para dentro do corpo: a barriga é curva e, sem isso, a borda de fora da
  // pata ficava abaixo da superfície e aparecia um degrau.
  return [
    new THREE.Vector2(0, -0.16),
    ...side.getPoints(32),
    new THREE.Vector2(0.222, LEG_TOP),
    new THREE.Vector2(0, LEG_TOP),
  ];
}

/** Perfil de um disco de bordas arredondadas (focinho), girado em torno do eixo Y. */
function roundedDiscProfile(radius: number, depth: number, bevel: number): THREE.Vector2[] {
  const points: THREE.Vector2[] = [new THREE.Vector2(0, -depth / 2)];
  const steps = 8;
  for (let i = 0; i <= steps; i += 1) {
    const a = -Math.PI / 2 + (i / steps) * (Math.PI / 2);
    points.push(new THREE.Vector2(radius - bevel + Math.cos(a) * bevel, -depth / 2 + bevel + Math.sin(a) * bevel));
  }
  for (let i = 0; i <= steps; i += 1) {
    const a = (i / steps) * (Math.PI / 2);
    points.push(new THREE.Vector2(radius - bevel + Math.cos(a) * bevel, depth / 2 - bevel + Math.sin(a) * bevel));
  }
  points.push(new THREE.Vector2(0, depth / 2));
  return points;
}

/**
 * Perfil da orelha: base larga, laterais que afinam devagar e ponta arredondada. Girado e
 * achatado, vira um triângulo macio, em vez do cone pontudo que parecia chifre.
 */
function earProfile(): THREE.Vector2[] {
  return [
    [0, 0],
    [0.25, 0],
    [0.235, 0.06],
    [0.19, 0.13],
    [0.13, 0.2],
    [0.075, 0.25],
    [0.035, 0.275],
    [0, 0.285],
  ].map(([x, y]) => new THREE.Vector2(x, y));
}

/** Curva do rabinho: espiral curta saindo das costas. */
function tailCurve(): THREE.CatmullRomCurve3 {
  const points: THREE.Vector3[] = [];
  for (let i = 0; i <= 24; i += 1) {
    const t = i / 24;
    const angle = t * Math.PI * 3;
    const radius = 0.11 * (1 - t * 0.45);
    points.push(new THREE.Vector3(-t * 0.22, Math.sin(angle) * radius + t * 0.1, Math.cos(angle) * radius - radius));
  }
  return new THREE.CatmullRomCurve3(points);
}

/**
 * Cofrinho no formato clássico de cerâmica, montado com formas simples, sem arquivo de
 * modelo: corpo em pera deitada, rosto com focinho grande e chato, olhos pequenos com brilho, bochechas
 * discretas, orelhas macias dobradas para a frente, patas curtas e cônicas e a fenda com a
 * moeda. Acabamento fosco, sem brilho de esmalte, para não chamar atenção.
 */
export function PiggyModel({ palette }: { palette: PiggyPalette }) {
  const materials = useMemo(() => {
    const matte = (color: string | THREE.Color, roughness = 0.72) => new THREE.MeshStandardMaterial({ color, roughness, metalness: 0 });
    return {
      body: matte(shade(palette.body)),
      snout: matte(shade(palette.body)),
      // Narina é buraco: bem mais escura que o focinho, igual no tema claro e no escuro.
      nostril: matte(new THREE.Color(palette.body).multiplyScalar(BODY_SHADE * 0.35), 0.95),
      eye: matte(palette.detail, 0.35),
      // Rasgo da fenda: escuro como um buraco, igual no tema claro e no escuro.
      slot: matte(new THREE.Color(palette.body).multiplyScalar(BODY_SHADE * 0.25), 0.95),
      // Olho de desenho: íris sempre escura e um brilho branco, iguais no tema claro e no escuro.
      iris: new THREE.MeshStandardMaterial({ color: "#121616", roughness: 0.25, metalness: 0 }),
      sparkle: new THREE.MeshStandardMaterial({ color: "#ffffff", emissive: "#ffffff", emissiveIntensity: 0.6, roughness: 0.2 }),
      // Bochecha um tom acima do corpo: relevo suave, sem cor nova.
      cheek: matte(new THREE.Color(palette.body).multiplyScalar(BODY_SHADE * 1.06), 0.7),
      coin: new THREE.MeshStandardMaterial({ color: palette.coin, roughness: 0.4, metalness: 0.3 }),
    };
  }, [palette.body, palette.detail, palette.coin]);

  const geometries = useMemo(
    () => ({
      snout: new THREE.LatheGeometry(roundedDiscProfile(0.41, 0.28, 0.13), 56),
      tail: new THREE.TubeGeometry(tailCurve(), 64, 0.032, 10, false),
      ear: new THREE.LatheGeometry(earProfile(), 40),
      body: bodyGeometry(),
      leg: new THREE.LatheGeometry(legProfile(), 40),
      coinRim: new THREE.TorusGeometry(0.212, 0.012, 10, 64),
      coinRing: new THREE.TorusGeometry(0.15, 0.005, 8, 56),
      coinMark: new THREE.TorusGeometry(0.075, 0.016, 10, 40, Math.PI * 1.5),
    }),
    [],
  );

  const legs: [number, number][] = [
    [0.62, 0.48],
    [0.62, -0.48],
    [-0.62, 0.48],
    [-0.62, -0.48],
  ];

  return (
    <group position={[0, 0.12, 0]}>
      {/* Corpo em pera deitada */}
      <mesh geometry={geometries.body} material={materials.body} />
      {/* Focinho grande e chato: mais curto e com borda bem arredondada, para sair do rosto
          sem parecer uma tampa colada nem formar um colar em volta */}
      <mesh geometry={geometries.snout} material={materials.snout} position={[1.24, -0.12, 0]} rotation={[0, 0, -Math.PI / 2]} />
      {[0.14, -0.14].map((z) => (
        <mesh key={`nostril-${z}`} material={materials.nostril} position={[1.375, -0.12, z]} scale={[0.028, 0.1, 0.065]}>
          <sphereGeometry args={[1, 20, 14]} />
        </mesh>
      ))}
      {/* Olhos pequenos e redondos, encostados no rosto, com um pontinho de brilho */}
      {[0.38, -0.38].map((z) => {
        const eye = onBody(0.333, z > 0 ? 0.339 : -0.339, 0.004);
        return (
          <group key={`eye-${z}`} position={eye.position} quaternion={eye.quaternion}>
            <mesh material={materials.iris} scale={[0.03, 0.062, 0.062]}>
              <sphereGeometry args={[1, 24, 18]} />
            </mesh>
            <mesh material={materials.sparkle} position={[0.024, 0.02, 0]}>
              <sphereGeometry args={[0.011, 12, 10]} />
            </mesh>
          </group>
        );
      })}
      {/* Bochechas: relevo bem discreto ao lado do focinho, quase no tom do corpo */}
      {[0.6, -0.6].map((z) => {
        const cheek = onBody(-0.074, z > 0 ? 0.536 : -0.536, -0.045);
        return (
          <mesh key={`cheek-${z}`} material={materials.cheek} position={cheek.position} quaternion={cheek.quaternion} scale={[0.06, 0.1, 0.13]}>
            <sphereGeometry args={[1, 28, 20]} />
          </mesh>
        );
      })}
      {/* Orelhas baixas e largas, de ponta arredondada, inclinadas para a frente e um pouco
          para fora. A base fica afundada no corpo para não aparecer emenda. */}
      {[0.5, -0.5].map((z) => (
        <mesh
          key={`ear-${z}`}
          geometry={geometries.ear}
          material={materials.body}
          position={[0.6, 0.79, z]}
          rotation={[z > 0 ? 0.4 : -0.4, 0, -0.6]}
          scale={[1, 1, 0.42]}
        />
      ))}
      {/* Patas curtas e cônicas, afundadas na barriga e levemente abertas */}
      {legs.map(([x, z]) => (
        <mesh
          key={`leg-${x}-${z}`}
          geometry={geometries.leg}
          material={materials.body}
          position={[x, -0.95, z]}
          rotation={[z > 0 ? -0.12 : 0.12, 0, x > 0 ? 0.08 : -0.08]}
        />
      ))}
      {/* Rabinho enrolado */}
      <mesh geometry={geometries.tail} material={materials.body} position={[-1.27, 0.18, 0]} />
      {/* Fenda no alto: borda baixa, quase rente ao corpo, no tom do corpo e o rasgo escuro sobre ela.
          A cápsula deitada tem o comprimento no eixo X do mundo; a escala achata só a altura (X local) e a largura (Z). */}
      <mesh material={materials.body} position={[-0.05, 1.06, 0]} rotation={[0, 0, Math.PI / 2]} scale={[0.35, 1, 1.15]}>
        <capsuleGeometry args={[0.11, 0.6, 8, 24]} />
      </mesh>
      {/* Rasgo mais largo que a moeda: ela aparece entrando, com folga dos dois lados */}
      <mesh material={materials.slot} position={[-0.05, 1.085, 0]} rotation={[0, 0, Math.PI / 2]} scale={[0.4, 1, 1]}>
        <capsuleGeometry args={[0.065, 0.56, 8, 20]} />
      </mesh>
      {/* Moeda sobre a fenda, com acabamento de moeda cunhada: borda serrilhada, aro em
          relevo, um anel fino e o "C" da marca nas duas faces. O verde da marca como sinal. */}
      {/* Acima da fenda, com um respiro e inclinada ~15°, como se escorregasse para dentro dela. */}
      <group position={[-0.05, 1.43, 0]} rotation={[0, 0, -0.26]}>
      <group rotation={[Math.PI / 2, 0, 0]}>
        <mesh material={materials.coin}>
          <cylinderGeometry args={[0.23, 0.23, 0.04, 64]} />
        </mesh>
        {/* Serrilha da borda */}
        {Array.from({ length: COIN_REEDS }, (_, index) => {
          const angle = (index / COIN_REEDS) * Math.PI * 2;
          return (
            <mesh
              key={`reed-${index}`}
              material={materials.coin}
              position={[Math.cos(angle) * 0.232, 0, Math.sin(angle) * 0.232]}
              rotation={[0, -angle, 0]}
            >
              <boxGeometry args={[0.008, 0.036, 0.012]} />
            </mesh>
          );
        })}
        {[0.021, -0.021].map((y) => (
          <group key={`face-${y}`} position={[0, y, 0]}>
            {/* Aro e anel em relevo */}
            <mesh geometry={geometries.coinRim} material={materials.coin} rotation={[Math.PI / 2, 0, 0]} />
            <mesh geometry={geometries.coinRing} material={materials.coin} rotation={[Math.PI / 2, 0, 0]} />
            {/* "C" da marca, aberto para a direita em cada face */}
            <mesh
              geometry={geometries.coinMark}
              material={materials.coin}
              rotation={[Math.PI / 2, 0, y > 0 ? Math.PI / 4 : -Math.PI - Math.PI / 4]}
            />
          </group>
        ))}
      </group>
      </group>
    </group>
  );
}
