import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, LayoutAnimation, Linking, Pressable, StyleSheet, Text, View } from 'react-native';

import { AppHeader } from '@/components/app-header';
import { Screen } from '@/components/screen';
import { SymbolIcon } from '@/components/symbol-icon';
import { Card } from '@/components/ui';
import { supportContact } from '@/config/contact';
import { brand, spacing } from '@/constants/theme';
import { useOnWayTheme } from '@/contexts/theme-context';
import { useSupport } from '@/contexts/support-context';
import { TICKET_KINDS, ticketKindMeta } from '@/domain/support';

const faq = [
  {
    question: 'Como a geração é atualizada?',
    answer: 'A geração é sincronizada com o fabricante da usina. O horário da última leitura aparece no início e no detalhe da unidade.',
  },
  {
    question: 'O que significa usina offline?',
    answer: 'Significa que não recebemos uma leitura dentro do período esperado. Isso pode indicar falta de internet, indisponibilidade do fabricante ou uma interrupção local.',
  },
  {
    question: 'Como interpretar meu gráfico?',
    answer: 'Cada ponto representa a energia gerada no período indicado. Use os totais e a média para comparar o desempenho entre os dias.',
  },
  {
    question: 'Posso acessar mais de uma usina?',
    answer: 'Sim. Todas as usinas vinculadas à sua conta aparecem em “Usinas” e também no seletor da tela inicial.',
  },
];

export default function SupportScreen() {
  const router = useRouter();
  const { colors } = useOnWayTheme();
  const { tickets } = useSupport();
  const [expanded, setExpanded] = useState<number | null>(null);
  const openCount = tickets.filter((ticket) => !ticket.encerrado).length;

  function toggleFaq(index: number) {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded((current) => current === index ? null : index);
  }

  async function openContact(kind: 'whatsapp' | 'phone') {
    const value = supportContact[kind];
    if (!value) {
      Alert.alert('Canal ainda não configurado', `Adicione o número oficial em EXPO_PUBLIC_ONWAY_${kind === 'whatsapp' ? 'WHATSAPP' : 'PHONE'}.`);
      return;
    }
    const digits = value.replace(/\D/g, '');
    const url = kind === 'whatsapp'
      ? `https://wa.me/${digits}?text=${encodeURIComponent('Olá! Preciso de ajuda com minha usina.')}`
      : `tel:${digits}`;
    const supported = await Linking.canOpenURL(url);
    if (supported) await Linking.openURL(url);
    else Alert.alert('Não foi possível abrir este canal no aparelho.');
  }

  return (
    <Screen>
      <AppHeader />
      <Text accessibilityRole="header" style={[styles.title, { color: colors.text }]}>Como podemos ajudar?</Text>
      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Fale com a OnWay ou encontre uma resposta rápida.</Text>
      <View style={styles.channels}>
        <Card style={styles.channelCard}>
          <View style={[styles.channelIcon, { backgroundColor: colors.accentSoft }]}>
            <SymbolIcon ios="bubble.left.fill" android="chat" color={colors.accent} size={25} fallback="…" />
          </View>
          <Text style={[styles.channelTitle, { color: colors.text }]}>WhatsApp</Text>
          <Text style={[styles.channelText, { color: colors.textSecondary }]}>Atendimento rápido em horário comercial.</Text>
          <Pressable accessibilityRole="button" onPress={() => openContact('whatsapp')} style={({ pressed }) => [styles.channelButton, { backgroundColor: brand.green }, pressed && styles.pressed]}>
            <Text style={styles.channelButtonText}>Iniciar conversa</Text>
          </Pressable>
        </Card>
        <Card style={styles.channelCard}>
          <View style={[styles.channelIcon, { backgroundColor: '#E4EFFA' }]}>
            <SymbolIcon ios="phone.fill" android="call" color="#357EB9" size={25} fallback="☎" />
          </View>
          <Text style={[styles.channelTitle, { color: colors.text }]}>Telefone</Text>
          <Text style={[styles.channelText, { color: colors.textSecondary }]}>{supportContact.phoneDisplay}{'\n'}Segunda a sexta, das 8h às 18h.</Text>
          <Pressable accessibilityRole="button" onPress={() => openContact('phone')} style={({ pressed }) => [styles.channelButton, { backgroundColor: colors.surfaceMuted }, pressed && styles.pressed]}>
            <Text style={[styles.channelButtonText, { color: colors.text }]}>Ligar agora</Text>
          </Pressable>
        </Card>
      </View>
      <View style={styles.serviceHeader}>
        <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 0, marginBottom: 0 }]}>Abrir chamado</Text>
        <Pressable accessibilityRole="button" accessible onPress={() => router.push('/tickets')} style={({ pressed }) => [styles.myTicketsLink, pressed && styles.pressed]}>
          <Text style={[styles.myTicketsText, { color: colors.accent }]}>Meus chamados</Text>
          {openCount > 0 ? (
            <View style={[styles.countBadge, { backgroundColor: colors.accent }]}><Text style={styles.countBadgeText}>{openCount}</Text></View>
          ) : null}
        </Pressable>
      </View>
      <Card style={styles.serviceCard}>
        {TICKET_KINDS.map((kind, index) => {
          const meta = ticketKindMeta(kind);
          return (
            <Pressable
              key={kind}
              accessibilityRole="button"
              accessibilityLabel={kind === 'verificacao' ? 'Verificar sistema' : `Abrir chamado: ${meta.label}`}
              onPress={() => router.push(kind === 'verificacao' ? '/checkup' : `/tickets/new?kind=${kind}`)}
              style={({ pressed }) => [styles.serviceItem, index < TICKET_KINDS.length - 1 && { borderBottomColor: colors.border, borderBottomWidth: 1 }, pressed && { opacity: 0.62 }]}>
              <View style={[styles.serviceIcon, { backgroundColor: colors.accentSoft }]}>
                <SymbolIcon ios={meta.ios} android={meta.android} color={colors.accent} size={20} fallback="•" />
              </View>
              <View style={styles.serviceBody}>
                <Text style={[styles.serviceTitle, { color: colors.text }]}>{meta.label}</Text>
                <Text style={[styles.serviceText, { color: colors.textSecondary }]}>{meta.description}</Text>
              </View>
              <SymbolIcon ios="chevron.right" android="chevron_right" color={colors.textSecondary} size={17} fallback="›" />
            </Pressable>
          );
        })}
      </Card>

      <Text style={[styles.sectionTitle, { color: colors.text }]}>Perguntas frequentes</Text>
      <Card style={styles.faqCard}>
        {faq.map((item, index) => {
          const open = expanded === index;
          return (
            <Pressable
              key={item.question}
              accessibilityRole="button"
              accessibilityState={{ expanded: open }}
              onPress={() => toggleFaq(index)}
              style={[styles.faqItem, index < faq.length - 1 && { borderBottomColor: colors.border, borderBottomWidth: 1 }]}>
              <View style={styles.faqBody}>
                <Text style={[styles.faqText, { color: colors.text }]}>{item.question}</Text>
                {open ? <Text style={[styles.answer, { color: colors.textSecondary }]}>{item.answer}</Text> : null}
              </View>
              <SymbolIcon ios={open ? 'chevron.up' : 'chevron.right'} android={open ? 'expand_less' : 'chevron_right'} color={colors.textSecondary} size={17} fallback={open ? '⌃' : '›'} />
            </Pressable>
          );
        })}
      </Card>
      <Text style={[styles.emergency, { color: colors.textSecondary }]}>Para emergências elétricas, não toque nos equipamentos e procure imediatamente um profissional habilitado.</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 30, fontWeight: '800', letterSpacing: -0.8 },
  subtitle: { fontSize: 14, lineHeight: 20, marginTop: 5 },
  channels: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.xl },
  channelCard: { flex: 1, alignItems: 'flex-start', padding: 14 },
  channelIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  channelTitle: { fontSize: 15, fontWeight: '800', marginTop: 13 },
  channelText: { fontSize: 10, lineHeight: 15, marginTop: 5, minHeight: 45 },
  channelButton: { alignSelf: 'stretch', minHeight: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginTop: 13 },
  channelButtonText: { color: brand.white, fontSize: 10, fontWeight: '800' },
  pressed: { opacity: 0.68, transform: [{ scale: 0.98 }] },
  sectionTitle: { fontSize: 18, fontWeight: '800', marginTop: spacing.xxl, marginBottom: spacing.md },
  serviceHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.xxl, marginBottom: spacing.md },
  myTicketsLink: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  myTicketsText: { fontSize: 13, fontWeight: '700' },
  countBadge: { minWidth: 18, height: 18, borderRadius: 9, paddingHorizontal: 5, alignItems: 'center', justifyContent: 'center' },
  countBadgeText: { color: brand.white, fontSize: 10, fontWeight: '800' },
  serviceCard: { paddingVertical: 2 },
  serviceItem: { minHeight: 66, flexDirection: 'row', alignItems: 'center', gap: 12, marginHorizontal: 14, paddingVertical: 14 },
  serviceIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  serviceBody: { flex: 1, gap: 2 },
  serviceTitle: { fontSize: 13, fontWeight: '800' },
  serviceText: { fontSize: 10, lineHeight: 14 },
  faqCard: { paddingVertical: 2 },
  faqItem: { minHeight: 62, flexDirection: 'row', alignItems: 'center', gap: 12, marginHorizontal: 14, paddingVertical: 14 },
  faqBody: { flex: 1 },
  faqText: { fontSize: 13, fontWeight: '700' },
  answer: { fontSize: 11, lineHeight: 17, marginTop: 9 },
  emergency: { fontSize: 10, lineHeight: 16, textAlign: 'center', marginTop: spacing.xl, paddingHorizontal: 18 },
});
