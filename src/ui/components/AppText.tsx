import type { ReactNode } from 'react';
import { Text, type TextProps } from 'react-native';
import { fontSize, usePalette } from '../theme';

export type TextVariant = 'body' | 'title' | 'muted' | 'small' | 'display' | 'label';

interface Props extends TextProps {
  variant?: TextVariant;
  color?: string;
  children?: ReactNode;
}

/** All on-screen text goes through here so type scale and colors stay consistent. */
export function AppText({ variant = 'body', color, style, ...rest }: Props) {
  const p = usePalette();
  const base = {
    body: { fontSize: fontSize.body, color: p.text },
    title: { fontSize: fontSize.title, color: p.text, fontWeight: '700' as const },
    display: { fontSize: fontSize.display, color: p.text, fontWeight: '700' as const },
    muted: { fontSize: fontSize.body, color: p.textMuted },
    small: { fontSize: fontSize.small, color: p.textMuted },
    label: { fontSize: fontSize.small, color: p.textMuted, fontWeight: '600' as const },
  }[variant];
  return <Text {...rest} style={[base, color ? { color } : null, style]} />;
}
