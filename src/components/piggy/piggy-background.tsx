"use client";

import dynamic from "next/dynamic";

// Three.js só no navegador e só nesta página, carregado depois da primeira pintura.
const PiggyScene = dynamic(() => import("./piggy-scene"), { ssr: false, loading: () => null });

/** Porquinho 3D decorativo no fundo da página inicial. */
export function PiggyBackground() {
  return <PiggyScene />;
}
