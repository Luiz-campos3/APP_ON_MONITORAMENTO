import type { PropsWithChildren } from 'react';
import { ScrollView, StyleSheet, View, type ScrollViewProps, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { maxContentWidth, spacing } from '@/constants/theme';
import { useOnWayTheme } from '@/contexts/theme-context';
import { useResponsive } from '@/hooks/use-responsive';

type ScreenProps = PropsWithChildren<{
  scroll?: boolean;
  /** Permite congelar a rolagem vertical (ex.: durante um arraste horizontal em gráficos). */
  scrollEnabled?: boolean;
  contentStyle?: ViewStyle;
  refreshControl?: ScrollViewProps['refreshControl'];
}>;

export function Screen({ children, scroll = true, scrollEnabled = true, contentStyle, refreshControl }: ScreenProps) {
  const { colors } = useOnWayTheme();
  const { contentPadding } = useResponsive();
  const content = (
    <View style={[styles.content, { paddingHorizontal: contentPadding }, contentStyle]}>{children}</View>
  );

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['top']}>
      {scroll ? (
        <ScrollView
          scrollEnabled={scrollEnabled}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          refreshControl={refreshControl}>
          {content}
        </ScrollView>
      ) : (
        content
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  scrollContent: { flexGrow: 1, alignItems: 'center' },
  content: {
    width: '100%',
    maxWidth: maxContentWidth,
    paddingTop: spacing.md,
    paddingBottom: 120,
  },
});
