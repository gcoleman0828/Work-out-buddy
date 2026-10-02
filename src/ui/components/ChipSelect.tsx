import { Pressable, View } from 'react-native';
import { radius, space, usePalette } from '../theme';
import { AppText } from './AppText';

interface Props<T extends string> {
  label?: string;
  options: readonly T[];
  value: T;
  onChange: (value: T) => void;
  /** Turn an option value into display text. */
  render?: (value: T) => string;
}

/** Single-choice selector shown as wrapping chips (used instead of a native dropdown). */
export function ChipSelect<T extends string>({ label, options, value, onChange, render }: Props<T>) {
  const p = usePalette();
  return (
    <View style={{ gap: space.xs }}>
      {label ? <AppText variant="label">{label}</AppText> : null}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
        {options.map((option) => {
          const selected = option === value;
          return (
            <Pressable
              key={option}
              onPress={() => onChange(option)}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              style={{
                paddingVertical: space.xs + 2,
                paddingHorizontal: space.md,
                borderRadius: radius.lg,
                borderWidth: 1,
                borderColor: selected ? p.primary : p.border,
                backgroundColor: selected ? p.primary : p.card,
              }}
            >
              <AppText variant="small" color={selected ? p.onPrimary : p.text}>
                {render ? render(option) : option}
              </AppText>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
