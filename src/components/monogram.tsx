import { monogramInitials } from "@/lib/monogram";
import ui from "./ui.module.css";

/** Iniciais em quadrado neutro no lugar do logo. Decorativo: o nome sempre aparece ao lado. */
export function Monogram({ text }: { text: string }) {
  return (
    <span className={ui.monogram} aria-hidden>
      {monogramInitials(text)}
    </span>
  );
}
