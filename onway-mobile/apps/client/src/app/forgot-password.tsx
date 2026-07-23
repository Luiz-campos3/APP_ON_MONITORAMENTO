import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { BrandLogo } from '@/components/brand-logo';
import { Screen } from '@/components/screen';
import { SymbolIcon } from '@/components/symbol-icon';
import { Button, Card, Field } from '@/components/ui';
import { spacing } from '@/constants/theme';
import { useOnWayTheme } from '@/contexts/theme-context';

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const { colors } = useOnWayTheme();
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const emailError = submitted && !isValidEmail(email) ? 'Informe um e-mail válido.' : undefined;

  function handleSubmit() {
    setSubmitted(true);
    if (!isValidEmail(email)) return;
    setLoading(true);
    // Mock: sem endpoint de recuperação no backend ainda. Simula o envio.
    setTimeout(() => {
      setLoading(false);
      setSent(true);
    }, 700);
  }

  return (
    <Screen contentStyle={styles.screen}>
      <View style={styles.header}>
        <Pressable accessibilityLabel="Voltar" onPress={() => router.back()} style={styles.back}>
          <SymbolIcon ios="chevron.left" android="arrow_back" color={colors.text} size={22} fallback="‹" />
        </Pressable>
        <BrandLogo size={38} layout="horizontal" />
        <View style={styles.back} />
      </View>

      <View style={styles.content}>
        {sent ? (
          <Card style={styles.card}>
            <SymbolIcon ios="envelope.badge.fill" android="mark_email_read" color={colors.accent} size={46} fallback="@" />
            <Text style={[styles.cardTitle, { color: colors.text }]}>Verifique seu e-mail</Text>
            <Text style={[styles.cardText, { color: colors.textSecondary }]}>
              Se {email.trim()} estiver cadastrado, enviaremos as instruções para redefinir sua senha.
            </Text>
            <Button label="Voltar ao login" onPress={() => router.replace('/login')} />
          </Card>
        ) : (
          <>
            <Text style={[styles.title, { color: colors.text }]}>Recuperar acesso</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              Informe o e-mail da sua conta e enviaremos um link para redefinir a senha.
            </Text>
            <Card style={styles.form}>
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
                onSubmitEditing={handleSubmit}
              />
              <Button label="Enviar instruções" onPress={handleSubmit} loading={loading} />
            </Card>
            <Text style={[styles.note, { color: colors.textSecondary }]}>
              Fluxo mockado enquanto o endpoint de recuperação não está disponível no backend.
            </Text>
          </>
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { minHeight: '100%' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  back: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center' },
  content: { flex: 1, justifyContent: 'center', paddingBottom: 60 },
  title: { fontSize: 30, fontWeight: '800', letterSpacing: -0.8 },
  subtitle: { fontSize: 15, lineHeight: 22, marginTop: 10, marginBottom: spacing.xl },
  form: { gap: spacing.lg },
  note: { fontSize: 11, lineHeight: 16, textAlign: 'center', marginTop: spacing.lg, paddingHorizontal: 12 },
  card: { alignItems: 'center', gap: spacing.lg, padding: spacing.xl },
  cardTitle: { fontSize: 20, fontWeight: '800', textAlign: 'center' },
  cardText: { fontSize: 14, lineHeight: 20, textAlign: 'center', marginBottom: spacing.sm },
});
