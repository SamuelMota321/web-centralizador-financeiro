import Link from "next/link";
import { IconBadge } from "@/components/icon-badge";
import { IconSparkles } from "@/components/icons";
import { SectionPanel } from "@/components/section-panel";
import { ui } from "@/components/ui";
import type { CategoryRule } from "@/lib/category-rules/types";
import { RULE_PACK, rulePackSize, type SuggestedRuleGroup } from "@/lib/categories/suggestions";
import { AddGroupButton, GroupToggle } from "./group-actions";
import { type PackTile, PackTiles } from "./pack-tiles";
import { RuleItem } from "./rule-item";
import { RulePackButton } from "./rule-pack-button";
import type { CategoryOption, NamedOption } from "./rule-logic";
import styles from "./regras.module.css";

function normalize(text: string): string {
  return text.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().trim();
}

/**
 * Regras sugeridas: uma fileira com as 12 categorias do pacote (quantas ativas em cada) e,
 * ao tocar, o grupo daquela categoria com os termos, ativar ou desativar o grupo, adicionar o
 * que falta e as regras em si. Nada polui a lista principal.
 */
export function RulePack({
  groups,
  count,
  missing,
  missingCategories,
  hasActiveCategories,
  categories,
  accounts,
  colorOf,
}: {
  /** Grupos com as sugeridas não removidas. */
  groups: SuggestedRuleGroup<CategoryRule>[];
  count: number;
  missing: number;
  missingCategories: readonly string[];
  hasActiveCategories: boolean;
  categories: CategoryOption[];
  accounts: NamedOption[] | null;
  colorOf: (categoryId: string) => string | null;
}) {
  const tiles: PackTile[] = [];
  const details: Record<string, React.ReactNode> = {};

  for (const pack of RULE_PACK) {
    const rules = groups.find((group) => group.category === pack.category)?.rules ?? [];
    const category = categories.find((item) => item.status === "active" && normalize(item.name) === normalize(pack.category));
    const color = category ? colorOf(category.id) : null;
    const needsCategory = missingCategories.includes(pack.category);
    const active = rules.filter((rule) => rule.status === "active").length;
    const onValues = new Set(rules.filter((rule) => rule.status === "active").map((rule) => rule.conditionValue.toLowerCase()));
    const present = new Set(rules.map((rule) => rule.conditionValue.toLowerCase()));
    const toAdd = pack.values.filter((value) => !present.has(value.toLowerCase())).length;

    tiles.push({
      category: pack.category,
      color,
      state: needsCategory || rules.length === 0 ? "missing" : active === 0 ? "off" : "on",
      detail: needsCategory ? "Falta a categoria" : rules.length === 0 ? `${pack.values.length} disponíveis` : `${active}/${pack.values.length} ativas`,
      mark: needsCategory || rules.length === 0 ? "add" : active === 0 ? "paused" : undefined,
    });

    const meta = needsCategory
      ? `Falta a categoria ${pack.category}: um toque cria a categoria junto com as ${pack.values.length} regras.`
      : rules.length === 0
        ? `${pack.values.length} regras do tipo “a descrição contém”, prontas para adicionar.`
        : [
            `${active} de ${rules.length} ${rules.length === 1 ? "regra ativa" : "regras ativas"}`,
            toAdd > 0 ? `${toAdd} para adicionar` : null,
          ]
            .filter(Boolean)
            .join(" · ");

    details[pack.category] = (
      <>
        <div className={styles.groupHead}>
          <IconBadge name={pack.category} color={color} />
          <div className={styles.groupText}>
            <p className={styles.groupName}>{category?.name ?? pack.category}</p>
            <p className={styles.groupMeta}>{meta}</p>
          </div>
          <div className={styles.groupActions}>
            {rules.length > 0 ? <GroupToggle category={pack.category} target={active > 0 ? "inactive" : "active"} /> : null}
            {toAdd > 0 ? <AddGroupButton category={pack.category} count={toAdd} needsCategory={needsCategory} /> : null}
          </div>
        </div>
        <ul className={styles.groupTerms} aria-label={`Termos de ${pack.category}`}>
          {pack.values.map((value) => (
            <li key={value} className={styles.groupTerm} data-on={onValues.has(value.toLowerCase()) || undefined}>
              {value}
              <span className="visually-hidden">{onValues.has(value.toLowerCase()) ? " (ativa)" : present.has(value.toLowerCase()) ? " (inativa)" : " (não adicionada)"}</span>
            </li>
          ))}
        </ul>
        {rules.length > 0 ? (
          <ul className={`${ui.list} ${styles.groupRules}`}>
            {rules.map((rule) => (
              <RuleItem key={`${rule.id}:${rule.updatedAt}`} rule={rule} categories={categories} accounts={accounts} color={colorOf(rule.categoryId)} />
            ))}
          </ul>
        ) : null}
      </>
    );
  }

  return (
    <div id="sugeridas" className={styles.anchor}>
      <SectionPanel
        id="sugeridas-titulo"
        icon={<IconSparkles size={22} />}
        title={`Regras sugeridas · ${count} de ${rulePackSize()}`}
        hint={
          hasActiveCategories ? (
            "Um pacote de regras para as categorias mais comuns. Funcionam como as suas: dá para editar, desativar ou remover cada uma."
          ) : (
            <>
              Cada grupo cria a categoria dele junto com as regras, ou{" "}
              <Link className={ui.inlineLink} href="/categorias">
                use as categorias sugeridas
              </Link>
              .
            </>
          )
        }
        actions={missing > 0 && hasActiveCategories ? <RulePackButton missing={missing} /> : undefined}
      >
        <PackTiles tiles={tiles} groups={details} />
      </SectionPanel>
    </div>
  );
}
