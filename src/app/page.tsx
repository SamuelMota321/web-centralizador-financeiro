import { redirect } from "next/navigation";
import { BrandLockup } from "@/components/brand";
import { IconInflow, IconOutflow, IconTransfer } from "@/components/icons";
import { StatusChip } from "@/components/ui";
import { auth0 } from "@/lib/auth0";
import { formatMoney } from "@/lib/money";
import styles from "./page.module.css";

/** Amostra fictícia (os mesmos exemplos do Style Guide), montada com os componentes do app. */
const SAMPLE = [
  {
    Icon: IconInflow,
    direction: "in",
    title: "Salário (fictício)",
    meta: "Conta do dia a dia",
    chip: { tone: "positive", label: "Renda · definida por você" },
    amount: `+ ${formatMoney("6800.00")}`,
  },
  {
    Icon: IconOutflow,
    direction: "out",
    title: "Mercado do bairro",
    meta: "Conta do dia a dia",
    chip: { tone: "positive", label: "Alimentação · aplicada por regra" },
    amount: `− ${formatMoney("184.90")}`,
  },
  {
    Icon: IconOutflow,
    direction: "out",
    title: "Padaria",
    meta: "Conta do dia a dia",
    chip: { tone: "warning", label: "Categoria incerta" },
    amount: `− ${formatMoney("23.50")}`,
  },
  {
    Icon: IconTransfer,
    direction: "transfer",
    title: "Reserva do mês",
    meta: "Transferência entre contas",
    chip: { tone: "neutral", label: "Não se aplica" },
    amount: `− ${formatMoney("250.00")}`,
  },
] as const;

export default async function Home() {
  const session = await auth0.getSession();
  if (session) redirect("/movimentacoes");

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <BrandLockup />
      </header>

      <main className={styles.main}>
        <section className={styles.intro}>
          <h1 className={styles.title}>Clareza para cuidar do que é seu.</h1>
          <p className={styles.lead}>
            Suas contas e movimentações em uma leitura única, rastreável e honesta.
          </p>
          {/* Link do Next faria prefetch e iniciaria a transação de login por engano. */}
          <a className={styles.action} href="/auth/login?returnTo=/movimentacoes">
            Entrar
          </a>
        </section>

        {/* Prévia real: os mesmos componentes do app, com dados fictícios. */}
        <figure className={styles.preview}>
          <div className={styles.previewPanel} aria-hidden>
            <p className={styles.previewDay}>Hoje</p>
            <ul className={styles.previewList}>
              {SAMPLE.map(({ Icon, direction, title, meta, chip, amount }) => (
                <li key={title} className={styles.previewRow}>
                  <span className={styles.previewIcon} data-direction={direction}>
                    <Icon size={15} />
                  </span>
                  <span className={styles.previewText}>
                    <span className={styles.previewTitle}>{title}</span>
                    <span className={styles.previewMeta}>{meta}</span>
                  </span>
                  <span className={styles.previewChip}>
                    <StatusChip tone={chip.tone}>{chip.label}</StatusChip>
                  </span>
                  <span className={`${styles.previewAmount} tabular`} data-direction={direction}>
                    {amount}
                  </span>
                </li>
              ))}
            </ul>
            <p className={styles.previewRule}>
              Se a descrição contém <span className={styles.previewValue}>“mercado”</span> →{" "}
              <strong>Alimentação</strong>
            </p>
          </div>
          <figcaption className={styles.caption}>
            Cada lançamento mostra conta, categoria e de onde veio a classificação.
          </figcaption>
        </figure>
      </main>

      <footer className={styles.footer}>
        <p>O Coinciente organiza: não movimenta dinheiro nem recomenda investimentos.</p>
        <p>Demonstração acadêmica com dados fictícios, UCB 2026</p>
      </footer>
    </div>
  );
}
