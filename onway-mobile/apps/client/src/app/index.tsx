import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';

import { BrandLogo } from '@/components/brand-logo';
import { brand } from '@/constants/theme';
import { useAuth } from '@/contexts/auth-context';

export default function SplashRoute() {
  const router = useRouter();
  const { status, user } = useAuth();
  const intro = useRef(new Animated.Value(0)).current;
  const color = useRef(new Animated.Value(0)).current;
  const transform = useRef(new Animated.Value(0)).current;
  const footer = useRef(new Animated.Value(0)).current;
  const [animationFinished, setAnimationFinished] = useState(false);

  useEffect(() => {
    const animation = Animated.sequence([
      Animated.delay(180),
      Animated.spring(intro, {
        toValue: 1,
        damping: 16,
        stiffness: 95,
        mass: 0.9,
        useNativeDriver: true,
      }),
      Animated.parallel([
        Animated.timing(color, {
          toValue: 1,
          duration: 620,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(transform, {
          toValue: 1,
          duration: 820,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
      Animated.timing(footer, {
        toValue: 1,
        duration: 360,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.delay(520),
    ]);

    animation.start(({ finished }) => setAnimationFinished(finished));
    return () => animation.stop();
  }, [color, footer, intro, transform]);

  useEffect(() => {
    if (!animationFinished || status === 'initializing') return;
    router.replace(user ? '/(tabs)' : '/login');
  }, [animationFinished, router, status, user]);

  const markScale = intro.interpolate({
    inputRange: [0, 1],
    outputRange: [0.82, 1],
  });
  const markOpacity = transform.interpolate({
    inputRange: [0, 0.64, 1],
    outputRange: [1, 1, 0],
  });
  const fullLogoOpacity = transform.interpolate({
    inputRange: [0, 0.44, 1],
    outputRange: [0, 0, 1],
  });
  const fullLogoTranslateY = transform.interpolate({
    inputRange: [0, 1],
    outputRange: [14, 0],
  });
  const fullLogoScale = transform.interpolate({
    inputRange: [0, 1],
    outputRange: [0.96, 1],
  });
  const glowOpacity = color.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.18],
  });
  const loaderScale = Animated.multiply(
    color.interpolate({ inputRange: [0, 1], outputRange: [0.18, 1] }),
    footer.interpolate({ inputRange: [0, 1], outputRange: [0.65, 1] }),
  );

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.glow, { opacity: glowOpacity }]} />

      <View style={styles.logoStage}>
        <Animated.View
          style={[
            styles.markLayer,
            {
              opacity: markOpacity,
              transform: [{ scale: markScale }],
            },
          ]}>
          <BrandLogo size={92} monochrome layout="mark" onDark />
          <Animated.View style={[styles.markOverlay, { opacity: color }]}>
            <BrandLogo size={92} layout="mark" onDark />
          </Animated.View>
        </Animated.View>

        <Animated.View
          style={[
            styles.fullLogoLayer,
            {
              opacity: fullLogoOpacity,
              transform: [{ translateY: fullLogoTranslateY }, { scale: fullLogoScale }],
            },
          ]}>
          <BrandLogo size={84} onDark />
        </Animated.View>
      </View>

      <Animated.View style={[styles.footer, { opacity: footer }]}>
        <View style={styles.loaderTrack}>
          <Animated.View
            style={[
              styles.loaderFill,
              {
                transform: [
                  {
                    scaleX: loaderScale,
                  },
                ],
              },
            ]}
          />
        </View>
        <Text style={styles.footerText}>ENERGIA SOB SEU CONTROLE</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000', alignItems: 'center', justifyContent: 'center' },
  glow: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: brand.green,
    shadowColor: brand.green,
    shadowOpacity: 0.4,
    shadowRadius: 48,
  },
  logoStage: {
    width: 240,
    height: 184,
    alignItems: 'center',
    justifyContent: 'center',
  },
  markLayer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  markOverlay: { position: 'absolute', inset: 0, alignItems: 'center', justifyContent: 'center' },
  fullLogoLayer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: { position: 'absolute', bottom: 56, alignItems: 'center', gap: 14 },
  loaderTrack: {
    width: 132,
    height: 3,
    borderRadius: 2,
    backgroundColor: '#1B2722',
    overflow: 'hidden',
  },
  loaderFill: {
    width: '100%',
    height: '100%',
    backgroundColor: brand.green,
    borderRadius: 2,
    transformOrigin: 'left',
  },
  footerText: { color: '#6F7B75', fontSize: 9, fontWeight: '700', letterSpacing: 2.2 },
});
