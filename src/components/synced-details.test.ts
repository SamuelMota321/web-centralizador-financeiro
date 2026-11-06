import { type ComponentProps, createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { SyncedDetails, SyncedDetailsGroup } from "./synced-details";

// Os filhos vão como argumentos do createElement; as props sem `children` só para o tipo.
type DetailsProps = ComponentProps<typeof SyncedDetails>;
type GroupProps = ComponentProps<typeof SyncedDetailsGroup>;

const details = (summary: string, content: string) =>
  createElement(SyncedDetails, { summary } as DetailsProps, content);

const pair = (props: Omit<GroupProps, "children">) =>
  renderToStaticMarkup(
    createElement(
      SyncedDetailsGroup,
      props as GroupProps,
      details("Ver saídas", "lista"),
      details("Ver valores por mês", "tabela"),
    ),
  );

describe("SyncedDetails", () => {
  it("os do mesmo grupo começam no mesmo estado", () => {
    expect(pair({}).match(/<details open/g)).toBeNull();
    expect(pair({ defaultOpen: true }).match(/<details open=""/g)).toHaveLength(2);
  });

  it("fora de um grupo, começa fechado e mantém o conteúdo no HTML", () => {
    expect(renderToStaticMarkup(details("Ver", "conteúdo"))).toBe(
      "<details><summary>Ver</summary>conteúdo</details>",
    );
  });
});
