import { Pressable } from 'react-native';
import { radius, space, usePalette } from '../theme';
import { AppText } from './AppText';

export type ButtonVariant = 'primary' | 'secondary' | 'danger';

interface Props {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  /** Smaller padding, for inline controls. */
  compact?: boolean;
}

export function AppButton({ label, onPress, variant = 'primary', disabled, compact }: Props) {
  const p = usePalette();
  const bg = variant === 'primary' ? p.primary : variant === 'danger' ? p.danger : 'transparent';
  const fg = variant === 'secondary' ? p.primary : variant === 'danger' ? '#FFFFFF' : p.onPrimary;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      style={({ pressed }) => ({
        backgroundColor: bg,
        borderColor: variant === 'secondary' ? p.primary : bg,
        borderWidth: 1,
        borderRadius: radius.md,
        paddingVertical: compact ? space.sm : space.md,
        paddingHorizontal: compact ? space.md : space.lg,
        alignItems: 'center',
        opacity: disabled ? 0.45 : pressed ? 0.8 : 1,
      })}
    >
      <AppText color={fg} style={{ fontWeight: '600' }}>
        {label}
      </AppText>
    </Pressable>
  );
}
