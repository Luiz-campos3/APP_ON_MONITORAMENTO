import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SymbolIcon } from '@/components/symbol-icon';
import { brand, radius } from '@/constants/theme';
import { useAlerts } from '@/contexts/alerts-context';
import { useOnWayTheme } from '@/contexts/theme-context';

const tabs = {
  index: { label: 'Início', ios: 'house.fill', android: 'home', fallback: '⌂' },
  plants: { label: 'Usinas', ios: 'chart.bar.xaxis', android: 'monitoring', fallback: '▥' },
  alerts: { label: 'Alertas', ios: 'bell.fill', android: 'notifications', fallback: '●' },
  support: { label: 'Suporte', ios: 'questionmark.circle.fill', android: 'help', fallback: '?' },
  profile: { label: 'Perfil', ios: 'person.crop.circle.fill', android: 'account_circle', fallback: '○' },
} as const;

export function FloatingTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { colors } = useOnWayTheme();
  const { unread: unreadAlertCount } = useAlerts();

  return (
    <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
      <View
        style={[
          styles.bar,
          {
            bottom: Math.max(insets.bottom, 10),
            backgroundColor: colors.tabBar,
            borderColor: colors.border,
            shadowColor: colors.shadow,
          },
        ]}>
        {state.routes.map((route, index) => {
          const focused = state.index === index;
          const tab = tabs[route.name as keyof typeof tabs] ?? tabs.index;
          const badge = route.name === 'alerts' ? unreadAlertCount : 0;

          return (
            <Pressable
              key={route.key}
              accessibilityRole="tab"
              accessibilityLabel={descriptors[route.key].options.tabBarAccessibilityLabel ?? tab.label}
              accessibilityState={{ selected: focused }}
              onPress={() => {
                const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
                if (!focused && !event.defaultPrevented) navigation.navigate(route.name, route.params);
              }}
              onLongPress={() => navigation.emit({ type: 'tabLongPress', target: route.key })}
              style={({ pressed }) => [styles.item, pressed && styles.pressed]}>
              <View style={[styles.iconPill, focused && { backgroundColor: colors.surfaceMuted }]}>
                <SymbolIcon
                  ios={tab.ios}
                  android={tab.android}
                  fallback={tab.fallback}
                  color={focused ? colors.accent : colors.tabInactive}
                  size={focused ? 23 : 21}
                />
                {badge > 0 ? (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{badge > 9 ? '9+' : badge}</Text>
                  </View>
                ) : null}
              </View>
              <Text style={[styles.label, { color: focused ? colors.text : colors.tabInactive }]}>{tab.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    left: 14,
    right: 14,
    height: 68,
    borderRadius: 29,
    borderWidth: 1,
    paddingHorizontal: 6,
    flexDirection: 'row',
    alignItems: 'center',
    shadowOpacity: 0.22,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 9 },
    elevation: 16,
  },
  item: { flex: 1, height: 58, alignItems: 'center', justifyContent: 'center', gap: 1 },
  pressed: { opacity: 0.66 },
  iconPill: { width: 48, height: 36, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  label: { fontSize: 9, fontWeight: '700' },
  badge: { position: 'absolute', top: 1, right: 3, minWidth: 16, height: 16, paddingHorizontal: 4, borderRadius: 8, backgroundColor: brand.danger, alignItems: 'center', justifyContent: 'center' },
  badgeText: { color: brand.white, fontSize: 9, fontWeight: '800' },
});
