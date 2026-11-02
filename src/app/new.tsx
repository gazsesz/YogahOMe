import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button, Chip, SectionTitle } from '../components/ui';
import { CONDITION_BY_ID } from '../lib/cautions';
import { phaseMinutes } from '../lib/generator';
import { AVOID_OPTIONS, DURATIONS, GOAL_BY_ID, GOALS } from '../lib/goals';
import { toggle } from '../lib/filters';
import { C, WIDE } from '../lib/theme';
import { useProfile } from '../lib/useProfile';

const LEVELS: [1 | 2 | 3, string][] = [
  [1, 'Kezdő'],
  [2, 'Középhaladó'],
  [3, 'Haladó'],
];

/** Új óra: cél, idő, szint, kímélendő területek → generálás. */
export default function NewClass() {
  const [goalId, setGoalId] = useState(GOALS[0].id);
  const [option, setOption] = useState<string | undefined>();
  const [minutes, setMinutes] = useState(20);
  const [level, setLevel] = useState<1 | 2 | 3>(1);
  const [avoid, setAvoid] = useState<string[]>([]);
  // A profil (szint, krónikus panaszok) adja a kiinduló értékeket; óránként módosíthatók.
  const { profile, loaded } = useProfile();
  const applied = useRef(false);
  useEffect(() => {
    if (!loaded || applied.current) return;
    applied.current = true;
    setLevel(profile.level);
    setAvoid(profile.conditions);
  }, [loaded, profile]);
  const avoidOptions = [...AVOID_OPTIONS, ...profile.conditions.filter((c) => !AVOID_OPTIONS.includes(c))];
  const goal = GOAL_BY_ID[goalId];
  const max = goal.maxMinutes ?? 999;
  const mins = Math.min(minutes, max);
  const [rah, warm, main, cool, relax] = phaseMinutes(mins, goal.mult);
  const fmt = (n: number) => String(n).replace('.', ',');

  const pickGoal = (id: string) => {
    setGoalId(id);
    setOption(GOAL_BY_ID[id].options?.[0].id);
  };
  const generate = () =>
    router.push({
      pathname: '/generated',
      params: { goal: goalId, option: option ?? '', minutes: String(mins), level: String(level), avoid: avoid.join(',') },
    });

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <ScrollView contentContainerStyle={[st.content, WIDE]}>
        <SectionTitle>Mi a célod?</SectionTitle>
        <View style={st.wrap}>
          {GOALS.map((g) => (
            <Chip key={g.id} label={g.name} active={g.id === goalId} onPress={() => pickGoal(g.id)} />
          ))}
        </View>
        <Text style={st.desc}>{goal.short}</Text>

        {goal.options && (
          <>
            <SectionTitle>Melyik testrész?</SectionTitle>
            <View style={st.wrap}>
              {goal.options.map((o) => (
                <Chip key={o.id} label={o.name} active={(option ?? goal.options![0].id) === o.id} onPress={() => setOption(o.id)} />
              ))}
            </View>
          </>
        )}

        <SectionTitle>Mennyi időd van? (perc)</SectionTitle>
        <View style={st.times}>
          {DURATIONS.map((d) => {
            const on = d === mins;
            const off = d > max;
            return (
              <Pressable
                key={d}
                disabled={off}
                onPress={() => setMinutes(d)}
                style={[st.time, on && st.timeOn, off && { opacity: 0.35 }]}
                accessibilityRole="button"
                accessibilityState={{ selected: on, disabled: off }}
                accessibilityLabel={`${d} perc`}
              >
                <Text style={[st.timeText, on && { color: '#fff' }]}>{d}</Text>
              </Pressable>
            );
          })}
        </View>
        <Text style={st.desc}>
          Kb. {fmt(rah)} p ráhangolódás, {fmt(warm)} p bemelegítés, {fmt(main)} p fő rész, {fmt(cool)} p levezetés, {fmt(relax)} p relaxáció.
        </Text>

        <SectionTitle>Szint</SectionTitle>
        <View style={st.wrap}>
          {LEVELS.map(([v, label]) => (
            <Chip key={v} label={label} active={(goal.gentle ? 1 : level) === v} onPress={() => setLevel(v)} />
          ))}
        </View>
        {goal.gentle && <Text style={st.desc}>Ennél az óratípusnál csak kezdő szintű, kíméletes gyakorlatok kerülnek az órába.</Text>}

        <SectionTitle>Kímélendő területek</SectionTitle>
        <View style={st.wrap}>
          {avoidOptions.map((id) => (
            <Chip key={id} label={CONDITION_BY_ID[id].name} active={avoid.includes(id)} onPress={() => setAvoid(toggle(avoid, id))} />
          ))}
        </View>
        <Text style={st.desc}>
          Azok a gyakorlatok, amelyeknél ezekre a területekre ellenjavallat van, kimaradnak.
          {profile.conditions.length ? ' A profilodban megadott panaszok alapból be vannak jelölve.' : ''}
        </Text>
      </ScrollView>
      <View style={st.footer}>
        <Button label="Órák generálása" onPress={generate} style={[{ flex: 1 }, WIDE]} />
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  content: { padding: 16, paddingBottom: 24 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap' },
  desc: { color: C.muted, fontSize: 13, marginTop: 6, lineHeight: 19 },
  times: { flexDirection: 'row', gap: 6 },
  time: {
    flex: 1,
    height: 46,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.line,
    backgroundColor: C.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeOn: { backgroundColor: C.accent, borderColor: C.accent },
  timeText: { fontSize: 15, fontWeight: '700', color: C.ink },
  footer: { flexDirection: 'row', padding: 12, borderTopWidth: 1, borderTopColor: C.line, backgroundColor: C.surface },
});
