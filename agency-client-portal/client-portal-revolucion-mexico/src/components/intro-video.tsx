// TEMPORANEO — intro "demo" all'apertura dell'app.
// Da rimuovere quando non serve più: basta togliere l'import e il render in
// src/app/_layout.tsx e cancellare questo file + assets/videos/intro.mp4.

import { VideoView, useVideoPlayer } from 'expo-video';
import { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';

const source = require('@/assets/videos/intro.mp4');

export function IntroVideo({ onFinish }: { onFinish: () => void }) {
  const insets = useSafeAreaInsets();

  const player = useVideoPlayer(source, (p) => {
    p.loop = false;
    p.muted = false;
    p.play();
  });

  useEffect(() => {
    // Quando il video finisce, chiudi l'intro e mostra l'app.
    const sub = player.addListener('playToEnd', () => onFinish());
    return () => sub.remove();
  }, [player, onFinish]);

  return (
    <View style={styles.container}>
      <VideoView
        style={StyleSheet.absoluteFill}
        player={player}
        contentFit="contain"
        nativeControls={false}
      />
      <Pressable
        onPress={onFinish}
        hitSlop={12}
        style={[styles.skip, { top: insets.top + 12 }]}
        accessibilityRole="button"
        accessibilityLabel="Salta l'intro">
        <ThemedText type="smallBold" style={styles.skipText}>
          Salta ›
        </ThemedText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#000',
    zIndex: 100,
    elevation: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  skip: {
    position: 'absolute',
    right: 16,
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
  },
  skipText: { color: '#ffffff' },
});
