import Link from "next/link";
import { IconRules } from "@/components/icons";
import { Disclosure, ui } from "@/components/ui";
import { RULE_PACK, rulePackSize } from "@/lib/categories/suggestions";
import { RulePackButton } from "./rule-pack-button";
import styles from "./regras.module.css";

/**
 * Pacote de regras sugeridas: fica recolhido para não poluir a lista. Aberto, mostra cada
 * regra que seria criada; nada é criado sem o botão.
 */
export function RulePack({ hasActiveCategories }: { hasActiveCategories: boolean }) {
  return (
    <Disclosure icon={<IconRules size={18} />} summary={`Pacote de regras sugeridas · ${rulePackSize()} regras`}>
      <p>
        Regras do tipo “a descrição contém” para termos comuns. Só são criadas as que faltam e só para
        categorias ativas com o mesmo nome. Valem para as próximas movimentações; depois você pode editar,
        desativar ou remover cada uma.
      </p>
      <dl className={styles.pack}>
        {RULE_PACK.map((group) => (
          <div key={group.category} className={styles.packGroup}>
            <dt className={styles.packCategory}>{group.category}</dt>
            <dd className={styles.packValues}>{group.values.map((value) => `“${value}”`).join(", ")}</dd>
          </div>
        ))}
      </dl>
      {hasActiveCategories ? (
        <RulePackButton />
      ) : (
        <p>
          Crie as categorias primeiro.{" "}
          <Link className={ui.inlineLink} href="/categorias">
            Usar as categorias sugeridas
          </Link>
        </p>
      )}
    </Disclosure>
  );
}
