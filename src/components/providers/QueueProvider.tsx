"use client";

import { useSyncExternalStore } from "react";
import { createContext, useContext, useState } from "react";
import type { SportQueueRepository } from "@/lib/repository";
import { createQueueStore, type QueueStore } from "@/lib/store";

const QueueContext = createContext<QueueStore | null>(null);

export function QueueProvider({
  children,
  repository,
}: {
  children: React.ReactNode;
  repository?: SportQueueRepository;
}) {
  const [store] = useState(() => createQueueStore(repository));
  return <QueueContext.Provider value={store}>{children}</QueueContext.Provider>;
}

export function useQueue() {
  const store = useContext(QueueContext);
  if (!store) throw new Error("useQueue must be used inside QueueProvider");
  const snapshot = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getServerSnapshot);
  return { ...snapshot, ...store };
}
