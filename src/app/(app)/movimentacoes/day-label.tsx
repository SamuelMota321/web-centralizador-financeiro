"use client";

import { useSyncExternalStore } from "react";
import { formatLongCivilDate, relativeCivilDay, todayCivilDate } from "@/lib/civil-date";
import styles from "./movimentacoes.module.css";

// A data de hoje não muda durante a visita de forma que exija reagir: não há assinatura.
const subscribeNever = () => () => {};

/**
 * Cabeçalho do grupo do dia. "Hoje" e "Ontem" dependem do calendário do navegador,
 * não do servidor (que pode estar em outro fuso): no HTML inicial vai só a data por
 * extenso, e o relativo aparece após hidratar.
 */
export function DayLabel({ date }: { date: string }) {
  // Na hidratação vale o valor do servidor (null); em seguida, o calendário do navegador.
  const today = useSyncExternalStore(subscribeNever, todayCivilDate, () => null);
  const referenceYear = today ? Number(today.slice(0, 4)) : undefined;
  const relative = today ? relativeCivilDay(date, today) : null;
  const long = formatLongCivilDate(date, referenceYear);

  return relative ? (
    <>
      {relative}
      <span className={styles.dayDetail}> · {long}</span>
    </>
  ) : (
    <>{long.charAt(0).toUpperCase() + long.slice(1)}</>
  );
}
