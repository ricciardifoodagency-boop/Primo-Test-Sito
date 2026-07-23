// Guard di rotta: se il ruolo corrente non può vedere una sezione (es. l'Addetto
// non ha Dashboard/Competitor) e vi atterra comunque (URL diretto o rotta
// iniziale), rimanda alla prima sezione consentita.

import { Redirect } from 'expo-router';

import { TAB_META, visibleTabs, type TabName } from './role';
import { useRole } from './role-context';

export function useTabGuard(name: TabName) {
  const { ready, role } = useRole();
  // Finché non sappiamo il ruolo (o la scelta è aperta) non reindirizziamo.
  if (!ready || !role) return null;
  const tabs = visibleTabs(role);
  if (tabs.includes(name)) return null;
  return <Redirect href={TAB_META[tabs[0]].href} />;
}
