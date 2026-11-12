import { useEffect, useState } from 'react';
import { useApp } from '../contexte';
import type { Agence, Client, EntreeJournal, Intervention } from '../domain/types';

export function useInterventions(agences: Agence[], archive: boolean): Intervention[] | null {
  const { store } = useApp();
  const [l, setL] = useState<Intervention[] | null>(null);
  const cle = agences.join(',');
  useEffect(() => store.watchInterventions(cle.split(',') as Agence[], archive, setL), [store, cle, archive]);
  return l;
}

export function useClients(agences: Agence[]): Client[] | null {
  const { store } = useApp();
  const [l, setL] = useState<Client[] | null>(null);
  const cle = agences.join(',');
  useEffect(() => store.watchClients(cle.split(',') as Agence[], setL), [store, cle]);
  return l;
}

export function useJournal(): EntreeJournal[] | null {
  const { store } = useApp();
  const [l, setL] = useState<EntreeJournal[] | null>(null);
  useEffect(() => store.watchJournal(setL), [store]);
  return l;
}
