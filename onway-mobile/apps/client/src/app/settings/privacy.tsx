import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Screen } from '@/components/screen';
import { SettingsHeader } from '@/components/settings-header';
import { SymbolIcon } from '@/components/symbol-icon';
import { Card } from '@/components/ui';
import { brand, spacing } from '@/constants/theme';
import { useOnWayTheme } from '@/contexts/theme-context';

export default function PrivacyScreen() {
  const router = useRouter();
  const { colors } = useOnWayTheme();

  return (
    <Screen>
      <SettingsHeader title="Privacidade e termos" />
      <Text accessibilityRole="header" style={[styles.title, { color: colors.text }]}>Seus dados, com clareza</Text>
      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Resumo das regras aplicáveis ao aplicativo.</Text>
      <Card style={styles.card}>
        <Section title="Política de privacidade" text="A OnWay utilizará os dados necessários para autenticação, exibição das usinas vinculadas, suporte e segurança da conta. O aplicativo não deve expor informações de outros clientes." />
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
        <Section title="Termos de uso" text="O aplicativo apresenta dados recebidos dos fabricantes. Horários de atualização e indisponibilidades devem ser informados claramente ao cliente." />
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
        <Section title="Seus direitos" text="Você poderá solicitar acesso, correção e exclusão conforme as regras de retenção e as obrigações legais da empresa." />
      </Card>
      <Pressable
        accessibilityRole="button"
        accessible
        onPress={() => router.push('/settings/delete-account')}
        style={({ pressed }) => [styles.request, { borderColor: brand.danger }, pressed && { opacity: 0.7 }]}>
        <View style={styles.requestBody}>
          <Text style={styles.requestText}>Excluir minha conta</Text>
          <Text style={[styles.requestDetail, { color: colors.textSecondary }]}>
            Remove seu acesso e seus dados pessoais. Contrato e faturas são mantidos conforme a lei.
          </Text>
        </View>
        <SymbolIcon ios="chevron.right" android="chevron_right" color={brand.danger} size={16} fallback="›" />
      </Pressable>
      <Text style={[styles.note, { color: colors.textSecondary }]}>Os textos jurídicos definitivos deverão ser aprovados antes da publicação.</Text>
    </Screen>
  );
}

function Section({ title, text }: { title: string; text: string }) {
  const { colors } = useOnWayTheme();
  return <View><Text style={[styles.sectionTitle, { color: colors.text }]}>{title}</Text><Text style={[styles.sectionText, { color: colors.textSecondary }]}>{text}</Text></View>;
}

const styles = StyleSheet.create({
  title: { fontSize: 28, fontWeight: '800', letterSpacing: -0.7 },
  subtitle: { fontSize: 14, marginTop: 5, marginBottom: spacing.xl },
  card: { gap: spacing.lg },
  divider: { height: 1 },
  sectionTitle: { fontSize: 15, fontWeight: '800' },
  sectionText: { fontSize: 12, lineHeight: 19, marginTop: 7 },
  request: { minHeight: 70, flexDirection: 'row', alignItems: 'center', gap: spacing.md, borderWidth: 1, borderRadius: 16, marginTop: spacing.xl, padding: spacing.lg },
  requestBody: { flex: 1 },
  requestText: { color: brand.danger, fontSize: 14, fontWeight: '800' },
  requestDetail: { fontSize: 11, lineHeight: 16, marginTop: 4 },
  note: { fontSize: 10, lineHeight: 15, textAlign: 'center', marginTop: spacing.lg, paddingHorizontal: 20 },
});
