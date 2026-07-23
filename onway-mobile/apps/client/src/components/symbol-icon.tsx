import { SymbolView, type SFSymbol } from 'expo-symbols';
import { Text, type ColorValue } from 'react-native';

type SymbolIconProps = {
  ios: SFSymbol;
  android: string;
  color: ColorValue;
  size?: number;
  fallback?: string;
};

export function SymbolIcon({
  ios,
  android: _android,
  color,
  size = 22,
  fallback = '•',
}: SymbolIconProps) {
  return (
    <SymbolView
      name={ios}
      tintColor={color}
      size={size}
      fallback={<Text style={{ color, fontSize: size * 0.8 }}>{fallback}</Text>}
    />
  );
}
