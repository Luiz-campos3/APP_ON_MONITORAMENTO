import { Tabs } from 'expo-router';

import { FloatingTabBar } from '@/components/floating-tab-bar';
import { useOnWayTheme } from '@/contexts/theme-context';

export default function TabLayout() {
  const { colors } = useOnWayTheme();

  return (
    <Tabs
      tabBar={(props) => <FloatingTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        tabBarHideOnKeyboard: true,
        sceneStyle: { backgroundColor: colors.background },
      }}>
      <Tabs.Screen name="index" options={{ title: 'Início' }} />
      <Tabs.Screen name="plants" options={{ title: 'Usinas' }} />
      <Tabs.Screen name="alerts" options={{ title: 'Alertas' }} />
      <Tabs.Screen name="support" options={{ title: 'Suporte' }} />
      <Tabs.Screen name="profile" options={{ title: 'Perfil' }} />
    </Tabs>
  );
}
