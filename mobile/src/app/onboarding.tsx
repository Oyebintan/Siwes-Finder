import { useRef, useState } from 'react';
import { FlatList, StyleSheet, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { BrandLogo } from '@/components/ui/brand-logo';
import { Button } from '@/components/ui/button';
import { OnboardingIllustration, type OnboardingVariant } from '@/components/ui/onboarding-illustration';
import { PressableScale } from '@/components/ui/pressable-scale';
import { Colors, FontFamily, Spacing } from '@/constants/theme';
import { markOnboardingSeen } from '@/api/onboardingFlag';

// The intro is deliberately dark regardless of system theme -- a full-bleed
// gradient glow per slide with the headline anchored at the bottom, in the
// style of modern fintech onboarding. Each slide owns a glow color; the
// second headline line picks up the same accent.
const DARK_BG = Colors.dark.background;

const SLIDES: {
  key: OnboardingVariant;
  glow: readonly [string, string, string];
  accent: string;
  titleTop: string;
  titleAccent: string;
  body: string;
}[] = [
  {
    key: 'find',
    glow: ['#2557eb', '#132a75', DARK_BG] as const,
    accent: '#7ea2ff',
    titleTop: 'Find your placement,',
    titleAccent: 'made for you.',
    body: 'SIWES and IT opportunities from vetted Nigerian companies — matched to your skills, course, and preferred state.',
  },
  {
    key: 'apply',
    glow: ['#4338ca', '#251d76', DARK_BG] as const,
    accent: '#a5b4fc',
    titleTop: 'Apply in seconds,',
    titleAccent: 'track everything.',
    body: 'One profile, one tap to apply. Follow every application and message employers right from your phone.',
  },
  {
    key: 'logbook',
    glow: ['#0d9463', '#07422e', DARK_BG] as const,
    accent: '#3fe6a0',
    titleTop: 'Keep your logbook',
    titleAccent: 'alive — anywhere.',
    body: 'Log your day in 20 seconds, even offline. Your employer signs off and your school sees progress automatically.',
  },
];

export default function OnboardingScreen() {
  const { width } = useWindowDimensions();
  const listRef = useRef<FlatList>(null);
  const [index, setIndex] = useState(0);
  const isLast = index === SLIDES.length - 1;

  const finish = async (target: '/signup' | '/login') => {
    await markOnboardingSeen();
    router.replace(target);
  };

  return (
    <View style={[styles.flex, { backgroundColor: DARK_BG }]}>
      <StatusBar style="light" />

      <FlatList
        ref={listRef}
        data={SLIDES}
        keyExtractor={(s) => s.key}
        horizontal
        pagingEnabled
        bounces={false}
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) => setIndex(Math.round(e.nativeEvent.contentOffset.x / width))}
        renderItem={({ item }) => (
          <View style={[styles.slide, { width }]}>
            {/* Full-bleed glow: vivid at the top, dissolving into the dark
                canvas about two-thirds down. */}
            <LinearGradient
              colors={item.glow}
              locations={[0, 0.42, 0.78]}
              style={StyleSheet.absoluteFill}
            />

            <SafeAreaView style={styles.slideSafe} edges={['top', 'bottom']}>
              <View style={styles.topRow}>
                <View style={styles.brandRow}>
                  <BrandLogo size={30} />
                  <ThemedText style={styles.brandName}>SIWES Finder</ThemedText>
                </View>
              </View>

              <Animated.View entering={FadeInDown.duration(500).delay(60)} style={styles.illustrationWrap}>
                <OnboardingIllustration variant={item.key} />
              </Animated.View>

              <Animated.View entering={FadeInDown.duration(420)} style={styles.slideContent}>
                <ThemedText style={styles.headline}>
                  {item.titleTop}
                  {'\n'}
                  <ThemedText style={[styles.headline, { color: item.accent }]}>{item.titleAccent}</ThemedText>
                </ThemedText>

                <ThemedText style={styles.body}>{item.body}</ThemedText>
              </Animated.View>
            </SafeAreaView>
          </View>
        )}
      />

      <SafeAreaView edges={['bottom']}>
        <View style={styles.footer}>
          <View style={styles.dots}>
            {SLIDES.map((s, i) => (
              <View
                key={s.key}
                style={[styles.dot, i === index ? styles.dotActive : styles.dotIdle]}
              />
            ))}
          </View>

          <Button
            label={isLast ? 'Get started' : 'Next'}
            icon="arrow-forward"
            onPress={() => {
              if (isLast) {
                finish('/signup');
              } else {
                listRef.current?.scrollToIndex({ index: index + 1, animated: true });
                setIndex((i) => Math.min(i + 1, SLIDES.length - 1));
              }
            }}
          />

          <PressableScale
            onPress={() => finish('/login')}
            style={styles.skipRow}
            haptic={false}
            accessibilityRole="button"
            accessibilityLabel={isLast ? 'Log in to an existing account' : 'Skip the intro'}
          >
            {isLast ? (
              <ThemedText type="small" style={styles.skipText}>
                Already have an account? <ThemedText type="smallBold" style={styles.skipEmphasis}>Log in</ThemedText>
              </ThemedText>
            ) : (
              <ThemedText type="smallBold" style={styles.skipText}>
                Skip
              </ThemedText>
            )}
          </PressableScale>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  slide: {
    flex: 1,
  },
  slideSafe: {
    flex: 1,
  },
  topRow: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.two,
  },
  illustrationWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  slideContent: {
    paddingHorizontal: Spacing.four,
    gap: Spacing.three,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  brandName: {
    color: '#ffffff',
    fontSize: 15,
    fontFamily: FontFamily.bold,
  },
  headline: {
    color: '#ffffff',
    fontSize: 32,
    lineHeight: 40,
    fontFamily: FontFamily.extrabold,
    letterSpacing: -0.6,
  },
  body: {
    color: 'rgba(243,245,248,0.72)',
    fontSize: 14,
    lineHeight: 21,
    fontFamily: FontFamily.medium,
    maxWidth: 330,
  },
  footer: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.two,
    gap: Spacing.three,
    backgroundColor: DARK_BG,
  },
  dots: {
    flexDirection: 'row',
    gap: Spacing.one + Spacing.half,
  },
  dot: {
    height: 6,
    borderRadius: 3,
  },
  dotActive: {
    width: 26,
    backgroundColor: '#5c86ff',
  },
  dotIdle: {
    width: 6,
    backgroundColor: 'rgba(255,255,255,0.28)',
  },
  skipRow: {
    alignItems: 'center',
    paddingVertical: Spacing.one,
  },
  skipText: {
    color: 'rgba(243,245,248,0.75)',
  },
  skipEmphasis: {
    color: '#7ea2ff',
  },
});
