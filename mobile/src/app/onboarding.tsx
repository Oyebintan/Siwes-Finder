import { useRef, useState } from 'react';
import { FlatList, StyleSheet, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BrandLogo } from '@/components/ui/brand-logo';
import { Button } from '@/components/ui/button';
import { PressableScale } from '@/components/ui/pressable-scale';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { markOnboardingSeen } from '@/api/onboardingFlag';

const SLIDES = [
  {
    icon: 'briefcase' as const,
    title: 'Find verified placements',
    body: 'Browse SIWES and IT opportunities from vetted Nigerian companies — filtered by your skills, course, and preferred state.',
  },
  {
    icon: 'paper-plane' as const,
    title: 'Apply in seconds',
    body: 'One profile, one tap to apply. Track every application and message employers right from your phone.',
  },
  {
    icon: 'book' as const,
    title: 'Keep your logbook alive',
    body: 'Log your day in 20 seconds — even offline. Your employer approves entries and your school sees your progress automatically.',
  },
];

export default function OnboardingScreen() {
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const listRef = useRef<FlatList>(null);
  const [index, setIndex] = useState(0);
  const isLast = index === SLIDES.length - 1;

  const finish = async (target: '/signup' | '/login') => {
    await markOnboardingSeen();
    router.replace(target);
  };

  return (
    <ThemedView style={styles.flex}>
      <SafeAreaView style={styles.flex}>
        <View style={styles.topRow}>
          <BrandLogo size={36} />
          {!isLast ? (
            <PressableScale onPress={() => finish('/login')} haptic={false} hitSlop={8}>
              <ThemedText type="smallBold" themeColor="textSecondary">
                Skip
              </ThemedText>
            </PressableScale>
          ) : null}
        </View>

        <FlatList
          ref={listRef}
          data={SLIDES}
          keyExtractor={(s) => s.title}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={(e) => setIndex(Math.round(e.nativeEvent.contentOffset.x / width))}
          renderItem={({ item }) => (
            <View style={[styles.slide, { width }]}>
              <Animated.View
                entering={FadeInDown.duration(400)}
                style={[styles.slideIcon, { backgroundColor: theme.primarySoft }]}
              >
                <Ionicons name={item.icon} size={52} color={theme.primary} />
              </Animated.View>
              <ThemedText style={styles.slideTitle}>{item.title}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary" style={styles.slideBody}>
                {item.body}
              </ThemedText>
            </View>
          )}
        />

        <View style={styles.footer}>
          <View style={styles.dots}>
            {SLIDES.map((s, i) => (
              <View
                key={s.title}
                style={[
                  styles.dot,
                  i === index
                    ? [styles.dotActive, { backgroundColor: theme.primary }]
                    : { backgroundColor: theme.backgroundSelected },
                ]}
              />
            ))}
          </View>

          {isLast ? (
            <Animated.View entering={FadeInDown.duration(300)} style={styles.ctaGroup}>
              <Button label="Create your account" icon="arrow-forward" onPress={() => finish('/signup')} />
              <PressableScale onPress={() => finish('/login')} style={styles.loginLink} haptic={false}>
                <ThemedText type="small" themeColor="textSecondary">
                  Already have an account? <ThemedText type="smallBold" themeColor="primary">Log in</ThemedText>
                </ThemedText>
              </PressableScale>
            </Animated.View>
          ) : (
            <Button
              label="Next"
              icon="arrow-forward"
              onPress={() => {
                listRef.current?.scrollToIndex({ index: index + 1, animated: true });
                setIndex((i) => Math.min(i + 1, SLIDES.length - 1));
              }}
            />
          )}
        </View>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.two,
  },
  slide: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.five,
    gap: Spacing.three,
  },
  slideIcon: {
    width: 120,
    height: 120,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.two,
  },
  slideTitle: {
    fontSize: 26,
    lineHeight: 32,
    fontWeight: '800',
    letterSpacing: -0.5,
    textAlign: 'center',
  },
  slideBody: {
    textAlign: 'center',
    maxWidth: 300,
    lineHeight: 21,
  },
  footer: {
    padding: Spacing.four,
    gap: Spacing.four,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.two,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dotActive: {
    width: 22,
  },
  ctaGroup: {
    gap: Spacing.two,
  },
  loginLink: {
    alignItems: 'center',
    paddingVertical: Spacing.two,
  },
});
