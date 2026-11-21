import { beforeEach, describe, expect, it } from "vitest";
import { CONNECTION_ID } from "./fixtures";
import { clearConnectionPointer, loadConnectionPointer, saveConnectionPointer } from "./recovery";

const values = new Map<string, string>();
const storage = {
  getItem: (key: string) => values.get(key) ?? null,
  setItem: (key: string, value: string) => { values.set(key, value); },
  removeItem: (key: string) => { values.delete(key); },
};

beforeEach(() => values.clear());

describe("ponteiro web de conexão", () => {
  it("recupera a conexão confirmada depois de recriar o estado da tela", () => {
    saveConnectionPointer("usuario-a", CONNECTION_ID, storage);
    expect(loadConnectionPointer("usuario-a", storage)).toBe(CONNECTION_ID);
    expect([...values.values()][0]).not.toContain("token");
  });

  it("invalida o ponteiro quando a identidade muda", () => {
    saveConnectionPointer("usuario-a", CONNECTION_ID, storage);
    expect(loadConnectionPointer("usuario-b", storage)).toBeNull();
    expect(values.size).toBe(0);
  });

  it("apaga ponteiro inválido e não o consulta", () => {
    values.set("coinciente.connection", JSON.stringify({ owner: "usuario-a", connectionId: "../outro" }));
    expect(loadConnectionPointer("usuario-a", storage)).toBeNull();
    expect(values.size).toBe(0);
  });

  it("remove o ponteiro no logout", () => {
    saveConnectionPointer("usuario-a", CONNECTION_ID, storage);
    clearConnectionPointer(storage);
    expect(loadConnectionPointer("usuario-a", storage)).toBeNull();
  });
});
