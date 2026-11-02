import * as Print from 'expo-print';
import { router, Stack, useFocusEffect, useLocalSearchParams } from 'expo-router';
import * as Sharing from 'expo-sharing';
import { useCallback, useMemo, useRef, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { AudioToggles } from '../../components/AudioToggles';
import { BalanceBars } from '../../components/BalanceBars';
import { PracticeThumb } from '../../components/PracticeRow';
import { Button, Chip, SectionTitle, Tag } from '../../components/ui';
import { CONDITION_BY_ID, CONDITIONS, planWarnings } from '../../lib/cautions';
import { confirm, notify } from '../../lib/confirm';
import { planBalance } from '../../lib/analysis';
import { CHAKRA_BY_ID, DATA, ELEMENT_BY_ID, hasSides, itemKind, KINDS, practiceOf } from '../../lib/data';
import { getPlan, savePlan, useDb } from '../../lib/store';
import { toggle } from '../../lib/filters';
import { planHtml } from '../../lib/pdf';
import { effectiveAudio, hasOverride } from '../../lib/profile';
import { useProfile } from '../../lib/useProfile';
import { move, newId, poseCount, updateSection } from '../../lib/plan';
import { C, WIDE } from '../../lib/theme';
import type { Plan, PlanItem, Sides } from '../../lib/types';

const SIDE_OPTIONS: [Sides, string][] = [
  ['nincs', '–'],
  ['jobb', 'jobb'],
  ['bal', 'bal'],
  ['mindket', 'mindkét'],
];
const LEVELS: { v: Plan['level']; label: string }[] = [
  { v: 0, label: 'Vegyes' },
  { v: 1, label: DATA.levels['1'] },
  { v: 2, label: DATA.levels['2'] },
  { v: 3, label: DATA.levels['3'] },
];

const SAVED_NOTE =
  Platform.OS === 'web'
    ? 'A változások automatikusan mentődnek ebben a böngészőben.'
    : 'A változások automatikusan mentődnek a telefonra.';

async function exportPdf(plan: Plan) {
  const html = planHtml(plan);
  if (Platform.OS === 'web') {
    await Print.printAsync({ html });
    return;
  }
  const { uri } = await Print.printToFileAsync({ html });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf', dialogTitle: plan.title });
  } else {
    await Print.printAsync({ uri });
  }
}

export default function PlanEditor() {
  const db = useDb();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [plan, setPlan] = useState<Plan | null>(null);
  const [missing, setMissing] = useState(false);
  const [tagsText, setTagsText] = useState('');
  const [showBalance, setShowBalance] = useState(false);
  const { profile } = useProfile();

  // Fókuszba kerüléskor újratöltjük, mert a választó képernyő közvetlenül az adatbázisba ír.
  useFocusEffect(
    useCallback(() => {
      getPlan(db, id).then((p) => {
        if (!p) return setMissing(true);
        setPlan(p);
        setTagsText(p.tags.join(', '));
      });
    }, [db, id]),
  );

  const planRef = useRef<Plan | null>(null);
  planRef.current = plan;
  const update = useCallback(
    (f: (p: Plan) => Plan) => {
      if (!planRef.current) return;
      const next = f(planRef.current);
      planRef.current = next;
      setPlan(next);
      savePlan(db, next).catch((e) => notify('Mentési hiba', String(e)));
    },
    [db],
  );

  const warnings = useMemo(() => (plan ? planWarnings(plan, practiceOf) : []), [plan]);
  const warnByItem = useMemo(() => new Map(warnings.map((w) => [w.itemKey, w])), [warnings]);
  const balance = useMemo(() => (plan ? planBalance(plan, practiceOf) : null), [plan]);

  if (missing) return <Text style={{ padding: 24 }}>Ez az óravázlat már nem létezik.</Text>;
  if (!plan) return null;

  const total = poseCount(plan);

  const updateItem = (sectionKey: string, itemKey: string, patch: Partial<PlanItem>) =>
    update((p) =>
      updateSection(p, sectionKey, (s) => ({
        ...s,
        items: s.items.map((it) => (it.key === itemKey ? { ...it, ...patch } : it)),
      })),
    );

  const removeSection = async (key: string) => {
    const s = plan.sections.find((x) => x.key === key);
    if (s && s.items.length && !(await confirm('Szakasz törlése', `A(z) „${s.title}” szakasz ${s.items.length} ászanával együtt törlődik.`)))
      return;
    update((p) => ({ ...p, sections: p.sections.filter((x) => x.key !== key) }));
  };

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={[st.content, WIDE]} keyboardShouldPersistTaps="handled">
      <Stack.Screen
        options={{
          title: plan.title || 'Óravázlat',
          headerRight: () => (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
              <Pressable
                onPress={() => update((p) => ({ ...p, favorite: !p.favorite }))}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel={plan.favorite ? 'Kedvenc jelölés levétele' : 'Megjelölés kedvencként'}
              >
                <Text style={[st.headerStar, plan.favorite && { color: C.saffron }]}>{plan.favorite ? '★' : '☆'}</Text>
              </Pressable>
              {Platform.OS !== 'web' && (
                <Pressable onPress={() => exportPdf(plan).catch((e) => notify('PDF hiba', String(e)))} hitSlop={8}>
                  <Text style={st.headerBtn}>PDF</Text>
                </Pressable>
              )}
            </View>
          ),
        }}
      />

      <Button
        label="▶  Gyakorlás indítása"
        onPress={() => router.push({ pathname: '/practice/[id]', params: { id: plan.id } })}
        disabled={!plan.sections.some((x) => x.items.length)}
        style={{ marginBottom: 14 }}
      />
      <TextInput
        style={st.titleInput}
        value={plan.title}
        onChangeText={(title) => update((p) => ({ ...p, title }))}
        placeholder="Az óra címe"
        placeholderTextColor={C.muted}
      />
      <TextInput
        style={st.input}
        value={plan.theme}
        onChangeText={(theme) => update((p) => ({ ...p, theme }))}
        placeholder="Téma, szándék (pl. földelés, szívnyitás)"
        placeholderTextColor={C.muted}
      />

      <SectionTitle>Szint és időtartam</SectionTitle>
      <View style={st.wrap}>
        {LEVELS.map((l) => (
          <Chip key={l.v} label={l.label} active={plan.level === l.v} onPress={() => update((p) => ({ ...p, level: l.v }))} />
        ))}
      </View>
      <View style={st.inline}>
        <TextInput
          style={[st.input, { width: 80, marginBottom: 0 }]}
          value={plan.durationMin == null ? '' : String(plan.durationMin)}
          onChangeText={(t) => {
            const n = parseInt(t.replace(/\D/g, ''), 10);
            update((p) => ({ ...p, durationMin: Number.isFinite(n) ? n : null }));
          }}
          keyboardType="number-pad"
          placeholder="60"
          placeholderTextColor={C.muted}
        />
        <Text style={st.muted}> perc</Text>
      </View>

      <SectionTitle>Gyakorlás közben</SectionTitle>
      <View style={st.audioCard}>
        <AudioToggles
          value={effectiveAudio(plan, profile)}
          onChange={(patch) => update((p) => ({ ...p, practice: { ...p.practice, ...patch } }))}
        />
        <View style={st.audioFoot}>
          <Text style={[st.muted, { flex: 1 }]}>
            {hasOverride(plan) ? 'Ennél az óránál saját beállítás van.' : 'A profilod alapbeállítása szerint.'}
          </Text>
          {hasOverride(plan) && (
            <Pressable onPress={() => update((p) => ({ ...p, practice: undefined }))} hitSlop={8}>
              <Text style={st.reset}>Profil szerint</Text>
            </Pressable>
          )}
        </View>
      </View>

      <SectionTitle>Címkék</SectionTitle>
      <TextInput
        style={st.input}
        value={tagsText}
        onChangeText={(t) => {
          setTagsText(t);
          const tags = t.split(',').map((x) => x.trim()).filter(Boolean);
          update((p) => ({ ...p, tags }));
        }}
        placeholder="vesszővel elválasztva, pl. reggeli, hétfő, yin"
        placeholderTextColor={C.muted}
      />

      <SectionTitle>Kímélendő területek, panaszok</SectionTitle>
      <View style={st.wrap}>
        {CONDITIONS.map((c) => (
          <Chip key={c.id} label={c.name} active={plan.conditions.includes(c.id)}
            onPress={() => update((p) => ({ ...p, conditions: toggle(p.conditions, c.id) }))} />
        ))}
      </View>

      {warnings.length > 0 && (
        <View style={st.warnBox}>
          <Text style={st.warnTitle}>⚠ {warnings.length} ászanánál figyelj</Text>
          {warnings.map((w) => (
            <Text key={w.itemKey} style={st.warnLine}>
              • <Text style={{ fontWeight: '700' }}>{w.practice.hu}</Text>
              {w.conditions.length ? ` – ${w.conditions.map((c) => CONDITION_BY_ID[c].name.toLowerCase()).join(', ')}` : ''}
              {w.levelTooHigh ? ' – a célzott szintnél nehezebb' : ''}
            </Text>
          ))}
        </View>
      )}

      {total > 0 && balance && (
        <Pressable onPress={() => setShowBalance(!showBalance)} accessibilityRole="button" accessibilityState={{ expanded: showBalance }}>
          <Text style={st.advToggle}>{showBalance ? '▲' : '▼'} Haladó: csakra- és elem-egyensúly</Text>
        </Pressable>
      )}
      {total > 0 && balance && showBalance && (
        <>
          <SectionTitle>Csakra-egyensúly (elsődleges csakrák)</SectionTitle>
          <BalanceBars rows={DATA.chakras} counts={balance.chakras} />
          <SectionTitle>Öt elem egyensúlya</SectionTitle>
          <BalanceBars rows={DATA.elements} counts={balance.elements} />
        </>
      )}

      {plan.sections.map((s, si) => (
        <View key={s.key} style={st.section}>
          <View style={st.sectionHead}>
            <TextInput
              style={st.sectionTitle}
              value={s.title}
              onChangeText={(title) => update((p) => updateSection(p, s.key, (x) => ({ ...x, title })))}
            />
            <IconBtn label="↑" onPress={() => update((p) => ({ ...p, sections: move(p.sections, si, -1) }))} />
            <IconBtn label="↓" onPress={() => update((p) => ({ ...p, sections: move(p.sections, si, 1) }))} />
            <IconBtn label="✕" onPress={() => removeSection(s.key)} />
          </View>

          {s.items.map((it, ii) => {
            const pose = practiceOf(it);
            if (!pose) return null;
            const kind = itemKind(it);
            const w = warnByItem.get(it.key);
            const ch = CHAKRA_BY_ID[pose.chakras.primary];
            const el = ELEMENT_BY_ID[pose.elements.primary];
            return (
              <View key={it.key} style={[st.item, w && { borderColor: C.warn }]}>
                <View style={st.itemTop}>
                  <Text style={st.num}>{ii + 1}.</Text>
                  <Pressable onPress={() => router.push({ pathname: '/pose/[id]', params: { id: pose.id, kind } })} style={st.itemFig}>
                    <PracticeThumb practice={pose} kind={kind} width={64} />
                  </Pressable>
                  <View style={{ flex: 1 }}>
                    {kind !== 'asana' && <Text style={st.itemKind}>{KINDS[kind].label}</Text>}
                    <Text style={st.itemName}>{pose.hu}</Text>
                    <Text style={st.itemSk}>
                      {pose.sanskrit}
                      {ch ? ` · ${ch.name}` : ''}
                      {el ? ` · ${el.name}` : ''}
                    </Text>
                  </View>
                  <View>
                    <IconBtn label="↑" onPress={() => update((p) => updateSection(p, s.key, (x) => ({ ...x, items: move(x.items, ii, -1) })))} />
                    <IconBtn label="↓" onPress={() => update((p) => updateSection(p, s.key, (x) => ({ ...x, items: move(x.items, ii, 1) })))} />
                  </View>
                  <IconBtn
                    label="✕"
                    onPress={() => update((p) => updateSection(p, s.key, (x) => ({ ...x, items: x.items.filter((y) => y.key !== it.key) })))}
                  />
                </View>
                <View style={st.itemFields}>
                  <TextInput
                    style={[st.small, { width: kind === 'asana' ? 110 : 210, maxWidth: '100%' }]}
                    value={it.hold}
                    onChangeText={(hold) => updateItem(s.key, it.key, { hold })}
                    placeholder={kind === 'sequence' ? 'tempó' : 'tartás'}
                    placeholderTextColor={C.muted}
                  />
                </View>
                {(kind === 'asana' || kind === 'sequence') && (
                  <View style={st.itemFields}>
                    {hasSides(kind, pose) && (
                      <View style={st.fieldGroup}>
                        <Text style={st.fieldLabel}>Oldal</Text>
                        <View style={st.choice}>
                          {SIDE_OPTIONS.map(([v, label]) => (
                            <Pressable
                              key={v}
                              onPress={() => updateItem(s.key, it.key, { sides: v })}
                              style={[st.choiceBtn, it.sides === v && st.choiceActive]}
                              accessibilityRole="radio"
                              accessibilityState={{ checked: it.sides === v }}
                            >
                              <Text style={[st.choiceText, it.sides === v && { color: '#fff' }]}>{label}</Text>
                            </Pressable>
                          ))}
                        </View>
                      </View>
                    )}
                    <View style={st.fieldGroup}>
                      <Text style={st.fieldLabel}>{kind === 'sequence' ? 'Kör' : 'Ismétlés'}</Text>
                      <View style={st.choice}>
                        <Pressable
                          style={st.choiceBtn}
                          onPress={() => updateItem(s.key, it.key, { reps: Math.max(0, (it.reps ?? 0) - 1) || undefined })}
                          accessibilityLabel="kevesebb"
                        >
                          <Text style={st.choiceText}>−</Text>
                        </Pressable>
                        <Text style={st.repsValue}>{it.reps ?? '–'}</Text>
                        <Pressable
                          style={st.choiceBtn}
                          onPress={() => updateItem(s.key, it.key, { reps: Math.min(99, (it.reps ?? 0) + 1) })}
                          accessibilityLabel="több"
                        >
                          <Text style={st.choiceText}>+</Text>
                        </Pressable>
                      </View>
                    </View>
                  </View>
                )}
                <TextInput
                  style={[st.small, { marginTop: 6 }]}
                  value={it.note}
                  onChangeText={(note) => updateItem(s.key, it.key, { note })}
                  placeholder="Jegyzet (instrukció, variáció, eszköz…)"
                  placeholderTextColor={C.muted}
                  multiline
                />
                {w && (
                  <View style={st.itemWarn}>
                    <Text style={st.itemWarnText}>⚠ {pose.cautions}</Text>
                    {w.levelTooHigh && <Tag label="a célzott szintnél nehezebb" tone="warn" />}
                  </View>
                )}
              </View>
            );
          })}
          <Button
            kind="secondary"
            label="+ Gyakorlat"
            onPress={() => router.push({ pathname: '/pick', params: { planId: plan.id, sectionKey: s.key } })}
            style={{ marginTop: 6 }}
          />
        </View>
      ))}

      <Button
        kind="ghost"
        label="+ Új szakasz"
        onPress={() => update((p) => ({ ...p, sections: [...p.sections, { key: newId(), title: 'Új szakasz', items: [] }] }))}
      />

      <SectionTitle>Jegyzetek az órához</SectionTitle>
      <TextInput
        style={[st.input, { minHeight: 90, textAlignVertical: 'top' }]}
        value={plan.notes}
        onChangeText={(notes) => update((p) => ({ ...p, notes }))}
        placeholder="Zene, légzőgyakorlat, meditáció, gondolat az órához…"
        placeholderTextColor={C.muted}
        multiline
      />

      {Platform.OS !== 'web' && (
        <Button label="PDF óravázlat" onPress={() => exportPdf(plan).catch((e) => notify('PDF hiba', String(e)))} style={{ marginTop: 16 }} />
      )}
      <Text style={st.saved}>{SAVED_NOTE}</Text>
    </ScrollView>
  );
}

function IconBtn({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} hitSlop={6} style={({ pressed }) => [st.iconBtn, pressed && { backgroundColor: C.panel }]}>
      <Text style={st.iconBtnText}>{label}</Text>
    </Pressable>
  );
}

const st = StyleSheet.create({
  audioCard: { backgroundColor: C.surface, borderRadius: 14, borderWidth: 1, borderColor: C.line, paddingHorizontal: 12, paddingTop: 2, paddingBottom: 10 },
  audioFoot: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 8 },
  reset: { color: C.accent, fontWeight: '700', fontSize: 14 },
  content: { padding: 16, paddingBottom: 48 },
  advToggle: { color: C.muted, fontWeight: '600', fontSize: 14, marginTop: 18, paddingVertical: 6 },
  headerStar: { fontSize: 24, color: C.muted },
  headerBtn: { color: C.accent, fontWeight: '700', fontSize: 16, paddingHorizontal: 8 },
  titleInput: { fontSize: 22, fontWeight: '700', color: C.ink, paddingVertical: 6, marginBottom: 6, borderBottomWidth: 1, borderBottomColor: C.line },
  input: {
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 15,
    color: C.ink,
    marginBottom: 6,
  },
  wrap: { flexDirection: 'row', flexWrap: 'wrap' },
  inline: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  muted: { color: C.muted, fontSize: 15 },
  warnBox: { backgroundColor: C.warnSoft, borderRadius: 12, padding: 12, marginTop: 12 },
  warnTitle: { color: C.warn, fontWeight: '700', marginBottom: 4 },
  warnLine: { color: C.warn, fontSize: 14, lineHeight: 20 },
  section: { marginTop: 20 },
  sectionHead: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: 2, borderBottomColor: C.accent, marginBottom: 8 },
  sectionTitle: { flex: 1, minWidth: 0, fontSize: 18, fontWeight: '700', color: C.accent, paddingVertical: 6 },
  item: { backgroundColor: C.surface, borderRadius: 12, borderWidth: 1, borderColor: C.line, padding: 10, marginBottom: 8 },
  itemTop: { flexDirection: 'row', alignItems: 'center' },
  num: { width: 22, color: C.muted, fontSize: 14 },
  itemFig: { backgroundColor: C.panel, borderRadius: 8, marginRight: 10 },
  itemKind: { fontSize: 11, fontWeight: '700', color: C.gold, textTransform: 'uppercase', letterSpacing: 0.4 },
  itemName: { fontSize: 15, fontWeight: '600', color: C.ink },
  itemSk: { fontSize: 12, color: C.muted, fontStyle: 'italic' },
  itemFields: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', marginTop: 8, gap: 8 },
  small: {
    backgroundColor: C.bg,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 14,
    color: C.ink,
    borderWidth: 1,
    borderColor: C.line,
  },
  fieldGroup: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  fieldLabel: { fontSize: 13, color: C.muted },
  choice: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.bg, borderRadius: 8, padding: 2 },
  choiceBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6, minWidth: 32, alignItems: 'center' },
  choiceActive: { backgroundColor: C.accent },
  choiceText: { color: C.accent, fontSize: 14, fontWeight: '600' },
  repsValue: { minWidth: 26, textAlign: 'center', fontSize: 15, fontWeight: '700', color: C.ink },
  itemWarn: { marginTop: 6 },
  itemWarnText: { color: C.warn, fontSize: 13, lineHeight: 18, marginBottom: 4 },
  iconBtn: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  iconBtnText: { fontSize: 16, color: C.muted },
  saved: { textAlign: 'center', color: C.muted, fontSize: 12, marginTop: 10 },
});
