import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// O servidor só pode renderizar componentes de um módulo "use client", nunca chamar suas
// funções (a página cai em execução). O Vitest não aplica essa fronteira, então ela é
// conferida aqui: o que o código de servidor importa de um módulo de cliente começa com
// maiúscula (componente) ou é só tipo.

const dir = __dirname;
const files = readdirSync(dir).filter((name) => /\.(ts|tsx)$/.test(name) && !name.includes(".test."));
const isClient = (name: string) => /^\s*["']use client["']/.test(readFileSync(join(dir, name), "utf8"));
const clientModules = new Set(files.filter(isClient).map((name) => name.replace(/\.tsx?$/, "")));

describe("fronteira servidor/cliente da Visão geral", () => {
  for (const file of files.filter((name) => !isClient(name))) {
    it(`${file} só importa componentes de módulos de cliente`, () => {
      const source = readFileSync(join(dir, file), "utf8");
      const imports = source.matchAll(/import\s+(type\s+)?\{([^}]*)\}\s+from\s+["']\.\/([\w-]+)["']/g);
      for (const [, typeOnly, names, module] of imports) {
        if (typeOnly || !clientModules.has(module)) continue;
        for (const raw of names.split(",")) {
          const name = raw.trim();
          if (!name || name.startsWith("type ")) continue;
          expect(name, `${file} importa ${name} de ${module}`).toMatch(/^[A-Z]/);
        }
      }
    });
  }
});
