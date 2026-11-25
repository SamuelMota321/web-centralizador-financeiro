"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef, useState } from "react";
import type { Group } from "three";
import { applyDrag, approach, isResting, type SpinState, stepInertia, tiltTarget } from "./piggy-motion";
import { type PiggyPalette, PiggyModel } from "./piggy-model";
import styles from "./piggy.module.css";

/** Ângulo de três quartos: é a pose parada, inclusive com movimento reduzido. */
const REST_YAW = -0.6;

function readPalette(): PiggyPalette {
  const style = getComputedStyle(document.documentElement);
  const token = (name: string, fallback: string) => style.getPropertyValue(name).trim() || fallback;
  return {
    // Cinza médio do tema: aparece no claro e no escuro; os detalhes no tom do texto.
    body: token("--muted", "#5f6966"),
    detail: token("--foreground", "#0f1413"),
    coin: token("--primary", "#087a55"),
  };
}

interface Pointer {
  active: boolean;
  id: number;
  x: number;
  y: number;
  t: number;
}

function Piggy({ reduced, palette }: { reduced: boolean; palette: PiggyPalette }) {
  const group = useRef<Group>(null);
  const spin = useRef<SpinState>({ yaw: REST_YAW, pitch: 0, velocity: 0 });
  const tilt = useRef({ x: 0, y: 0, targetX: 0, targetY: 0 });
  const pointer = useRef<Pointer>({ active: false, id: -1, x: 0, y: 0, t: 0 });
  const { gl, invalidate } = useThree();

  useEffect(() => {
    if (reduced) return;
    const canvas = gl.domElement;
    const fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

    const down = (event: PointerEvent) => {
      pointer.current = { active: true, id: event.pointerId, x: event.clientX, y: event.clientY, t: event.timeStamp };
      spin.current = { ...spin.current, velocity: 0 };
      canvas.setPointerCapture(event.pointerId);
      canvas.dataset.dragging = "true";
      invalidate();
    };
    const move = (event: PointerEvent) => {
      const p = pointer.current;
      if (p.active && event.pointerId === p.id) {
        const dt = Math.max((event.timeStamp - p.t) / 1000, 1 / 240);
        spin.current = applyDrag(spin.current, event.clientX - p.x, event.clientY - p.y, dt);
        pointer.current = { ...p, x: event.clientX, y: event.clientY, t: event.timeStamp };
        invalidate();
      }
    };
    const up = (event: PointerEvent) => {
      if (event.pointerId !== pointer.current.id) return;
      // Soltar depois de uma pausa não arremessa: a velocidade vale só para gesto em movimento.
      if (event.timeStamp - pointer.current.t > 80) spin.current = { ...spin.current, velocity: 0 };
      pointer.current = { ...pointer.current, active: false };
      delete canvas.dataset.dragging;
      invalidate();
    };
    // Parado, segue o cursor pela página toda; só com mouse de verdade.
    const look = (event: PointerEvent) => {
      if (!fine || pointer.current.active) return;
      const target = tiltTarget((event.clientX / window.innerWidth) * 2 - 1, (event.clientY / window.innerHeight) * 2 - 1);
      tilt.current.targetX = target.x;
      tilt.current.targetY = target.y;
      invalidate();
    };

    canvas.addEventListener("pointerdown", down);
    canvas.addEventListener("pointermove", move);
    canvas.addEventListener("pointerup", up);
    canvas.addEventListener("pointercancel", up);
    window.addEventListener("pointermove", look, { passive: true });
    return () => {
      canvas.removeEventListener("pointerdown", down);
      canvas.removeEventListener("pointermove", move);
      canvas.removeEventListener("pointerup", up);
      canvas.removeEventListener("pointercancel", up);
      window.removeEventListener("pointermove", look);
    };
  }, [gl, invalidate, reduced]);

  useFrame((_, delta) => {
    const node = group.current;
    if (!node) return;
    const dt = Math.min(delta, 1 / 20);
    if (!reduced && !pointer.current.active) spin.current = stepInertia(spin.current, dt);
    const t = tilt.current;
    t.x = approach(t.x, t.targetX, dt);
    t.y = approach(t.y, t.targetY, dt);
    node.rotation.set(spin.current.pitch + t.x, spin.current.yaw + t.y, 0);
    // Só pede o próximo quadro enquanto algo se move: parado, o canvas dorme.
    const tiltSettled = Math.abs(t.x - t.targetX) < 0.0005 && Math.abs(t.y - t.targetY) < 0.0005;
    if (pointer.current.active || !isResting(spin.current) || !tiltSettled) invalidate();
  });

  return (
    // Deslocado para a direita e para baixo: o rosto fica no espaço entre o título e a prévia,
    // não atrás do texto. O giro continua em torno do centro do porquinho.
    <group position={[0.45, -0.3, 0]}>
      <group ref={group} rotation={[0, REST_YAW, 0]}>
        <PiggyModel palette={palette} />
      </group>
    </group>
  );
}

/** Cena do porquinho. Renderiza só sob demanda; sem WebGL, não mostra nada. */
export default function PiggyScene() {
  const [reduced, setReduced] = useState(false);
  const [palette, setPalette] = useState<PiggyPalette | null>(null);

  useEffect(() => {
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const dark = window.matchMedia("(prefers-color-scheme: dark)");
    const update = () => {
      setReduced(motion.matches);
      setPalette(readPalette());
    };
    update();
    motion.addEventListener("change", update);
    dark.addEventListener("change", update);
    return () => {
      motion.removeEventListener("change", update);
      dark.removeEventListener("change", update);
    };
  }, []);

  if (!palette) return null;

  return (
    <div className={styles.layer} aria-hidden>
      <Canvas
        className={styles.canvas}
        frameloop="demand"
        dpr={[1, 2]}
        camera={{ position: [0, 1.1, 6.8], fov: 40 }}
        gl={{ antialias: true, alpha: true, powerPreference: "low-power" }}
        fallback={null}
      >
        {/* Luz suave e difusa, sem reflexos fortes: o cofrinho fica discreto no fundo. */}
        <hemisphereLight args={["#ffffff", "#5f6966", 1.2]} />
        <directionalLight position={[3, 5, 4]} intensity={1.3} />
        <directionalLight position={[-3, 2, -5]} intensity={0.5} />
        {/* Luz de contorno por trás e do alto: desenha o fio claro nas costas e na cabeça, sem
            subir até acender as patas por baixo. */}
        <directionalLight position={[-2, 6, -5]} intensity={1.2} color="#eef3f2" />
        <directionalLight position={[2.5, 5, -4]} intensity={0.6} color="#eef3f2" />
        <Piggy reduced={reduced} palette={palette} />
      </Canvas>
    </div>
  );
}
