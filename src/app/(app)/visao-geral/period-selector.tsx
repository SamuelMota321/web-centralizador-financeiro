"use client";

import { usePathname, useRouter } from "next/navigation";
import { useOptimistic, useTransition } from "react";
import { SegmentedControl } from "@/components/interactive";

/**
 * Troca o período pela URL (`?periodo=`). O indicador já vai para a escolha nova; a tela
 * atual fica montada até os dados chegarem, e os gráficos transitam de um período ao outro.
 */
export function PeriodSelector<T extends string>({
  options,
  value,
}: {
  options: readonly { value: T; label: string }[];
  value: T;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();
  const [shown, setShown] = useOptimistic(value);

  return (
    <div aria-busy={pending || undefined}>
      <SegmentedControl
        label="Período"
        options={options}
        value={shown}
        onChange={(next) =>
          startTransition(() => {
            setShown(next);
            router.push(`${pathname}?periodo=${next}`, { scroll: false });
          })
        }
      />
    </div>
  );
}
