"use client";

import { createContext, type ReactNode, useCallback, useContext, useMemo, useState } from "react";

interface RecentContextValue {
  isRecent: (id: string) => boolean;
  markRecent: (ids: string[]) => void;
}

const RecentContext = createContext<RecentContextValue>({
  isRecent: () => false,
  markRecent: () => {},
});

/**
 * Lançamentos criados nesta visita. A linha correspondente ganha um destaque breve
 * que mostra onde o registro foi parar no histórico (causa e efeito).
 */
export function RecentMovementsProvider({ children }: { children: ReactNode }) {
  const [ids, setIds] = useState<ReadonlySet<string>>(() => new Set());
  const markRecent = useCallback((created: string[]) => {
    setIds(new Set(created.map((id) => id.toLowerCase())));
  }, []);
  const value = useMemo(
    () => ({ isRecent: (id: string) => ids.has(id.toLowerCase()), markRecent }),
    [ids, markRecent],
  );

  return <RecentContext.Provider value={value}>{children}</RecentContext.Provider>;
}

export function useRecentMovements() {
  return useContext(RecentContext);
}
