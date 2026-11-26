import Link from "next/link";
import type { ReactNode } from "react";
import { IconChevronDown } from "./icons";
import ui from "./ui.module.css";

export interface ToolbarFilter {
  name: string;
  label: string;
  value: string;
  /** A primeira opção, com value vazio, é "todos". */
  options: readonly { value: string; label: string }[];
}

/**
 * Busca e filtro por formulário GET: o estado fica na URL, funciona sem JavaScript e o
 * servidor filtra a lista já carregada (a API não tem busca).
 */
export function ListToolbar({
  action,
  label,
  search,
  placeholder,
  filters = [],
  active,
  hidden = {},
  more,
}: {
  action: string;
  /** Nome da região, ex.: "Buscar contas". */
  label: string;
  search: string;
  placeholder: string;
  filters?: readonly ToolbarFilter[];
  /** Há busca ou filtro aplicado: mostra "Limpar". */
  active: boolean;
  /** Parâmetros definidos fora do formulário (ex.: período) que a busca preserva. */
  hidden?: Readonly<Record<string, string>>;
  /** Filtros menos usados, num painel "Filtros" recolhível dentro do mesmo formulário. */
  more?: { open: boolean; activeCount: number; children: ReactNode };
}) {
  // Componente de servidor: o id vem da rota, única por tela.
  const id = `toolbar${action.replace(/[^a-z0-9]/gi, "-")}`;
  return (
    <form className={ui.toolbar} action={action} method="get" role="search" aria-label={label}>
      <label className="visually-hidden" htmlFor={`${id}-busca`}>
        {placeholder}
      </label>
      <input
        id={`${id}-busca`}
        className={`${ui.input} ${ui.toolbarSearch}`}
        type="search"
        name="busca"
        defaultValue={search}
        placeholder={placeholder}
        maxLength={80}
      />
      {filters.map((filter) => (
        <span key={filter.name} className={ui.toolbarFilter}>
          <label className="visually-hidden" htmlFor={`${id}-${filter.name}`}>
            {filter.label}
          </label>
          <select id={`${id}-${filter.name}`} className={ui.select} name={filter.name} defaultValue={filter.value}>
            {filter.options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </span>
      ))}
      {Object.entries(hidden).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      {more ? (
        <details className={ui.toolbarMore} open={more.open}>
          <summary className={`${ui.button} ${ui.secondary}`}>
            Filtros{more.activeCount > 0 ? <span className={ui.toolbarBadge}>{more.activeCount}</span> : null}
            <IconChevronDown size={16} />
          </summary>
          <div className={ui.toolbarMorePanel}>{more.children}</div>
        </details>
      ) : null}
      <button className={`${ui.button} ${ui.secondary}`} type="submit">
        Aplicar
      </button>
      {active ? (
        <Link className={ui.inlineLink} href={action}>
          Limpar
        </Link>
      ) : null}
    </form>
  );
}

/**
 * Atalhos como links (componente de servidor): cada opção é uma URL. Mesmo visual do
 * SegmentedControl; a opção atual é marcada com aria-current.
 */
export function SegmentedLinks({
  label,
  options,
}: {
  label: string;
  options: readonly { href: string; label: string; current: boolean }[];
}) {
  const index = Math.max(
    0,
    options.findIndex((option) => option.current),
  );
  return (
    <nav
      className={ui.segmented}
      aria-label={label}
      style={{ "--segments": options.length, "--index": index } as React.CSSProperties}
    >
      {options.some((option) => option.current) ? <span className={ui.segmentIndicator} aria-hidden /> : null}
      {options.map((option) => (
        <Link key={option.href} className={ui.segment} href={option.href} aria-current={option.current ? "true" : undefined}>
          {option.label}
        </Link>
      ))}
    </nav>
  );
}
