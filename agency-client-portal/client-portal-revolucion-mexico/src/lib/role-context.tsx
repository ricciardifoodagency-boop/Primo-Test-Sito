// Provider del ruolo corrente. Carica il ruolo salvato all'avvio e lo espone a
// tutta l'app; permette di impostarlo (scelta iniziale) e di azzerarlo
// (cambio ruolo dalle impostazioni — funzione temporanea).

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { clearRole as clearStored, loadRole, ROLES, saveRole, type Role, type RoleConfig } from './role';

type RoleContextValue = {
  ready: boolean; // true quando abbiamo finito di leggere lo storage
  role: Role | null;
  config: RoleConfig | null;
  setRole: (role: Role) => Promise<void>;
  resetRole: () => Promise<void>;
};

const RoleContext = createContext<RoleContextValue | null>(null);

export function RoleProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [role, setRoleState] = useState<Role | null>(null);

  useEffect(() => {
    let alive = true;
    loadRole().then((r) => {
      if (alive) {
        setRoleState(r);
        setReady(true);
      }
    });
    return () => {
      alive = false;
    };
  }, []);

  const setRole = useCallback(async (r: Role) => {
    await saveRole(r);
    setRoleState(r);
  }, []);

  const resetRole = useCallback(async () => {
    await clearStored();
    setRoleState(null);
  }, []);

  const value = useMemo<RoleContextValue>(
    () => ({ ready, role, config: role ? ROLES[role] : null, setRole, resetRole }),
    [ready, role, setRole, resetRole]
  );

  return <RoleContext.Provider value={value}>{children}</RoleContext.Provider>;
}

export function useRole(): RoleContextValue {
  const ctx = useContext(RoleContext);
  if (!ctx) throw new Error('useRole deve essere usato dentro <RoleProvider>');
  return ctx;
}
