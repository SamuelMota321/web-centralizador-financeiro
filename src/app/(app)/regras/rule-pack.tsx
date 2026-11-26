import Link from "next/link";
import { IconRules } from "@/components/icons";
import { Disclosure, ui } from "@/components/ui";
import type { CategoryRule } from "@/lib/category-rules/types";
import { RULE_PACK, rulePackSize, type SuggestedRuleGroup } from "@/lib/categories/suggestions";
import { RuleItem } from "./rule-item";
import { RulePackButton } from "./rule-pack-button";
import type { CategoryOption, NamedOption } from "./rule-logic";
import styles from "./regras.module.css";

/**
 * Regras sugeridas num único grupo recolhido, para não poluir a lista. Dentro: o botão que
 * adiciona as que faltam e as já adicionadas, por categoria, com as mesmas ações das demais.
 * Antes de adicionar, mostra o que o pacote cria.
 */
export function RulePack({
  hasActiveCategories,
  groups,
  count,
  missing,
  categories,
  accounts,
}: {
  hasActiveCategories: boolean;
  groups: SuggestedRuleGroup<CategoryRule>[];
  count: number;
  missing: number;
  categories: CategoryOption[] | null;
  accounts: NamedOption[] | null;
}) {
  return (
    <Disclosure icon={<IconRules size={18} />} summary={`Regras sugeridas · ${count} de ${rulePackSize()}`}>
      <p>
        Regras do tipo “a descrição contém” para termos comuns. Funcionam como as suas: valem para as próximas
        movimentações e você pode editar, desativar ou remover cada uma. Editada para outro termo ou categoria, a
        regra passa para “Suas regras”.
      </p>

      {missing > 0 && hasActiveCategories ? <RulePackButton missing={missing} /> : null}
      {!hasActiveCategories ? (
        <p>
          Crie as categorias primeiro.{" "}
          <Link className={ui.inlineLink} href="/categorias">
            Usar as categorias sugeridas
          </Link>
        </p>
      ) : null}

      {groups.length > 0 ? (
        <div className={styles.packGroups}>
          {groups.map((group) => (
            <details key={group.category} className={styles.packCategoryGroup}>
              <summary className={styles.packCategorySummary}>
                {group.category} <span className={styles.listCount}>({group.rules.length})</span>
              </summary>
              <ul className={ui.list}>
                {group.rules.map((rule) => (
                  <RuleItem key={`${rule.id}:${rule.updatedAt}`} rule={rule} categories={categories} accounts={accounts} />
                ))}
              </ul>
            </details>
          ))}
        </div>
      ) : (
        // Nada adicionado ainda: mostra o que o pacote cria, por categoria.
        <dl className={styles.pack}>
          {RULE_PACK.map((group) => (
            <div key={group.category} className={styles.packGroup}>
              <dt className={styles.packCategory}>{group.category}</dt>
              <dd className={styles.packValues}>{group.values.map((value) => `“${value}”`).join(", ")}</dd>
            </div>
          ))}
        </dl>
      )}
    </Disclosure>
  );
}
