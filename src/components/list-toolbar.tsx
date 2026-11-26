import Link from "next/link";
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
  filter,
  active,
}: {
  action: string;
  /** Nome da região, ex.: "Buscar contas". */
  label: string;
  search: string;
  placeholder: string;
  filter?: ToolbarFilter;
  /** Há busca ou filtro aplicado: mostra "Limpar". */
  active: boolean;
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
      {filter ? (
        <>
          <label className="visually-hidden" htmlFor={`${id}-${filter.name}`}>
            {filter.label}
          </label>
          <select
            id={`${id}-${filter.name}`}
            className={`${ui.select} ${ui.toolbarFilter}`}
            name={filter.name}
            defaultValue={filter.value}
          >
            {filter.options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </>
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
