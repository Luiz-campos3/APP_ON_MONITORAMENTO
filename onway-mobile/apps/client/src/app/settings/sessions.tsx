import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';

import { Screen } from '@/components/screen';
import { SettingsHeader } from '@/components/settings-header';
import { SymbolIcon } from '@/components/symbol-icon';
import { Button, Card } from '@/components/ui';
import { brand, radius, spacing } from '@/constants/theme';
import { useAuth } from '@/contexts/auth-context';
import { useOnWayTheme } from '@/contexts/theme-context';
import { toSessions, type Session } from '@/domain/session';
import { apiErrorMessage, mobileApi } from '@/services/mobile-api';

export default function SessionsScreen() {
  const { colors } = useOnWayTheme();
  const { logout } = useAuth();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null); // familyId em revogação ou 'others'

  const load = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      setSessions(toSessions(await mobileApi.getSessions()));
    } catch (loadError) {
      setError(apiErrorMessage(loadError));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const revoke = useCallback(
    async (session: Session) => {
      setBusy(session.familyId);
      setError(null);
      try {
        const result = await mobileApi.revokeSession(session.familyId);
        // Defensivo: se por algum motivo revogou a própria sessão, cai ao login.
        if (result.eraAtual) {
          await logout();
          return;
        }
        await load();
      } catch (revokeError) {
        setError(apiErrorMessage(revokeError));
      } finally {
        setBusy(null);
      }
    },
    [load, logout],
  );

  const revokeOthers = useCallback(async () => {
    setBusy('others');
    setError(null);
    try {
      await mobileApi.revokeOtherSessions();
      await load();
    } catch (revokeError) {
      setError(apiErrorMessage(revokeError));
    } finally {
      setBusy(null);
    }
  }, [load]);

  function confirmRevoke(session: Session) {
    Alert.alert('Encerrar sessão', `Desconectar "${session.device}"? Esse dispositivo precisará entrar de novo.`, [
      { text: 'Voltar', style: 'cancel' },
      { text: 'Encerrar', style: 'destructive', onPress: () => revoke(session) },
    ]);
  }

  function confirmRevokeOthers() {
    Alert.alert('Desconectar outros dispositivos', 'Todas as outras sessões serão encerradas. Este aparelho continua conectado.', [
      { text: 'Voltar', style: 'cancel' },
      { text: 'Desconectar', style: 'destructive', onPress: revokeOthers },
    ]);
  }

  const others = sessions.filter((session) => !session.isCurrent);

  return (
    <Screen refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={colors.accent} />}>
      <SettingsHeader title="Dispositivos e sessões" />
      <Text style={[styles.title, { color: colors.text }]}>Onde sua conta está conectada</Text>
      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Encerre acessos que você não reconhece.</Text>

      {loading && sessions.length === 0 ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.accent} size="large" />
        </View>
      ) : error && sessions.length === 0 ? (
        <Card style={styles.center}>
          <SymbolIcon ios="wifi.exclamationmark" android="wifi_off" color={brand.danger} size={32} fallback="!" />
          <Text style={[styles.stateText, { color: colors.textSecondary }]}>{error}</Text>
          <Button label="Tentar novamente" onPress={() => load()} />
        </Card>
      ) : (
        <>
          {error ? (
            <View style={[styles.errorNote, { backgroundColor: `${brand.danger}16` }]}>
              <SymbolIcon ios="exclamationmark.circle" android="error" color={brand.danger} size={16} fallback="!" />
              <Text style={styles.errorNoteText}>{error}</Text>
            </View>
          ) : null}

          <Card style={styles.list}>
            {sessions.map((session, index) => (
              <View key={session.familyId} style={[styles.row, index < sessions.length - 1 && { borderBottomColor: colors.border, borderBottomWidth: 1 }]}>
                <View style={[styles.icon, { backgroundColor: colors.surfaceMuted }]}>
                  <SymbolIcon ios="iphone" android="smartphone" color={session.isCurrent ? colors.accent : colors.textSecondary} size={22} fallback="□" />
                </View>
                <View style={styles.body}>
                  <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>{session.device}</Text>
                  <Text style={[styles.detail, { color: colors.textSecondary }]}>Último uso {session.lastUsedLabel} · {session.expiresLabel}</Text>
                  {session.isCurrent ? (
                    <Text style={[styles.current, { color: colors.accent }]}>ESTE APARELHO</Text>
                  ) : (
                    <Pressable disabled={busy !== null} onPress={() => confirmRevoke(session)} hitSlop={8} style={styles.revoke}>
                      {busy === session.familyId ? (
                        <ActivityIndicator color={brand.danger} size="small" />
                      ) : (
                        <Text style={[styles.revokeText, { color: brand.danger }]}>Encerrar sessão</Text>
                      )}
                    </Pressable>
                  )}
                </View>
              </View>
            ))}
          </Card>

          {others.length > 0 ? (
            <View style={styles.othersButton}>
              <Button
                label={busy === 'others' ? 'Desconectando…' : 'Desconectar outros dispositivos'}
                variant="ghost"
                loading={busy === 'others'}
                disabled={busy !== null}
                onPress={confirmRevokeOthers}
                icon={<SymbolIcon ios="rectangle.portrait.and.arrow.right" android="logout" color={brand.danger} size={17} fallback="⇥" />}
              />
            </View>
          ) : null}

          <Text style={[styles.note, { color: colors.textSecondary }]}>
            Encerrar uma sessão desconecta o dispositivo na próxima vez que ele acessar. A troca de senha encerra todas as sessões.
          </Text>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 28, fontWeight: '800', letterSpacing: -0.7 },
  subtitle: { fontSize: 14, marginTop: 5, marginBottom: spacing.xl },
  center: { alignItems: 'center', justifyContent: 'center', gap: spacing.md, paddingVertical: spacing.xxl },
  stateText: { fontSize: 13, textAlign: 'center', lineHeight: 19, maxWidth: 300 },
  errorNote: { borderRadius: radius.md, padding: spacing.md, flexDirection: 'row', gap: 9, alignItems: 'center', marginBottom: spacing.md },
  errorNoteText: { flex: 1, color: brand.danger, fontSize: 12, lineHeight: 17 },
  list: { paddingVertical: 0 },
  row: { minHeight: 80, flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: spacing.md },
  icon: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  body: { flex: 1, gap: 3 },
  name: { fontSize: 14, fontWeight: '700' },
  detail: { fontSize: 11 },
  current: { fontSize: 8, fontWeight: '800', letterSpacing: 0.8, marginTop: 2 },
  revoke: { marginTop: 4, alignSelf: 'flex-start' },
  revokeText: { fontSize: 12, fontWeight: '800' },
  othersButton: { marginTop: spacing.lg },
  note: { fontSize: 10, lineHeight: 15, textAlign: 'center', marginTop: spacing.lg, paddingHorizontal: 20 },
});
