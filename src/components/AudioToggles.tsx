import { StyleSheet, Switch, Text, View } from 'react-native';
import type { AudioSettings } from '../lib/profile';
import { C } from '../lib/theme';

const ROWS: { key: keyof AudioSettings; label: string; hint: string }[] = [
  { key: 'narration', label: 'Narráció', hint: 'Magyar hang mondja a következő gyakorlatot és az első instrukciót.' },
  { key: 'sounds', label: 'Hangjelzés', hint: 'Gong a szakaszok végén, halk csengő pózváltáskor.' },
];

/** Narráció és hangjelzés kapcsolói (profilban, óránál és gyakorlás közben is). */
export function AudioToggles({
  value,
  onChange,
  dark,
  compact,
}: {
  value: AudioSettings;
  onChange: (patch: Partial<AudioSettings>) => void;
  dark?: boolean;
  compact?: boolean;
}) {
  const fg = dark ? '#ffffff' : C.ink;
  const sub = dark ? '#a9c4bf' : C.muted;
  return (
    <View style={compact ? st.compact : undefined}>
      {ROWS.map((r) => (
        <View key={r.key} style={[st.row, compact && st.rowCompact, !compact && { borderBottomColor: dark ? '#2b4a46' : C.line }]}>
          <View style={{ flex: 1 }}>
            <Text style={[st.label, { color: fg }]}>{r.label}</Text>
            {!compact && <Text style={[st.hint, { color: sub }]}>{r.hint}</Text>}
          </View>
          <Switch
            value={value[r.key]}
            onValueChange={(v) => onChange({ [r.key]: v })}
            trackColor={{ false: dark ? '#3a5450' : '#c9d6d1', true: dark ? C.saffron : C.accent }}
            thumbColor="#ffffff"
            {...({ activeThumbColor: '#ffffff' } as object)}
            accessibilityLabel={r.label}
          />
        </View>
      ))}
    </View>
  );
}

const st = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  compact: { flexDirection: 'row', gap: 16 },
  rowCompact: { flex: 1, paddingVertical: 4, borderBottomWidth: 0, gap: 8 },
  label: { fontSize: 15, fontWeight: '600' },
  hint: { fontSize: 13, marginTop: 2, lineHeight: 18 },
});
