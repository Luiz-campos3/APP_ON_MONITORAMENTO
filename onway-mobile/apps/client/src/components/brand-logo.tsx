import { Image, StyleSheet, View, type ImageSourcePropType } from 'react-native';

import { useOnWayTheme } from '@/contexts/theme-context';

type BrandLogoProps = {
  size?: number;
  monochrome?: boolean;
  layout?: 'horizontal' | 'stacked' | 'mark';
  onDark?: boolean;
};

type Crop = {
  source: ImageSourcePropType;
  imageWidth: number;
  imageHeight: number;
  x: number;
  y: number;
  width: number;
  height: number;
};

const mark = require('../../assets/brand/logo-mark.png');

const horizontalOnDark: Crop = {
  source: require('../../assets/brand/logo-horizontal-on-dark.png'),
  imageWidth: 1626,
  imageHeight: 1626,
  x: 132,
  y: 602,
  width: 1363,
  height: 353,
};

const horizontalOnLight: Crop = {
  source: require('../../assets/brand/logo-horizontal-on-light.png'),
  imageWidth: 1626,
  imageHeight: 1626,
  x: 78,
  y: 717,
  width: 1367,
  height: 353,
};

const stackedOnLight: Crop = {
  source: require('../../assets/brand/logo-stacked-on-light.png'),
  imageWidth: 1626,
  imageHeight: 1626,
  x: 352,
  y: 387,
  width: 953,
  height: 675,
};

const stackedOnDark: Crop = {
  source: require('../../assets/brand/logo-stacked-on-dark.png'),
  imageWidth: 1626,
  imageHeight: 1315,
  x: 201,
  y: 207,
  width: 1168,
  height: 826,
};

export function BrandLogo({
  size = 72,
  monochrome = false,
  layout = 'stacked',
  onDark = false,
}: BrandLogoProps) {
  const { mode } = useOnWayTheme();
  const darkBackground = onDark || mode === 'dark';

  if (layout === 'mark') {
    return <OfficialMark size={size} opacity={monochrome ? 0.3 : 1} />;
  }

  const crop = layout === 'horizontal'
    ? darkBackground ? horizontalOnDark : horizontalOnLight
    : darkBackground ? stackedOnDark : stackedOnLight;
  const contentHeight = layout === 'stacked' ? size * 1.5 : size;
  const scale = contentHeight / crop.height;
  const contentWidth = crop.width * scale;

  if (monochrome) {
    return (
      <View style={{ width: contentWidth, height: contentHeight, alignItems: 'center', justifyContent: 'center' }}>
        <OfficialMark size={Math.min(size, contentHeight * 0.9)} opacity={0.3} />
      </View>
    );
  }

  return (
    <View
      accessibilityRole="image"
      accessibilityLabel="OnWay Energy"
      style={{ width: contentWidth, height: contentHeight, overflow: 'hidden' }}>
      <Image
        source={crop.source}
        resizeMode="stretch"
        style={[
          styles.image,
          {
            width: crop.imageWidth * scale,
            height: crop.imageHeight * scale,
            left: -crop.x * scale,
            top: -crop.y * scale,
          },
        ]}
      />
    </View>
  );
}

function OfficialMark({ size, opacity }: { size: number; opacity: number }) {
  const monochrome = opacity < 1;

  return (
    <Image
      source={mark}
      resizeMode="contain"
      accessibilityLabel="Símbolo da OnWay Energy"
      style={{ width: size, height: size, opacity, tintColor: monochrome ? '#9DA3A6' : undefined }}
    />
  );
}

const styles = StyleSheet.create({
  image: { position: 'absolute' },
});
