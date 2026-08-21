import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { Screen } from '@/components/screen';
import { SettingsHeader } from '@/components/settings-header';
import { SymbolIcon } from '@/components/symbol-icon';
import { Button, Card, Field } from '@/components/ui';
import { brand, radius, spacing } from '@/constants/theme';
import { useAuth } from '@/contexts/auth-context';
import { useOnWayTheme } from '@/contexts/theme-context';
import { ApiError, apiErrorMessage, mobileApi, type AccountDeletionResult } from '@/services/mobile-api';

export default function DeleteAccountScreen() {
  const router = useRouter();
  const { colors } = useOnWayTheme();
  const { logout } = useAuth();
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AccountDeletionResult | null>(null);

  async function execute() {
    setLoading(true);
    setError(null);
    try {
      const deletion = await mobileApi.deleteAccount(password);
      setResult(deletion);
    } catch (deleteError) {
      // Senha atual errada usa a mesma semântica do change-password (403).
      if (deleteError instanceof ApiError && deleteError.code === 'SENHA_ATUAL_INVALIDA') {
        setError('Senha incorreta. Verifique e tente novamente.');
      } else {
        setError(apiErrorMessage(deleteError));
      }
      setLoading(false);
    }
  }

  function confirm() {
    if (!password) {
      setError('Digite sua senha para confirmar.');
      return;
    }
    Alert.alert(
      'Excluir minha conta',
      'Esta ação é imediata e não pode ser desfeita. Sua conta de acesso será excluída.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Excluir', style: 'destructive', onPress: () => { execute().catch(() => undefined); } },
      ],
    );
  }

  async function finish() {
    try {
      await logout();
    } finally {
      router.replace('/login');
    }
  }

  // Sucesso: mostra o que o servidor removeu e o que reteve (por lei), depois desloga.
  if (result) {
    return (
      <Screen>
        <SettingsHeader title="Conta excluída" />
        <Card style={styles.successCard}>
          <View style={[styles.successIcon, { backgroundColor: colors.accentSoft }]}>
            <SymbolIcon ios="checkmark.seal.fill" android="verified" color={colors.accent} size={30} fallback="✓" />
          </View>
          <Text accessibilityRole="header" style={[styles.successTitle, { color: colors.text }]}>Sua conta de acesso foi excluída</Text>
          <Text style={[styles.successText, { color: colors.textSecondary }]}>
            {result.sessoesRevogadas > 0 ? `${result.sessoesRevogadas} sessão(ões) encerrada(s). ` : ''}Você será desconectado agora.
          </Text>
        </Card>

        <Text style={[styles.blockTitle, { color: colors.text }]}>O que foi removido</Text>
        <Card style={styles.listCard}>
          {result.removido.map((item, index) => (
            <View accessible key={index} style={styles.listRow}>
              <SymbolIcon ios="minus.circle.fill" android="remove_circle" color={brand.danger} size={16} fallback="−" />
              <Text style={[styles.listText, { color: colors.text }]}>{item}</Text>
            </View>
          ))}
        </Card>

        {result.retido.length ? (
          <>
            <Text style={[styles.blockTitle, { color: colors.text }]}>O que é mantido (obrigação legal)</Text>
            <Card style={styles.listCard}>
              {result.retido.map((item, index) => (
                <View accessible key={index} style={styles.retainedRow}>
                  <Text style={[styles.retainedItem, { color: colors.text }]}>{item.item}</Text>
                  <Text style={[styles.retainedMeta, { color: colors.textSecondary }]}>{item.prazo} · {item.porque}</Text>
                </View>
              ))}
            </Card>
          </>
        ) : null}

        <Text style={[styles.policy, { color: colors.textSecondary }]}>Política {result.politicaVersao}</Text>
        <Button label="Concluir" onPress={() => { finish().catch(() => undefined); }} />
      </Screen>
    );
  }

  return (
    <Screen>
      <SettingsHeader title="Excluir conta" />
      <View style={[styles.warning, { borderColor: brand.danger, backgroundColor: `${brand.danger}0F` }]}>
        <SymbolIcon ios="exclamationmark.triangle.fill" android="warning" color={brand.danger} size={24} fallback="!" />
        <Text style={[styles.warningTitle, { color: colors.text }]}>Esta ação é permanente</Text>
      </View>

      <Card style={styles.card}>
        <Bullet text="Sua conta de acesso ao OnWay é excluída de forma imediata: nome, e-mail e telefone são removidos e todas as sessões, encerradas." />
        <Bullet text="Contrato, faturas e o histórico da sua usina pertencem à sua relação com a OnWay e são mantidos conforme as obrigações legais — a exclusão do app não os apaga." />
        <Bullet text="Não é possível desfazer. Se precisar acessar de novo, o suporte da OnWay pode emitir um novo login." />
      </Card>

      <Text style={[styles.label, { color: colors.textSecondary }]}>Confirme sua senha para excluir</Text>
      <Field
        label="Senha"
        placeholder="Sua senha atual"
        secureTextEntry
        autoCapitalize="none"
        autoCorrect={false}
        value={password}
        onChangeText={(text) => { setPassword(text); setError(null); }}
        error={error ?? undefined}
      />

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Excluir minha conta"
        disabled={loading}
        onPress={confirm}
        style={({ pressed }) => [styles.deleteButton, { backgroundColor: brand.danger, opacity: loading ? 0.6 : pressed ? 0.85 : 1 }]}>
        <Text style={styles.deleteText}>{loading ? 'Excluindo…' : 'Excluir minha conta'}</Text>
      </Pressable>

      <Pressable accessibilityRole="button" onPress={() => router.back()} style={styles.cancelButton} hitSlop={8}>
        <Text style={[styles.cancelText, { color: colors.accent }]}>Cancelar</Text>
      </Pressable>
    </Screen>
  );
}

function Bullet({ text }: { text: string }) {
  const { colors } = useOnWayTheme();
  return (
    <View accessible style={styles.bullet}>
      <View style={[styles.dot, { backgroundColor: colors.textSecondary }]} />
      <Text style={[styles.bulletText, { color: colors.text }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  warning: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, borderWidth: 1, borderRadius: radius.md, padding: spacing.lg, marginBottom: spacing.lg },
  warningTitle: { fontSize: 16, fontWeight: '800' },
  card: { gap: spacing.lg },
  bullet: { flexDirection: 'row', gap: spacing.md },
  dot: { width: 6, height: 6, borderRadius: 3, marginTop: 7 },
  bulletText: { flex: 1, fontSize: 13, lineHeight: 20 },
  label: { fontSize: 13, fontWeight: '700', marginTop: spacing.xl, marginBottom: spacing.sm },
  deleteButton: { minHeight: 54, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', marginTop: spacing.xl },
  deleteText: { color: brand.white, fontSize: 16, fontWeight: '800' },
  cancelButton: { alignSelf: 'center', marginTop: spacing.lg, paddingVertical: 8, paddingHorizontal: 16 },
  cancelText: { fontSize: 14, fontWeight: '700' },
  successCard: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xl },
  successIcon: { width: 62, height: 62, borderRadius: 21, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.sm },
  successTitle: { fontSize: 18, fontWeight: '800', textAlign: 'center' },
  successText: { fontSize: 13, lineHeight: 19, textAlign: 'center', maxWidth: 320 },
  blockTitle: { fontSize: 14, fontWeight: '800', marginTop: spacing.xl, marginBottom: spacing.sm },
  listCard: { gap: spacing.md },
  listRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  listText: { flex: 1, fontSize: 13, lineHeight: 19 },
  retainedRow: { gap: 3 },
  retainedItem: { fontSize: 13, fontWeight: '700' },
  retainedMeta: { fontSize: 11, lineHeight: 16 },
  policy: { fontSize: 10, textAlign: 'center', marginTop: spacing.lg, marginBottom: spacing.md },
});
