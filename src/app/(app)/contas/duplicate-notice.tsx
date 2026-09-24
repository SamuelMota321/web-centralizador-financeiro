import { Notice, ui } from "@/components/ui";
import type { DuplicateCandidate } from "@/lib/accounts/types";

/** Contrato: conta manual equivalente a uma conectada exige confirmação explícita. */
export function DuplicateNotice({
  candidates,
  action,
  disabled,
}: {
  candidates: DuplicateCandidate[];
  action: string;
  disabled: boolean;
}) {
  return (
    <Notice
      tone="warning"
      className={ui.fullWidth}
      actions={
        // Reenvia o mesmo formulário com a confirmação exigida pelo contrato.
        <button
          className={`${ui.button} ${ui.secondary} ${ui.small}`}
          type="submit"
          name="confirmPossibleDuplicate"
          value="true"
          disabled={disabled}
        >
          {action}
        </button>
      }
    >
      <p>
        Já existe conta conectada com nome, tipo e instituição equivalentes. Confirme se esta
        conta manual deve existir separadamente.
      </p>
      <ul style={{ margin: "6px 0 0 18px", color: "var(--muted)" }}>
        {candidates.map((candidate) => (
          <li key={candidate.id}>
            {candidate.name}
            {candidate.institutionName ? ` · ${candidate.institutionName}` : ""}
          </li>
        ))}
      </ul>
    </Notice>
  );
}
