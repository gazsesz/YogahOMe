import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { AudioToggles } from '../components/AudioToggles';
import { Button, Chip, SectionTitle } from '../components/ui';
import { hasHungarianVoice, speak } from '../lib/audio';
import { toggle } from '../lib/filters';
import { PROFILE_CONDITIONS } from '../lib/profile';
import { C, WIDE } from '../lib/theme';
import { useProfile } from '../lib/useProfile';

const LEVELS: [1 | 2 | 3, string, string][] = [
  [1, 'Kezdő', 'Most ismerkedem a jógával, vagy rég gyakoroltam.'],
  [2, 'Középhaladó', 'Rendszeresen gyakorlok, az alappózokat ismerem.'],
  [3, 'Haladó', 'Évek óta gyakorlok, a nehezebb pózok is mennek.'],
];

/** Alapprofil: szint, krónikus panaszok, a gyakorlás hangjainak alapértéke. */
export default function ProfileScreen() {
  const { profile, update } = useProfile();
  const [huVoice, setHuVoice] = useState<boolean | null>(null);
  useEffect(() => {
    hasHungarianVoice().then(setHuVoice);
  }, []);

  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.bg }} contentContainerStyle={[st.content, WIDE]}>
      <Text style={st.lead}>Ezek az alapbeállításaid. Az új óráknál ezekből indulunk ki, de óránként módosíthatod őket.</Text>

      <SectionTitle>Szinted</SectionTitle>
      <View style={st.card}>
        {LEVELS.map(([v, name, desc]) => {
          const on = profile.level === v;
          return (
            <Pressable
              key={v}
              onPress={() => update({ level: v })}
              style={[st.levelRow, on && st.levelOn]}
              accessibilityRole="radio"
              accessibilityState={{ checked: on }}
            >
              <View style={[st.radio, on && st.radioOn]}>{on && <View style={st.radioDot} />}</View>
              <View style={{ flex: 1 }}>
                <Text style={st.levelName}>{name}</Text>
                <Text style={st.hint}>{desc}</Text>
              </View>
            </Pressable>
          );
        })}
      </View>

      <SectionTitle>Krónikus betegség, tartós panasz</SectionTitle>
      <Text style={st.hint}>
        Az új óráknál ezek alapból kímélve lesznek: a rájuk ellenjavallt gyakorlatok kimaradnak. Óránként ki is kapcsolhatod őket.
      </Text>
      <View style={st.wrap}>
        {PROFILE_CONDITIONS.map((c) => (
          <Chip key={c.id} label={c.name} active={profile.conditions.includes(c.id)} onPress={() => update({ conditions: toggle(profile.conditions, c.id) })} />
        ))}
      </View>
      {profile.conditions.length > 0 && (
        <Text style={st.warn}>Krónikus betegség vagy panasz esetén a gyakorlás előtt kérd ki orvosod véleményét.</Text>
      )}

      <SectionTitle>Gyakorlás közben</SectionTitle>
      <View style={st.card}>
        <AudioToggles value={profile} onChange={update} />
        <Text style={[st.hint, { marginTop: 10 }]}>
          Ez az alapérték. Egy óránál átállíthatod (a szerkesztőben vagy gyakorlás közben), és az az óra megjegyzi a saját beállítását.
        </Text>
        <Button
          label="Narráció kipróbálása"
          kind="secondary"
          onPress={() => speak('Szia! Én fogom vezetni a gyakorlást. Lélegezz mélyen, és kezdjük.')}
          style={{ marginTop: 12 }}
        />
        {huVoice === false && (
          <Text style={st.warn}>
            Ezen az eszközön nem találtunk magyar hangot. A telefon beállításaiban (Szövegfelolvasás, Text-to-speech) tölthetsz le magyar hangot; kisegítő lehetőséget nem kell bekapcsolni.
          </Text>
        )}
      </View>

      <Pressable onPress={() => router.push('/nyilatkozat')} style={st.link} accessibilityRole="link">
        <Text style={st.linkText}>Felelősségi nyilatkozat ›</Text>
      </Pressable>
    </ScrollView>
  );
}

const st = StyleSheet.create({
  content: { padding: 16, paddingBottom: 32 },
  lead: { color: C.ink, fontSize: 15, lineHeight: 22 },
  card: { backgroundColor: C.surface, borderRadius: 16, borderWidth: 1, borderColor: C.line, padding: 12 },
  levelRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 10, borderRadius: 12 },
  levelOn: { backgroundColor: C.accentSoft },
  levelName: { fontSize: 15, fontWeight: '600', color: C.ink },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: C.line, alignItems: 'center', justifyContent: 'center' },
  radioOn: { borderColor: C.accent },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: C.accent },
  hint: { color: C.muted, fontSize: 13, lineHeight: 18, marginTop: 2 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 8 },
  warn: { marginTop: 10, backgroundColor: C.warnSoft, color: C.warn, borderRadius: 12, padding: 10, fontSize: 13, lineHeight: 19 },
  link: { marginTop: 20, paddingVertical: 8 },
  linkText: { color: C.accent, fontWeight: '600', fontSize: 15 },
});
