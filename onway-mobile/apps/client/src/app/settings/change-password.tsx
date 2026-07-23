import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Screen } from '@/components/screen';
import { SettingsHeader } from '@/components/settings-header';
import { SymbolIcon } from '@/components/symbol-icon';
import { Button, Card, Field } from '@/components/ui';
import { radius, spacing } from '@/constants/theme';
import { useOnWayTheme } from '@/contexts/theme-context';

const MIN_LENGTH = 8;

export default function ChangePasswordScreen() {
  const router = useRouter();
  const { colors } = useOnWayTheme();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const currentError = submitted && !current ? 'Informe sua senha atual.' : undefined;
  const nextError = submitted && next.length < MIN_LENGTH
    ? `Use pelo menos ${MIN_LENGTH} caracteres.`
    : undefined;
  const confirmError = submitted && confirm !== next ? 'As senhas não coincidem.' : undefined;

  function handleSubmit() {
    setSubmitted(true);
    if (!current || next.length < MIN_LENGTH || confirm !== next) return;
    setLoading(true);
    // Mock: sem endpoint de troca de senha no backend ainda. Simula sucesso.
    setTimeout(() => {
      setLoading(false);
      setDone(true);
    }, 700);
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
            Sua nova senha foi registrada neste aparelho. A sincronização com o backend será ativada quando o endpoint estiver disponível.
          </Text>
          <Button label="Concluir" onPress={() => router.back()} />
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

      <Card style={styles.form}>
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
      </Card>

      <View style={[styles.note, { backgroundColor: colors.surfaceMuted }]}>
        <SymbolIcon ios="info.circle" android="info" color={colors.textSecondary} size={16} fallback="i" />
        <Text style={[styles.noteText, { color: colors.textSecondary }]}>
          Fluxo mockado: o backend ainda não expõe o endpoint de troca de senha. A tela já está pronta para conectar quando ele existir.
        </Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 26, fontWeight: '800', letterSpacing: -0.6 },
  subtitle: { fontSize: 14, lineHeight: 20, marginTop: 5, marginBottom: spacing.xl },
  form: { gap: spacing.lg },
  note: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start', borderRadius: radius.md, padding: spacing.md, marginTop: spacing.lg },
  noteText: { flex: 1, fontSize: 11, lineHeight: 16 },
  successCard: { alignItems: 'center', gap: spacing.lg, paddingVertical: spacing.xxl, marginTop: spacing.lg },
  successIcon: { width: 76, height: 76, borderRadius: 38, alignItems: 'center', justifyContent: 'center' },
  successTitle: { fontSize: 20, fontWeight: '800' },
  successText: { fontSize: 13, lineHeight: 20, textAlign: 'center', maxWidth: 300 },
});
