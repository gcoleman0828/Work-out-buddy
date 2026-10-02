import { TextInput, type TextInputProps, View } from 'react-native';
import { fontSize, radius, space, usePalette } from '../theme';
import { AppText } from './AppText';

interface Props extends TextInputProps {
  label: string;
  error?: string | null;
}

/** Labelled text input with an inline error line. */
export function Field({ label, error, style, multiline, ...rest }: Props) {
  const p = usePalette();
  return (
    <View style={{ gap: space.xs }}>
      <AppText variant="label">{label}</AppText>
      <TextInput
        {...rest}
        multiline={multiline}
        placeholderTextColor={p.textMuted}
        accessibilityLabel={label}
        style={[
          {
            backgroundColor: p.card,
            color: p.text,
            borderColor: error ? p.danger : p.border,
            borderWidth: 1,
            borderRadius: radius.md,
            paddingHorizontal: space.md,
            paddingVertical: space.sm + 2,
            fontSize: fontSize.body,
            minHeight: multiline ? 96 : undefined,
            textAlignVertical: multiline ? 'top' : 'center',
          },
          style,
        ]}
      />
      {error ? <AppText variant="small" color={p.danger}>{error}</AppText> : null}
    </View>
  );
}
