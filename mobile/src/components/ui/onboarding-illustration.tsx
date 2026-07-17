import { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Ellipse, Line, Path, Rect } from 'react-native-svg';

export type OnboardingVariant = 'find' | 'apply' | 'logbook';

interface OnboardingIllustrationProps {
  variant: OnboardingVariant;
  size?: number;
}

/**
 * Flat-design onboarding scenes, hand-drawn from react-native-svg
 * primitives (no external art asset -- keeps the slides OTA-eligible,
 * no new native dependency). Each variant floats gently on a loop so the
 * intro reads as "alive" rather than a static image.
 */
export function OnboardingIllustration({ variant, size = 220 }: OnboardingIllustrationProps) {
  const float = useSharedValue(0);
  const sparkle = useSharedValue(0);

  useEffect(() => {
    float.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1800 }),
        withTiming(0, { duration: 1800 })
      ),
      -1
    );
    sparkle.value = withRepeat(
      withSequence(withTiming(1, { duration: 1100 }), withTiming(0, { duration: 1100 })),
      -1
    );
  }, [float, sparkle]);

  const floatStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: -6 + float.value * 12 },
      { rotate: `${-1.5 + float.value * 3}deg` },
    ],
  }));

  const sparkleStyle = useAnimatedStyle(() => ({
    opacity: 0.35 + sparkle.value * 0.65,
    transform: [{ scale: 0.85 + sparkle.value * 0.3 }],
  }));

  return (
    <Animated.View style={[styles.wrap, { width: size, height: size }, floatStyle]}>
      <Svg width={size} height={size} viewBox="0 0 220 220">
        {variant === 'find' ? <FindScene /> : null}
        {variant === 'apply' ? <ApplyScene /> : null}
        {variant === 'logbook' ? <LogbookScene /> : null}
      </Svg>
      {/* A single accent dot re-pulses independently of the float loop --
          reads as a live "match found" / "notification" glimmer. */}
      <Animated.View style={[styles.sparkleDot, sparkleStyle]} />
    </Animated.View>
  );
}

/** A student at a laptop, opportunity cards "appearing" around them. */
function FindScene() {
  return (
    <>
      <Ellipse cx="110" cy="188" rx="72" ry="10" fill="rgba(255,255,255,0.08)" />
      {/* Desk */}
      <Rect x="30" y="150" width="160" height="10" rx="5" fill="rgba(255,255,255,0.16)" />
      {/* Laptop base + screen */}
      <Path d="M74 150 L146 150 L154 128 L66 128 Z" fill="rgba(255,255,255,0.22)" />
      <Rect x="72" y="78" width="76" height="52" rx="6" fill="#ffffff" />
      <Rect x="80" y="88" width="60" height="6" rx="3" fill="#c7d4ff" />
      <Rect x="80" y="100" width="42" height="6" rx="3" fill="#c7d4ff" />
      <Rect x="80" y="112" width="52" height="6" rx="3" fill="#7ea2ff" />
      {/* Person bust */}
      <Circle cx="110" cy="60" r="20" fill="#ffffff" />
      <Path d="M78 128 C78 100 142 100 142 128 L142 138 L78 138 Z" fill="#ffffff" />
      {/* Floating opportunity chips */}
      <Circle cx="42" cy="70" r="14" fill="rgba(255,255,255,0.14)" />
      <Path d="M36 70 L41 75 L49 65" stroke="#7ea2ff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <Circle cx="182" cy="96" r="12" fill="rgba(255,255,255,0.14)" />
      <Path d="M177 96 L181 100 L188 92" stroke="#7ea2ff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </>
  );
}

/** A paper airplane on a curved trail, with an application checklist card. */
function ApplyScene() {
  return (
    <>
      <Ellipse cx="110" cy="188" rx="72" ry="10" fill="rgba(255,255,255,0.08)" />
      {/* Motion trail */}
      <Path
        d="M40 150 C 70 130, 90 170, 130 120 S 170 60, 190 50"
        stroke="rgba(255,255,255,0.22)"
        strokeWidth="3"
        strokeDasharray="2 10"
        strokeLinecap="round"
        fill="none"
      />
      {/* Paper airplane */}
      <Path d="M175 40 L120 78 L138 90 Z" fill="#ffffff" />
      <Path d="M175 40 L138 90 L150 100 Z" fill="#c7d4ff" />
      <Path d="M175 40 L120 78 L128 66 Z" fill="#a5b4fc" />
      {/* Application card */}
      <Rect x="46" y="110" width="92" height="64" rx="10" fill="#ffffff" />
      <Rect x="58" y="124" width="48" height="7" rx="3.5" fill="#4338ca" />
      <Rect x="58" y="138" width="68" height="5" rx="2.5" fill="#c7d4ff" />
      <Circle cx="63" cy="156" r="6" fill="#a5b4fc" />
      <Path d="M60 156 L62.5 159 L67 152" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <Rect x="76" y="153" width="48" height="6" rx="3" fill="#e6eaff" />
    </>
  );
}

/** An open logbook with a pencil and a streak flame. */
function LogbookScene() {
  return (
    <>
      <Ellipse cx="110" cy="188" rx="72" ry="10" fill="rgba(255,255,255,0.08)" />
      {/* Open notebook */}
      <Path d="M40 150 L108 138 L108 76 L40 88 Z" fill="#ffffff" />
      <Path d="M180 150 L112 138 L112 76 L180 88 Z" fill="#e6eaff" />
      <Line x1="52" y1="102" x2="94" y2="96" stroke="#c7d4ff" strokeWidth="4" strokeLinecap="round" />
      <Line x1="52" y1="116" x2="94" y2="110" stroke="#c7d4ff" strokeWidth="4" strokeLinecap="round" />
      <Line x1="52" y1="130" x2="80" y2="126" stroke="#0d9463" strokeWidth="4" strokeLinecap="round" />
      <Line x1="126" y1="98" x2="164" y2="104" stroke="#c7d4ff" strokeWidth="4" strokeLinecap="round" />
      <Line x1="126" y1="112" x2="164" y2="118" stroke="#c7d4ff" strokeWidth="4" strokeLinecap="round" />
      {/* Spiral binding */}
      <Circle cx="110" cy="80" r="3" fill="rgba(255,255,255,0.5)" />
      <Circle cx="110" cy="103" r="3" fill="rgba(255,255,255,0.5)" />
      <Circle cx="110" cy="126" r="3" fill="rgba(255,255,255,0.5)" />
      <Circle cx="110" cy="149" r="3" fill="rgba(255,255,255,0.5)" />
      {/* Pencil */}
      <Path d="M150 60 L168 78 L104 142 L86 144 L88 126 Z" fill="#3fe6a0" />
      <Path d="M150 60 L162 48 L180 66 L168 78 Z" fill="#0d9463" />
      <Path d="M88 126 L86 144 L104 142 Z" fill="#07422e" />
      {/* Streak flame */}
      <Path
        d="M168 158 C168 148 178 146 176 136 C186 142 190 152 184 162 C182 168 174 168 168 158 Z"
        fill="#3fe6a0"
      />
    </>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  sparkleDot: {
    position: 'absolute',
    top: 30,
    right: 12,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#3fe6a0',
  },
});
