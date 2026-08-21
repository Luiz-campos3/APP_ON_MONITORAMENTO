import { StyleSheet, Text, View } from 'react-native';

import { Screen } from '@/components/screen';
import { SettingsHeader } from '@/components/settings-header';
import { Card } from '@/components/ui';
import { brand, spacing } from '@/constants/theme';
import { useOnWayTheme } from '@/contexts/theme-context';

export default function PrivacyScreen() {
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
      <View style={[styles.request, { borderColor: brand.danger }]}>
        <Text style={styles.requestText}>Encerramento de conta indisponível pelo app</Text>
        <Text style={[styles.requestDetail, { color: colors.textSecondary }]}>
          A API atual não possui endpoint seguro para abertura ou acompanhamento dessa solicitação.
        </Text>
      </View>
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
  request: { minHeight: 70, borderWidth: 1, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginTop: spacing.xl, padding: spacing.md },
  requestText: { color: brand.danger, fontSize: 13, fontWeight: '800' },
  requestDetail: { fontSize: 10, lineHeight: 15, marginTop: 5, textAlign: 'center' },
  note: { fontSize: 10, lineHeight: 15, textAlign: 'center', marginTop: spacing.lg, paddingHorizontal: 20 },
});
