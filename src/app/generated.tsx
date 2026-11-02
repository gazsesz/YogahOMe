import { router, Stack, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button, SectionTitle, Tag } from '../components/ui';
import { CONDITION_BY_ID } from '../lib/cautions';
import { practiceOf } from '../lib/data';
import { estimateMinutes, generateVariants, planMatches, VARIANTS, type GenRequest } from '../lib/generator';
import { GOAL_BY_ID } from '../lib/goals';
import { countLabel } from '../lib/plan';
import { listPlans, modifyPlan, savePlan, useDb } from '../lib/store';
import { C, WIDE } from '../lib/theme';
import type { Plan } from '../lib/types';

const PHASE_COLORS = ['#9cc7c0', '#6fa8a0', C.saffron, '#6fa8a0', '#2b6e67'];

/** Szakaszonkénti becsült idő a színes sávhoz. */
const phaseBar = (p: Plan) => p.sections.map((s) => estimateMinutes({ ...p, sections: [s] }));

/** A generált változatok és az illeszkedő mentett órák listája. */
export default function Generated() {
  const db = useDb();
  const q = useLocalSearchParams<{ goal: string; option?: string; minutes: string; level: string; avoid?: string }>();
  const req: GenRequest = useMemo(
    () => ({
      goal: q.goal,
      option: q.option || undefined,
      minutes: Number(q.minutes) || 20,
      level: (Number(q.level) || 1) as 1 | 2 | 3,
      avoid: q.avoid ? q.avoid.split(',').filter(Boolean) : [],
    }),
    [q.goal, q.option, q.minutes, q.level, q.avoid],
  );
  const goal = GOAL_BY_ID[req.goal];
  const [seed, setSeed] = useState(() => Date.now() % 100000);
  const variants = useMemo(() => (goal ? generateVariants(req, seed) : []), [goal, req, seed]);
  // A már elmentett változatok (változat sorszáma → mentett óra).
  const [saved, setSaved] = useState<Record<number, Plan>>({});
  const [matching, setMatching] = useState<Plan[]>([]);

  const reload = useCallback(() => {
    listPlans(db).then((ps) => setMatching(ps.filter((p) => planMatches(p, req) && !Object.values(saved).some((s) => s.id === p.id))));
  }, [db, req, saved]);
  useFocusEffect(reload);

  if (!goal) return <Text style={{ padding: 24 }}>Ismeretlen óratípus.</Text>;

  const ensureSaved = async (v: number, patch: Partial<Plan> = {}) => {
    // A már mentett változatot frissen olvassuk be, hogy a szerkesztőben tett módosítások megmaradjanak.
    const prev = saved[v];
    const p = prev
      ? ((await modifyPlan(db, prev.id, (cur) => ({ ...cur, ...patch }))) ?? (await savePlan(db, { ...prev, ...patch })))
      : await savePlan(db, { ...variants[v], ...patch });
    setSaved((m) => ({ ...m, [v]: p }));
    return p;
  };
  const choose = async (v: number) => {
    const p = await ensureSaved(v);
    router.push({ pathname: '/plan/[id]', params: { id: p.id } });
  };
  const startPractice = async (v: number) => {
    const p = await ensureSaved(v);
    router.push({ pathname: '/practice/[id]', params: { id: p.id } });
  };
  const toggleFavorite = async (v: number) => {
    const cur = saved[v] ?? variants[v];
    await ensureSaved(v, { favorite: !cur.favorite });
  };
  const regenerate = () => {
    setSaved({});
    setSeed((s) => (s * 7 + 13) % 100000);
  };

  const option = goal.options?.find((o) => o.id === req.option);

  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.bg }} contentContainerStyle={[st.content, WIDE]}>
      <Stack.Screen
        options={{
          headerRight: () => (
            <Pressable onPress={regenerate} hitSlop={8} accessibilityRole="button">
              <Text style={st.headerBtn}>Újra</Text>
            </Pressable>
          ),
        }}
      />
      <View style={st.tags}>
        <Tag label={option ? `${goal.name}: ${option.name}` : goal.name} />
        <Tag label={`${req.minutes} perc`} />
        <Tag label={goal.gentle ? 'Kezdő' : ['', 'Kezdő', 'Középhaladó', 'Haladó'][req.level]} />
        {req.avoid.map((a) => (
          <Tag key={a} label={`${CONDITION_BY_ID[a]?.name ?? a} kímélve`} tone="warn" />
        ))}
      </View>
      {!!goal.safety && <Text style={st.safety}>{goal.safety}</Text>}

      {variants.map((gen, v) => {
        const p = saved[v] ?? gen;
        const bar = phaseBar(p);
        const mainNames = p.sections[2].items.map((it) => practiceOf(it)?.hu).filter(Boolean);
        return (
          <View key={v} style={st.card}>
            <View style={st.cardHead}>
              <View style={{ flex: 1 }}>
                <Text style={st.cardTitle}>{VARIANTS[v]}</Text>
                <Text style={st.cardMeta}>
                  {req.minutes} perc · {countLabel(p)}
                </Text>
              </View>
              <Pressable
                onPress={() => toggleFavorite(v)}
                hitSlop={10}
                accessibilityRole="button"
                accessibilityLabel={p.favorite ? 'Kedvenc jelölés levétele' : 'Megjelölés kedvencként'}
              >
                <Text style={[st.star, p.favorite && { color: C.saffron }]}>{p.favorite ? '★' : '☆'}</Text>
              </Pressable>
            </View>
            <View style={st.bar}>
              {bar.map((m, i) => (
                <View key={i} style={{ flex: Math.max(m, 0.2), backgroundColor: PHASE_COLORS[i] }} />
              ))}
            </View>
            <Text style={st.poses} numberOfLines={3}>
              <Text style={{ fontWeight: '700' }}>Fő rész: </Text>
              {mainNames.join(' · ')}
            </Text>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Button label="▶  Indítás" onPress={() => startPractice(v)} style={{ flex: 1 }} />
              <Button label={saved[v] ? 'Részletek' : 'Kiválasztás'} kind="secondary" onPress={() => choose(v)} style={{ flex: 1 }} />
            </View>
          </View>
        );
      })}

      {matching.length > 0 && (
        <>
          <SectionTitle>Mentett órák, amelyek illenek</SectionTitle>
          {matching.map((p) => (
            <Pressable
              key={p.id}
              onPress={() => router.push({ pathname: '/plan/[id]', params: { id: p.id } })}
              style={({ pressed }) => [st.saved, pressed && { opacity: 0.8 }]}
            >
              <View style={st.minBox}>
                <Text style={st.minText}>{p.durationMin}p</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={st.savedTitle}>{p.title}</Text>
                <Text style={st.cardMeta}>
                  {p.tags[0] ?? ''} · {new Date(p.updatedAt).toLocaleDateString('hu-HU')}
                </Text>
              </View>
              {p.favorite && <Text style={[st.star, { color: C.saffron }]}>★</Text>}
            </Pressable>
          ))}
        </>
      )}
      <Text style={st.hint}>Az elindított vagy kiválasztott óra elmentődik az óráid közé, és a részleteknél pózonként módosítható.</Text>
    </ScrollView>
  );
}

const st = StyleSheet.create({
  content: { padding: 16, paddingBottom: 32 },
  tags: { flexDirection: 'row', flexWrap: 'wrap' },
  safety: { marginTop: 10, backgroundColor: C.warnSoft, color: C.warn, borderRadius: 12, padding: 12, fontSize: 14, lineHeight: 20 },
  card: { backgroundColor: C.surface, borderRadius: 18, borderWidth: 1, borderColor: C.line, padding: 16, marginTop: 14, gap: 10 },
  cardHead: { flexDirection: 'row', alignItems: 'flex-start' },
  cardTitle: { fontSize: 18, fontWeight: '700', color: C.ink },
  cardMeta: { fontSize: 13, color: C.muted, marginTop: 2 },
  star: { fontSize: 26, color: C.muted },
  bar: { flexDirection: 'row', height: 6, borderRadius: 3, overflow: 'hidden', gap: 2 },
  poses: { fontSize: 14, color: C.ink, lineHeight: 20 },
  headerBtn: { color: C.accent, fontWeight: '700', fontSize: 16, paddingHorizontal: 8 },
  saved: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: C.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.line,
    padding: 12,
    marginBottom: 8,
  },
  savedTitle: { fontSize: 15, fontWeight: '600', color: C.ink },
  minBox: { width: 42, height: 42, borderRadius: 12, backgroundColor: C.accentSoft, alignItems: 'center', justifyContent: 'center' },
  minText: { fontSize: 13, fontWeight: '700', color: C.accent },
  hint: { color: C.muted, fontSize: 13, marginTop: 16, lineHeight: 19 },
});
