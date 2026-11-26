import Link from "next/link";
import { Fragment } from "react";
import { IconAccounts, IconTag, IconTransfer } from "@/components/icons";
import { UrlNoticeToast } from "@/components/interactive";
import { ListToolbar } from "@/components/list-toolbar";
import { PanelSection, PanelToggle } from "@/components/panel";
import { StatCard, StatGrid } from "@/components/stat-card";
import { EmptyState, Notice, PageHeader, ui } from "@/components/ui";
import { auth0 } from "@/lib/auth0";
import { listAccounts } from "@/lib/accounts/api";
import { listAllPages, SELECTOR_ITEM_LIMIT } from "@/lib/api/pagination";
import { AccountForm } from "./account-form";
import { AccountItem } from "./account-item";
import { isNoticeKey, NOTICES } from "./notices";
import {
  ACCOUNT_GROUPS,
  accountCounts,
  filterAccounts,
  GROUP_LABELS,
  GROUP_SLUGS,
  groupAccounts,
  groupBreakdown,
  parseAccountFilters,
  shareOf,
} from "./presentation";
import styles from "./contas.module.css";

export default async function ContasPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const notice = isNoticeKey(params.aviso) ? NOTICES[params.aviso] : null;
  const filters = parseAccountFilters(params);

  const { token } = await auth0.getAccessToken();
  // Lista inteira (até 500) para agrupar, contar e buscar: a API não tem busca nem totais.
  const { items, truncated } = await listAllPages((query) => listAccounts(query, { accessToken: token }));
  const counts = accountCounts(items);
  const groups = groupAccounts(filterAccounts(items, filters));
  const filtering = filters.search !== "" || filters.group !== null;
  // Sem nenhuma conta, o painel já começa aberto: é a próxima ação óbvia.
  const forceOpen = counts.total === 0;

  return (
    <div className={styles.page}>
      <UrlNoticeToast notice={notice} />

      <PageHeader
        title="Contas"
        context={
          counts.total === 0
            ? "Contas correntes, poupanças, cartões e dinheiro que você acompanha."
            : "Acompanhe suas contas manuais e conectadas em um só lugar."
        }
        actions={
          <>
            {counts.total > 0 ? (
              <Link className={`${ui.button} ${ui.secondary}`} href="/contas/importar-ofx">
                Importar extrato OFX
              </Link>
            ) : null}
            <Link className={`${ui.button} ${ui.secondary}`} href="/contas/conectar">
              Conectar banco (Sandbox)
            </Link>
            <PanelToggle flag="nova" forceOpen={forceOpen}>
              Nova conta
            </PanelToggle>
          </>
        }
      />

      <PanelSection
        flag="nova"
        forceOpen={forceOpen}
        title="Nova conta manual"
        description="Registre uma conta que não está conectada. O saldo inicial vale a partir da data de referência."
        closeLabel="Fechar o painel de nova conta"
      >
        <AccountForm />
      </PanelSection>

      {counts.total === 0 ? (
        <EmptyState icon={<IconAccounts size={22} />} title="Nenhuma conta ainda">
          Crie sua primeira conta no painel acima. Depois, registre as movimentações dela em
          Movimentações.
        </EmptyState>
      ) : (
        <>
          <StatGrid label="Resumo das contas">
            <StatCard
              icon={<IconAccounts size={20} />}
              label="Contas ativas"
              value={counts.total}
              meta={groupBreakdown(counts.byGroup)}
            />
            <StatCard
              icon={<IconTag size={20} />}
              label="Manuais"
              value={counts.manual}
              meta={`de ${counts.total} ${counts.total === 1 ? "conta" : "contas"}, registradas por você`}
              share={shareOf(counts.manual, counts.total)}
            />
            <StatCard
              icon={<IconTransfer size={20} />}
              label="Conectadas"
              value={counts.connected}
              meta={`de ${counts.total} ${counts.total === 1 ? "conta" : "contas"}, lidas do banco pelo Open Finance`}
              share={shareOf(counts.connected, counts.total)}
            />
          </StatGrid>

          {truncated ? (
            <Notice tone="info">
              Você tem mais de {SELECTOR_ITEM_LIMIT} contas: a lista, a busca e os números mostram só as primeiras.
            </Notice>
          ) : null}

          <section className={styles.list} aria-labelledby="contas-title">
            <div className={styles.listTop}>
              <h2 id="contas-title" className={styles.listTitle}>
                Suas contas
              </h2>
              <ListToolbar
                action="/contas"
                label="Buscar contas"
                search={filters.search}
                placeholder="Buscar por nome ou instituição"
                active={filtering}
                filters={[{
                  name: "grupo",
                  label: "Grupo de contas",
                  value: filters.group ? GROUP_SLUGS[filters.group] : "",
                  options: [
                    { value: "", label: "Todos os grupos" },
                    ...ACCOUNT_GROUPS.map((group) => ({ value: GROUP_SLUGS[group], label: GROUP_LABELS[group] })),
                  ],
                }]}
              />
            </div>

            {groups.length === 0 ? (
              <EmptyState
                icon={<IconAccounts size={22} />}
                title="Nenhuma conta encontrada"
                action={
                  <Link className={`${ui.button} ${ui.secondary}`} href="/contas">
                    Limpar busca
                  </Link>
                }
              >
                Nenhuma conta combina com a busca ou o filtro escolhido.
              </EmptyState>
            ) : (
              <div className={styles.table}>
                <div className={styles.listHead} aria-hidden>
                  <span>Conta</span>
                  <span>Tipo</span>
                  <span>Instituição</span>
                  <span>Saldo inicial</span>
                  <span>Origem</span>
                  <span />
                </div>
                {groups.map((view) => (
                  <Fragment key={view.group}>
                    <h3 className={ui.groupHead} id={`grupo-${view.group}`}>
                      {view.label} <span className={ui.groupCount}>({view.accounts.length})</span>
                    </h3>
                    <ul className={styles.rows} aria-labelledby={`grupo-${view.group}`}>
                      {view.accounts.map((account) => (
                        // `updatedAt` na chave remonta o item após edição, descartando campos antigos.
                        <AccountItem key={`${account.id}:${account.updatedAt}`} account={account} />
                      ))}
                    </ul>
                  </Fragment>
                ))}
              </div>
            )}
          </section>

          <Notice tone="info" className={styles.footnote}>
            O valor de cada conta é o saldo inicial que você informou, na data indicada. Saldos atuais e
            totais chegam com o painel consolidado.
          </Notice>
        </>
      )}
    </div>
  );
}
