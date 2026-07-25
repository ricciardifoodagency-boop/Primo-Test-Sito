import {
  Tabs,
  TabList,
  TabTrigger,
  TabSlot,
  TabTriggerSlotProps,
  TabListProps,
} from 'expo-router/ui';
import { Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';

import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';

import { MaxContentWidth, Spacing } from '@/constants/theme';
import { brandColor } from '@/lib/api';
import { useRole } from '@/lib/role-context';
import { TAB_META, visibleTabs } from '@/lib/role';

export default function AppTabs() {
  const { role } = useRole();
  const tabs = visibleTabs(role);

  return (
    <Tabs>
      {/* paddingTop lascia spazio alla barra flottante in alto, così il
          contenuto non ci finisce sotto. */}
      <TabSlot style={{ flex: 1, paddingTop: 60 }} />
      <TabList asChild>
        <CustomTabList>
          {tabs.map((name) => {
            const meta = TAB_META[name];
            return (
              <TabTrigger key={name} name={name} href={meta.href} asChild>
                <TabButton>{meta.title}</TabButton>
              </TabTrigger>
            );
          })}
        </CustomTabList>
      </TabList>
    </Tabs>
  );
}

export function TabButton({ children, isFocused, ...props }: TabTriggerSlotProps) {
  return (
    <Pressable {...props} style={({ pressed }) => [styles.tab, pressed && styles.pressed]}>
      <ThemedView
        type={isFocused ? 'backgroundSelected' : 'backgroundElement'}
        style={styles.tabButtonView}>
        <ThemedText type="small" themeColor={isFocused ? 'text' : 'textSecondary'}>
          {children}
        </ThemedText>
      </ThemedView>
    </Pressable>
  );
}

export function CustomTabList(props: TabListProps) {
  const { width } = useWindowDimensions();
  // Su schermi stretti (mobile) la barra diventa a tutta larghezza e le voci
  // scorrono orizzontalmente, così non escono mai dallo schermo.
  const narrow = width < 700;

  return (
    <View {...props} nativeID="tabbar" style={styles.tabListContainer}>
      <ThemedView
        type="backgroundElement"
        style={[styles.innerContainer, narrow ? styles.innerNarrow : styles.innerWide]}>
        {narrow ? (
          <View style={[styles.brandDot, { backgroundColor: brandColor }]} />
        ) : (
          <View style={styles.brand}>
            <View style={[styles.brandDot, { backgroundColor: brandColor }]} />
            <ThemedText type="smallBold">Ricciardi Food Agency</ThemedText>
          </View>
        )}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.scroll}
          contentContainerStyle={styles.scrollRow}>
          {props.children}
        </ScrollView>
      </ThemedView>
    </View>
  );
}

const styles = StyleSheet.create({
  tabListContainer: {
    position: 'absolute',
    top: 0,
    width: '100%',
    paddingHorizontal: Spacing.two,
    paddingTop: Spacing.two,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  innerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Spacing.four,
    gap: Spacing.two,
    paddingVertical: Spacing.two,
  },
  innerWide: {
    flexGrow: 1,
    maxWidth: MaxContentWidth,
    paddingHorizontal: Spacing.five,
  },
  innerNarrow: {
    flexGrow: 1,
    maxWidth: '100%',
    paddingHorizontal: Spacing.three,
  },
  scroll: { flexGrow: 0, flexShrink: 1 },
  scrollRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, paddingRight: Spacing.two },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    marginRight: Spacing.two,
  },
  brandDot: { width: 12, height: 12, borderRadius: 6 },
  pressed: { opacity: 0.7 },
  tab: { flexShrink: 0 },
  tabButtonView: {
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.three,
  },
});
