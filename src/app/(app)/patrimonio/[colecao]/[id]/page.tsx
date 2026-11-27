import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { PageHeader, ui } from "@/components/ui";
import { ProblemDetailsError } from "@/lib/api/errors";
import { listAllPages } from "@/lib/api/pagination";
import { auth0 } from "@/lib/auth0";
import { formatCivilDate } from "@/lib/civil-date";
import { getPatrimony, getPatrimonyHistory, listPatrimony } from "@/lib/patrimony/api";
import type { InputByCollection, PatrimonyCollection } from "@/lib/patrimony/types";
import { amountText, assetLabel, collectionFromSlug, formatStamp, SECTIONS } from "../../presentation";
import styles from "../../patrimonio.module.css";

type AnyState = InputByCollection[PatrimonyCollection];

function stateFacts(state: AnyState, assets: { id: string; description: string }[] | null): [string, string][] {
  if ("estimatedValue" in state) {
    return [
      ["Tipo", state.type],
      ["Descrição", state.description],
      ["Valor estimado", amountText(state.estimatedValue)],
      ["Data da avaliação", formatCivilDate(state.valuationDate)],
      ["Fonte informada", state.source],
    ];
  }
  const facts: [string, string][] = [
    ["Descrição", state.description],
    ["Saldo devedor", amountText(state.outstandingBalance)],
  ];
  if ("assetId" in state) facts.push(["Bem associado", assetLabel(state.assetId, assets)]);
  return facts;
}

/** Histórico de um item: versões gravadas pelo backend, da mais recente à mais antiga. */
export default async function HistoricoPage({ params }: { params: Promise<{ colecao: string; id: string }> }) {
  const { colecao, id } = await params;
  const collection = collectionFromSlug(colecao);
  if (!collection || !z.uuid().safeParse(id).success) notFound();

  const { token } = await auth0.getAccessToken();
  const context = { accessToken: token };

  const notFoundOn404 = (error: unknown): never => {
    if (error instanceof ProblemDetailsError && error.status === 404) notFound();
    throw error;
  };
  const [item, history, assets] = await Promise.all([
    getPatrimony(collection, id, context).catch(notFoundOn404),
    getPatrimonyHistory(collection, id, context).catch(notFoundOn404),
    collection === "financings"
      ? listAllPages((page) => listPatrimony("assets", page, context))
          .then(({ items }) => items.map(({ id: assetId, description }) => ({ id: assetId, description })))
          .catch(() => null)
      : Promise.resolve(null),
  ]);

  const versions = [...history].sort((a, b) => b.version - a.version);

  return (
    <div className={styles.page}>
      <Link className={`${ui.button} ${ui.secondary} ${styles.back}`} href="/patrimonio">
        Voltar para Bens e dívidas
      </Link>
      <PageHeader
        title={item.description}
        context={`${SECTIONS[collection].title} · versão ${item.version} · atualizado em ${formatStamp(item.updatedAt)}`}
      />

      <section className={styles.section} aria-labelledby="history-title">
        <h2 id="history-title" className={styles.sectionTitle}>
          Histórico de versões
        </h2>
        {versions.length === 0 ? (
          <p className={styles.note}>O backend não devolveu versões para este item.</p>
        ) : (
          versions.map((entry) => (
            <div key={entry.version} className={styles.section}>
              <h3 className={styles.note}>
                Versão {entry.version} · {formatStamp(entry.createdAt)}
                {entry.version === item.version ? " · atual" : ""}
              </h3>
              <dl className={styles.facts}>
                {stateFacts(entry.state, assets).map(([label, value]) => (
                  <div key={label} className={styles.fact}>
                    <dt>{label}</dt>
                    <dd className="tabular">{value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          ))
        )}
      </section>
    </div>
  );
}
