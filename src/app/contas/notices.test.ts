import { describe, expect, it } from "vitest";
import { isNoticeKey } from "./notices";

describe("isNoticeKey", () => {
  it.each(["conta-atualizada", "conta-desativada", "conta-indisponivel"])("aceita %s", (key) => {
    expect(isNoticeKey(key)).toBe(true);
  });

  it.each([["<script>"], ["__proto__"], ["toString"], [["conta-desativada"]], [undefined], [""]])(
    "recusa %j",
    (value) => {
      expect(isNoticeKey(value)).toBe(false);
    },
  );
});
