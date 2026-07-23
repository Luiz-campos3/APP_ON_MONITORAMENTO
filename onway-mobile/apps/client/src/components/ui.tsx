import type { PropsWithChildren, ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
  View,
} from 'react-native';

import { brand, radius, shadow, spacing } from '@/constants/theme';
import { useOnWayTheme } from '@/contexts/theme-context';

export function Card({ children, style }: PropsWithChildren<{ style?: StyleProp<ViewStyle> }>) {
  const { colors } = useOnWayTheme();
  return (
    <View
      style={[
        styles.card,
        shadow,
        { backgroundColor: colors.surface, borderColor: colors.border, shadowColor: colors.shadow },
        style,
      ]}>
      {children}
    </View>
  );
}

type ButtonProps = {
  label: string;
  onPress: () => void;
  icon?: ReactNode;
  variant?: 'primary' | 'secondary' | 'ghost';
  loading?: boolean;
  disabled?: boolean;
};

export function Button({
  label,
  onPress,
  icon,
  variant = 'primary',
  loading = false,
  disabled = false,
}: ButtonProps) {
  const { colors } = useOnWayTheme();
  const primary = variant === 'primary';
  const ghost = variant === 'ghost';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: primary ? brand.green : ghost ? 'transparent' : colors.surfaceMuted,
          borderColor: primary || ghost ? 'transparent' : colors.border,
          opacity: disabled ? 0.5 : pressed ? 0.82 : 1,
          transform: [{ scale: pressed ? 0.985 : 1 }],
        },
      ]}>
      {loading ? (
        <ActivityIndicator color={brand.white} />
      ) : (
        <>
          {icon}
          <Text style={[styles.buttonLabel, { color: primary ? brand.white : colors.text }]}>
            {label}
          </Text>
        </>
      )}
    </Pressable>
  );
}

type FieldProps = TextInputProps & {
  label: string;
  error?: string;
  right?: ReactNode;
};

export function Field({ label, error, right, style, ...inputProps }: FieldProps) {
  const { colors } = useOnWayTheme();
  return (
    <View style={styles.fieldGroup}>
      <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>{label}</Text>
      <View
        style={[
          styles.field,
          {
            backgroundColor: colors.input,
            borderColor: error ? brand.danger : colors.border,
          },
        ]}>
        <TextInput
          {...inputProps}
          placeholderTextColor={colors.textSecondary}
          selectionColor={brand.green}
          style={[styles.input, { color: colors.text }, style]}
        />
        {right}
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radius.lg, borderWidth: 1, padding: spacing.lg },
  button: {
    minHeight: 54,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    borderWidth: 1,
    paddingHorizontal: spacing.xl,
  },
  buttonLabel: { fontSize: 17, fontWeight: '700' },
  fieldGroup: { gap: 7 },
  fieldLabel: { fontSize: 13, fontWeight: '600', marginLeft: 2 },
  field: {
    minHeight: 54,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  input: { flex: 1, fontSize: 16, paddingVertical: 0 },
  error: { color: brand.danger, fontSize: 12, marginLeft: 2 },
});
