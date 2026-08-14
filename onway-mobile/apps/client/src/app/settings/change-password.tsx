import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Screen } from '@/components/screen';
import { SettingsHeader } from '@/components/settings-header';
import { SymbolIcon } from '@/components/symbol-icon';
import { Button, Card, Field } from '@/components/ui';
import { brand, radius, spacing } from '@/constants/theme';
import { useAuth } from '@/contexts/auth-context';
import { useOnWayTheme } from '@/contexts/theme-context';
import { apiErrorMessage, mobileApi } from '@/services/mobile-api';

const MIN_LENGTH = 8;

export default function ChangePasswordScreen() {
  const router = useRouter();
  const { colors } = useOnWayTheme();
  const { user, markPasswordChanged, logout } = useAuth();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [requestError, setRequestError] = useState<string | null>(null);

  const forced = Boolean(user?.mustChangePassword);

  const currentError = submitted && !current ? 'Informe sua senha atual.' : undefined;
  const nextError = submitted && next.length < MIN_LENGTH
    ? `Use pelo menos ${MIN_LENGTH} caracteres.`
    : undefined;
  const confirmError = submitted && confirm !== next ? 'As senhas não coincidem.' : undefined;

  async function handleSubmit() {
    setSubmitted(true);
    if (!current || next.length < MIN_LENGTH || confirm !== next) return;
    setLoading(true);
    setRequestError(null);
    try {
      await mobileApi.changePassword(current, next);
      markPasswordChanged();
      setDone(true);
    } catch (error) {
      setRequestError(apiErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  async function handleLogout() {
    try {
      await logout();
    } finally {
      router.replace('/login');
    }
  }

  function handleFinish() {
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)');
  }

  if (done) {
    return (
      <Screen>
        <SettingsHeader title="Redefinir senha" />
        <Card style={styles.successCard}>
          <View style={[styles.successIcon, { backgroundColor: colors.accentSoft }]}>
            <SymbolIcon ios="checkmark.shield.fill" android="verified_user" color={colors.accent} size={40} fallback="✓" />
          </View>
          <Text style={[styles.successTitle, { color: colors.text }]}>Senha redefinida</Text>
          <Text style={[styles.successText, { color: colors.textSecondary }]}>
            Sua senha foi alterada com sucesso. Use a nova senha no próximo acesso.
          </Text>
          <Button label="Concluir" onPress={handleFinish} />
        </Card>
      </Screen>
    );
  }

  const toggle = (
    <Pressable accessibilityLabel={show ? 'Ocultar senhas' : 'Mostrar senhas'} hitSlop={12} onPress={() => setShow((value) => !value)}>
      <SymbolIcon ios={show ? 'eye.slash' : 'eye'} android={show ? 'visibility_off' : 'visibility'} color={colors.textSecondary} size={21} fallback={show ? '◉' : '○'} />
    </Pressable>
  );

  return (
    <Screen>
      <SettingsHeader title="Redefinir senha" />
      <Text style={[styles.title, { color: colors.text }]}>Criar uma nova senha</Text>
      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Escolha uma senha forte com pelo menos {MIN_LENGTH} caracteres.</Text>

      {forced ? (
        <View style={[styles.note, { backgroundColor: `${brand.warning}22` }]}>
          <SymbolIcon ios="key.fill" android="key" color={brand.warning} size={16} fallback="!" />
          <Text style={[styles.noteText, { color: colors.text }]}>
            Por segurança, você precisa definir uma nova senha antes de continuar usando o aplicativo.
          </Text>
        </View>
      ) : null}

      <Card style={[styles.form, forced && { marginTop: spacing.lg }]}>
        <Field
          label="Senha atual"
          placeholder="Sua senha atual"
          secureTextEntry={!show}
          textContentType="password"
          value={current}
          onChangeText={setCurrent}
          error={currentError}
          right={toggle}
        />
        <Field
          label="Nova senha"
          placeholder="Nova senha"
          secureTextEntry={!show}
          textContentType="newPassword"
          value={next}
          onChangeText={setNext}
          error={nextError}
        />
        <Field
          label="Confirmar nova senha"
          placeholder="Repita a nova senha"
          secureTextEntry={!show}
          textContentType="newPassword"
          value={confirm}
          onChangeText={setConfirm}
          error={confirmError}
          onSubmitEditing={handleSubmit}
        />
        <Button label="Salvar nova senha" onPress={handleSubmit} loading={loading} />

        {requestError ? (
          <View style={[styles.errorNote, { backgroundColor: `${brand.danger}16` }]}>
            <SymbolIcon ios="exclamationmark.circle" android="error" color={brand.danger} size={17} fallback="!" />
            <Text style={styles.errorText}>{requestError}</Text>
          </View>
        ) : null}
      </Card>

      {forced ? (
        <Pressable onPress={handleLogout} style={styles.logoutButton}>
          <Text style={[styles.logoutText, { color: colors.textSecondary }]}>Sair da conta</Text>
        </Pressable>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 26, fontWeight: '800', letterSpacing: -0.6 },
  subtitle: { fontSize: 14, lineHeight: 20, marginTop: 5, marginBottom: spacing.xl },
  form: { gap: spacing.lg },
  note: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start', borderRadius: radius.md, padding: spacing.md },
  noteText: { flex: 1, fontSize: 12, lineHeight: 17 },
  errorNote: { borderRadius: radius.md, padding: spacing.md, flexDirection: 'row', gap: 9, alignItems: 'center' },
  errorText: { flex: 1, color: brand.danger, fontSize: 12, lineHeight: 17 },
  logoutButton: { alignSelf: 'center', marginTop: spacing.xl, paddingVertical: 8, paddingHorizontal: 16 },
  logoutText: { fontSize: 13, fontWeight: '700' },
  successCard: { alignItems: 'center', gap: spacing.lg, paddingVertical: spacing.xxl, marginTop: spacing.lg },
  successIcon: { width: 76, height: 76, borderRadius: 38, alignItems: 'center', justifyContent: 'center' },
  successTitle: { fontSize: 20, fontWeight: '800' },
  successText: { fontSize: 13, lineHeight: 20, textAlign: 'center', maxWidth: 300 },
});
