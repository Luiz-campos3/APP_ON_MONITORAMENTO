import { ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

import { OnWayThemeProvider, useOnWayTheme } from '@/contexts/theme-context';
import { AuthProvider, useAuth } from '@/contexts/auth-context';
import { ClientAppProvider } from '@/contexts/client-app-context';
import { ClientDataProvider } from '@/contexts/client-data-context';
import { SupportProvider } from '@/contexts/support-context';

SplashScreen.preventAutoHideAsync().catch(() => undefined);

function NavigationRoot() {
  const { colors, mode } = useOnWayTheme();
  const { status, user } = useAuth();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    SplashScreen.hideAsync().catch(() => undefined);
  }, []);

  useEffect(() => {
    if (status === 'initializing') return;
    const rootSegment = segments[0];
    const protectedRoute = rootSegment === '(tabs)' || rootSegment === 'plant' || rootSegment === 'settings' || rootSegment === 'tickets' || rootSegment === 'checkup' || rootSegment === 'invoices';
    if (!user && protectedRoute) router.replace('/login');
    if (user && rootSegment === 'login') router.replace('/(tabs)');
  }, [router, segments, status, user]);

  return (
    <ThemeProvider
      value={{
        dark: mode === 'dark',
        colors: {
          primary: colors.accent,
          background: colors.background,
          card: colors.surface,
          text: colors.text,
          border: colors.border,
          notification: colors.accent,
        },
        fonts: {
          regular: { fontFamily: 'System', fontWeight: '400' },
          medium: { fontFamily: 'System', fontWeight: '500' },
          bold: { fontFamily: 'System', fontWeight: '700' },
          heavy: { fontFamily: 'System', fontWeight: '800' },
        },
      }}>
      <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="login" />
        <Stack.Screen name="forgot-password" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="plant/[id]" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="settings/personal-data" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="settings/change-password" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="settings/notifications" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="settings/sessions" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="settings/privacy" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="tickets/index" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="tickets/new" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="tickets/[id]" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="checkup/index" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="invoices/new" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="invoices/[id]" options={{ animation: 'slide_from_right' }} />
      </Stack>
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <OnWayThemeProvider>
      <AuthProvider>
        <ClientDataProvider>
          <ClientAppProvider>
            <SupportProvider>
              <NavigationRoot />
            </SupportProvider>
          </ClientAppProvider>
        </ClientDataProvider>
      </AuthProvider>
    </OnWayThemeProvider>
  );
}
