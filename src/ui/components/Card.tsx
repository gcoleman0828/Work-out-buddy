import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import { radius, space, usePalette } from '../theme';
import { AppText } from './AppText';

interface Props {
  title?: string;
  children: ReactNode;
  onPress?: () => void;
}

export function Card({ title, children, onPress }: Props) {
  const p = usePalette();
  const content = (
    <View
      style={{
        backgroundColor: p.card,
        borderColor: p.border,
        borderWidth: 1,
        borderRadius: radius.lg,
        padding: space.lg,
        gap: space.sm,
      }}
    >
      {title ? <AppText variant="label">{title.toUpperCase()}</AppText> : null}
      {children}
    </View>
  );
  return onPress ? (
    <Pressable onPress={onPress} accessibilityRole="button">
      {content}
    </Pressable>
  ) : (
    content
  );
}
