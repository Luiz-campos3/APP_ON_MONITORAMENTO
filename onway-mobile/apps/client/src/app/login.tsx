import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BrandLogo } from '@/components/brand-logo';
import { SymbolIcon } from '@/components/symbol-icon';
import { Button, Field } from '@/components/ui';
import { brand, maxContentWidth, radius, shadow, spacing } from '@/constants/theme';
import { useAuth } from '@/contexts/auth-context';
import { useOnWayTheme } from '@/contexts/theme-context';
import { apiErrorMessage } from '@/services/mobile-api';

export default function LoginScreen() {
  const router = useRouter();
  const { colors, mode, toggleTheme } = useOnWayTheme();
  const { bootstrapError, login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [requestError, setRequestError] = useState<string | null>(null);

  const emailError = submitted && !email.trim() ? 'Informe seu e-mail.' : undefined;
  const passwordError = submitted && !password ? 'Informe sua senha.' : undefined;

  async function handleLogin() {
    setSubmitted(true);
    if (!email.trim() || !password) return;
    setLoading(true);
    setRequestError(null);
    try {
      await login(email, password);
      router.replace('/(tabs)');
    } catch (error) {
      setRequestError(apiErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  const gradient =
    mode === 'dark'
      ? ([brand.greenDark, '#102018', '#000000', '#183527'] as const)
      : (['#DDEFEA', '#F4F7F5', '#FFFFFF', '#E4F0E9'] as const);

  return (
    <LinearGradient colors={gradient} locations={[0, 0.3, 0.66, 1]} style={styles.gradient}>
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView
            contentContainerStyle={styles.scroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}>
            <View style={styles.topBar}>
              <View />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Ativar modo ${mode === 'dark' ? 'claro' : 'escuro'}`}
                onPress={toggleTheme}
                style={[styles.themeButton, { backgroundColor: colors.surfaceMuted }]}>
                <SymbolIcon
                  ios={mode === 'dark' ? 'sun.max.fill' : 'moon.fill'}
                  android={mode === 'dark' ? 'light_mode' : 'dark_mode'}
                  color={colors.text}
                  size={20}
                  fallback={mode === 'dark' ? '☀' : '☾'}
                />
              </Pressable>
            </View>

            <View style={styles.brandArea}>
              <BrandLogo size={84} onDark={mode === 'dark'} />
              <Text style={[styles.welcome, { color: colors.text }]}>Bem-vindo de volta</Text>
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Acompanhe sua energia de onde estiver.</Text>
            </View>

            <View
              style={[
                styles.formCard,
                shadow,
                {
                  backgroundColor: mode === 'dark' ? 'rgba(7, 18, 14, 0.94)' : 'rgba(255, 255, 255, 0.94)',
                  borderColor: colors.border,
                  shadowColor: colors.shadow,
                },
              ]}>
              <Field
                label="E-mail"
                placeholder="voce@email.com"
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                textContentType="emailAddress"
                value={email}
                onChangeText={setEmail}
                error={emailError}
              />
              <Field
                label="Senha"
                placeholder="Sua senha"
                secureTextEntry={!showPassword}
                textContentType="password"
                value={password}
                onChangeText={setPassword}
                error={passwordError}
                onSubmitEditing={handleLogin}
                right={
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                    hitSlop={12}
                    onPress={() => setShowPassword((value) => !value)}>
                    <SymbolIcon
                      ios={showPassword ? 'eye.slash' : 'eye'}
                      android={showPassword ? 'visibility_off' : 'visibility'}
                      color={colors.textSecondary}
                      size={21}
                      fallback={showPassword ? '◉' : '○'}
                    />
                  </Pressable>
                }
              />

              <Pressable onPress={() => router.push('/forgot-password')} style={styles.forgotButton}>
                <Text style={[styles.forgotText, { color: colors.accent }]}>Esqueci minha senha</Text>
              </Pressable>

              <Button label="Entrar" onPress={handleLogin} loading={loading} />

              {requestError || bootstrapError ? (
                <View style={[styles.errorNote, { backgroundColor: `${brand.danger}16` }]}>
                  <SymbolIcon ios="exclamationmark.circle" android="error" color={brand.danger} size={17} fallback="!" />
                  <Text style={styles.errorText}>{requestError || bootstrapError}</Text>
                </View>
              ) : null}
            </View>

            <Text style={[styles.legal, { color: colors.textSecondary }]}>Ao entrar, você concorda com os Termos de Uso e a Política de Privacidade.</Text>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  safeArea: { flex: 1 },
  flex: { flex: 1 },
  scroll: {
    flexGrow: 1,
    width: '100%',
    maxWidth: maxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxl,
  },
  topBar: { minHeight: 50, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  themeButton: { width: 42, height: 42, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  brandArea: { alignItems: 'center', paddingTop: 12, paddingBottom: 28 },
  welcome: { fontSize: 27, fontWeight: '800', marginTop: 22, letterSpacing: -0.7 },
  subtitle: { fontSize: 15, marginTop: 7, textAlign: 'center' },
  formCard: { borderRadius: radius.xl, borderWidth: 1, padding: spacing.xl, gap: spacing.lg },
  forgotButton: { alignSelf: 'flex-end', marginTop: -4, paddingVertical: 2 },
  forgotText: { fontSize: 13, fontWeight: '700' },
  errorNote: { borderRadius: radius.md, padding: spacing.md, flexDirection: 'row', gap: 9, alignItems: 'center' },
  errorText: { flex: 1, color: brand.danger, fontSize: 12, lineHeight: 17 },
  legal: { fontSize: 11, lineHeight: 16, textAlign: 'center', marginTop: 22, paddingHorizontal: 22 },
});
