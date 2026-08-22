import { useRouter } from 'expo-router';
import { Alert, Linking, Pressable, StyleSheet, Text, View } from 'react-native';

import { BrandLogo } from '@/components/brand-logo';
import { Screen } from '@/components/screen';
import { SymbolIcon } from '@/components/symbol-icon';
import { Button, Card } from '@/components/ui';
import { supportContact } from '@/config/contact';
import { brand, spacing } from '@/constants/theme';
import { useOnWayTheme } from '@/contexts/theme-context';

// Por decisão de segurança não existe redefinição self-service: a senha é
// redefinida pela equipe OnWay, que entrega uma senha temporária ao cliente.
export default function ForgotPasswordScreen() {
  const router = useRouter();
  const { colors } = useOnWayTheme();

  async function openContact(kind: 'whatsapp' | 'phone') {
    const raw = kind === 'whatsapp' ? supportContact.whatsapp : supportContact.phone;
    const digits = raw.replace(/\D/g, '');
    if (!digits) {
      Alert.alert('Canal ainda não configurado', `Adicione o número oficial em EXPO_PUBLIC_ONWAY_${kind === 'whatsapp' ? 'WHATSAPP' : 'PHONE'}.`);
      return;
    }
    const url = kind === 'whatsapp'
      ? `https://wa.me/${digits}?text=${encodeURIComponent('Olá! Esqueci a senha do aplicativo OnWay Cliente e preciso redefinir meu acesso.')}`
      : `tel:${digits}`;
    const supported = await Linking.canOpenURL(url);
    if (supported) await Linking.openURL(url);
  }

  return (
    <Screen contentStyle={styles.screen}>
      <View style={styles.header}>
        <Pressable accessibilityRole="button" accessibilityLabel="Voltar" onPress={() => router.back()} style={styles.back}>
          <SymbolIcon ios="chevron.left" android="arrow_back" color={colors.text} size={22} fallback="‹" />
        </Pressable>
        <BrandLogo size={38} layout="horizontal" />
        <View style={styles.back} />
      </View>

      <View style={styles.content}>
        <Text accessibilityRole="header" style={[styles.title, { color: colors.text }]}>Recuperar acesso</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Por segurança, a redefinição de senha é feita pela equipe OnWay. Fale com a gente por um dos
          canais abaixo e enviaremos uma senha temporária para você trocar no primeiro acesso.
        </Text>

        <Card style={styles.card}>
          <Pressable
            accessibilityRole="button"
            onPress={() => openContact('whatsapp')}
            style={({ pressed }) => [styles.channel, { backgroundColor: brand.green }, pressed && styles.pressed]}>
            <SymbolIcon ios="message.fill" android="chat" color={brand.white} size={20} fallback="✆" />
            <Text style={styles.channelText}>Falar no WhatsApp</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={() => openContact('phone')}
            style={({ pressed }) => [styles.channel, { backgroundColor: colors.surfaceMuted }, pressed && styles.pressed]}>
            <SymbolIcon ios="phone.fill" android="call" color={colors.text} size={20} fallback="✆" />
            <Text style={[styles.channelText, { color: colors.text }]}>Ligar para {supportContact.phoneDisplay}</Text>
          </Pressable>
        </Card>

        <Button label="Voltar ao login" variant="secondary" onPress={() => router.replace('/login')} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { minHeight: '100%' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  back: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center' },
  content: { flex: 1, justifyContent: 'center', paddingBottom: 60, gap: spacing.xl },
  title: { fontSize: 30, fontWeight: '800', letterSpacing: -0.8 },
  subtitle: { fontSize: 15, lineHeight: 22, marginTop: -10 },
  card: { gap: spacing.md },
  channel: { minHeight: 52, borderRadius: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingHorizontal: spacing.lg },
  channelText: { color: brand.white, fontSize: 14, fontWeight: '800' },
  pressed: { opacity: 0.85 },
});
