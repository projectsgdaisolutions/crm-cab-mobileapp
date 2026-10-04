import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Animated, Easing, Pressable, Text, View, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { colors, fonts } from '../theme';

let staggerQueue: Animated.CompositeAnimation[] = [];
let staggerFrame = 0;

function enqueueStagger(animation: Animated.CompositeAnimation) {
  staggerQueue.push(animation);
  if (staggerFrame) return;
  staggerFrame = requestAnimationFrame(() => {
    const batch = staggerQueue;
    staggerQueue = [];
    staggerFrame = 0;
    if (batch.length === 1) {
      batch[0].start();
      return;
    }
    Animated.stagger(70, batch).start();
  });
}

/** Cards rise in one after another. Position on the page does not change. */
export function RiseIn({ children }: { delay?: number; children: ReactNode }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(14)).current;

  useEffect(() => {
    enqueueStagger(
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: 340, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.timing(translateY, { toValue: 0, duration: 340, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      ]),
    );
  }, [opacity, translateY]);

  return <Animated.View style={{ opacity, transform: [{ translateY }] }}>{children}</Animated.View>;
}

/** Soft pulse for the call icon. The button size does not change. */
export function Pulse({ children }: { children: ReactNode }) {
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(scale, { toValue: 1.08, duration: 700, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(scale, { toValue: 1, duration: 700, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [scale]);

  return <Animated.View style={{ transform: [{ scale }] }}>{children}</Animated.View>;
}

/** A card shrinks slightly while the finger is down. */
export function PressScale({
  onPress,
  disabled,
  style,
  children,
}: {
  onPress?: () => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  children: ReactNode;
}) {
  const scale = useRef(new Animated.Value(1)).current;
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      onPressIn={() => Animated.spring(scale, { toValue: 0.97, useNativeDriver: true, speed: 50, bounciness: 0 }).start()}
      onPressOut={() => Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 20, bounciness: 6 }).start()}
    >
      <Animated.View style={[style, { transform: [{ scale }] }]}>{children}</Animated.View>
    </Pressable>
  );
}

/** Red ring that expands and fades around a missed-call avatar. */
export function PulseRing({ active, size, children }: { active: boolean; size: number; children: ReactNode }) {
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(0.75)).current;

  useEffect(() => {
    if (!active) return;
    const loop = Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(scale, { toValue: 1.55, duration: 1100, easing: Easing.out(Easing.quad), useNativeDriver: true }),
          Animated.timing(scale, { toValue: 1, duration: 0, useNativeDriver: true }),
        ]),
        Animated.sequence([
          Animated.timing(opacity, { toValue: 0, duration: 1100, easing: Easing.out(Easing.quad), useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 0.75, duration: 0, useNativeDriver: true }),
        ]),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [active, opacity, scale]);

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      {active ? (
        <Animated.View
          pointerEvents="none"
          style={{
            position: 'absolute',
            width: size,
            height: size,
            borderRadius: size / 2,
            borderWidth: 2,
            borderColor: colors.clay,
            opacity,
            transform: [{ scale }],
          }}
        />
      ) : null}
      {children}
    </View>
  );
}

/** Summary numbers tick up from 0. */
export function CountUp({ value, style }: { value: number; style?: StyleProp<TextStyle> }) {
  const [shown, setShown] = useState(0);
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    anim.setValue(0);
    const id = anim.addListener(({ value: next }) => setShown(Math.round(next)));
    Animated.timing(anim, { toValue: value, duration: 720, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
    return () => anim.removeListener(id);
  }, [anim, value]);

  return <Text style={style}>{shown}</Text>;
}

/** Missed-call count springs in with a small overshoot. */
export function BadgePop({ count }: { count: number }) {
  const scale = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (count <= 0) return;
    scale.setValue(0.2);
    Animated.spring(scale, { toValue: 1, friction: 3, tension: 160, useNativeDriver: true }).start();
  }, [count, scale]);

  if (count <= 0) return null;
  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        top: -4,
        right: -6,
        minWidth: 16,
        height: 16,
        borderRadius: 8,
        paddingHorizontal: 3,
        backgroundColor: colors.clay,
        alignItems: 'center',
        justifyContent: 'center',
        transform: [{ scale }],
      }}
    >
      <Text style={{ color: colors.white, fontFamily: fonts.bold, fontSize: 9 }}>{count > 9 ? '9+' : count}</Text>
    </Animated.View>
  );
}

/** Sync icon spins, then becomes a tick. */
export function SyncGlyph({ spinning, done }: { spinning: boolean; done: boolean }) {
  const spin = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!spinning) {
      spin.stopAnimation();
      spin.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.timing(spin, { toValue: 1, duration: 650, easing: Easing.linear, useNativeDriver: true }),
    );
    loop.start();
    return () => loop.stop();
  }, [spin, spinning]);

  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  return (
    <Animated.View style={{ transform: [{ rotate: spinning ? rotate : '0deg' }] }}>
      <Text style={{ color: colors.saffron, fontFamily: fonts.bold, fontSize: 14 }}>{done ? '✓' : '↻'}</Text>
    </Animated.View>
  );
}

/** "3 calls synced" slides up, then leaves. */
export function Toast({ message, onDone }: { message: string; onDone: () => void }) {
  const translateY = useRef(new Animated.Value(28)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(translateY, { toValue: 0, duration: 280, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 1, duration: 280, useNativeDriver: true }),
    ]).start();
    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(translateY, { toValue: 24, duration: 240, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0, duration: 240, useNativeDriver: true }),
      ]).start(({ finished }) => {
        if (finished) onDone();
      });
    }, 1600);
    return () => clearTimeout(timer);
  }, [message, onDone, opacity, translateY]);

  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: 20,
        right: 20,
        bottom: 24,
        backgroundColor: colors.hero,
        borderRadius: 14,
        paddingVertical: 12,
        paddingHorizontal: 16,
        opacity,
        transform: [{ translateY }],
      }}
    >
      <Text style={{ color: colors.white, fontFamily: fonts.semibold }}>{message}</Text>
    </Animated.View>
  );
}

/** Ring that fills around the play control while audio is playing. */
export function ProgressRing({ active, size = 28 }: { active: boolean; size?: number }) {
  const progress = useRef(new Animated.Value(0)).current;
  const radius = (size - 3) / 2;
  const circumference = 2 * Math.PI * radius;
  const [dashOffset, setDashOffset] = useState(circumference);

  useEffect(() => {
    progress.setValue(0);
    setDashOffset(circumference);
    if (!active) return;
    const id = progress.addListener(({ value }) => setDashOffset(circumference * (1 - value)));
    const loop = Animated.loop(
      Animated.timing(progress, { toValue: 1, duration: 1600, easing: Easing.linear, useNativeDriver: false }),
    );
    loop.start();
    return () => {
      loop.stop();
      progress.removeListener(id);
    };
  }, [active, circumference, progress]);

  return (
    <Svg width={size} height={size} style={{ position: 'absolute', transform: [{ rotate: '-90deg' }] }}>
      <Circle cx={size / 2} cy={size / 2} r={radius} stroke="#E7E9F2" strokeWidth={2} fill="none" />
      {active ? (
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={colors.forest}
          strokeWidth={2}
          fill="none"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
        />
      ) : null}
    </Svg>
  );
}

/** Equalizer bars bounce while a recording plays. */
export function Waveform({ active }: { active: boolean }) {
  const bar0 = useRef(new Animated.Value(0.35)).current;
  const bar1 = useRef(new Animated.Value(0.35)).current;
  const bar2 = useRef(new Animated.Value(0.35)).current;
  const bar3 = useRef(new Animated.Value(0.35)).current;
  const bar4 = useRef(new Animated.Value(0.35)).current;
  const bars = [bar0, bar1, bar2, bar3, bar4];

  useEffect(() => {
    if (!active) return;
    const loops = bars.map((bar, index) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(bar, { toValue: 1, duration: 280 + index * 40, delay: index * 70, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
          Animated.timing(bar, { toValue: 0.3, duration: 280 + index * 40, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        ]),
      ),
    );
    loops.forEach((loop) => loop.start());
    return () => loops.forEach((loop) => loop.stop());
    // The five bar values are stable refs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', height: 16, gap: 2 }}>
      {bars.map((bar, index) => (
        <Animated.View
          key={index}
          style={{ width: 3, height: 14, borderRadius: 2, backgroundColor: colors.forest, transform: [{ scaleY: active ? bar : 0.35 }] }}
        />
      ))}
    </View>
  );
}
