import { describe, expect, it } from "vitest";
import { checkOfxFile, MAX_OFX_BYTES } from "./file-validation";

const ofx = { name: "extrato.ofx", type: "application/x-ofx", size: 2048 };

describe("checkOfxFile", () => {
  it("aceita um OFX dentro do limite, inclusive sem tipo informado", () => {
    expect(checkOfxFile(ofx)).toBeNull();
    expect(checkOfxFile({ ...ofx, type: "" })).toBeNull();
    expect(checkOfxFile({ ...ofx, size: MAX_OFX_BYTES })).toBeNull();
  });

  it("recusa arquivo vazio", () => {
    expect(checkOfxFile({ ...ofx, size: 0 })).toBe("empty");
  });

  it("recusa PDF pelo tipo ou pela extensão", () => {
    expect(checkOfxFile({ ...ofx, type: "application/pdf" })).toBe("pdf");
    expect(checkOfxFile({ ...ofx, name: "EXTRATO.PDF", type: "" })).toBe("pdf");
  });

  it("recusa acima de 4 MiB, o teto do web", () => {
    expect(MAX_OFX_BYTES).toBe(4 * 1024 * 1024);
    expect(checkOfxFile({ ...ofx, size: MAX_OFX_BYTES + 1 })).toBe("too_large");
  });
});
