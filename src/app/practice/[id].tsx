import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { AudioToggles } from '../../components/AudioToggles';
import { PracticeThumb } from '../../components/PracticeRow';
import { speak, stopSpeech, useSignals } from '../../lib/audio';
import { practiceOf } from '../../lib/data';
import { buildSteps, END_SPEECH, fmtClock, stepSound, stepSpeech, totalSeconds } from '../../lib/practice';
import { effectiveAudio, type AudioSettings } from '../../lib/profile';
import { getPlan, modifyPlan, useDb } from '../../lib/store';
import { C, WIDE } from '../../lib/theme';
import type { Plan } from '../../lib/types';
import { useProfile } from '../../lib/useProfile';

const BG = C.dark;
const PANEL = '#1b403c';
const SUB = '#bfd3ce';
const RING = 236;
const STROKE = 7;

function Ring({ progress }: { progress: number }) {
  const r = (RING - STROKE) / 2;
  const len = 2 * Math.PI * r;
  return (
    <Svg width={RING} height={RING} style={StyleSheet.absoluteFill}>
      <Circle cx={RING / 2} cy={RING / 2} r={r} stroke="#2c4e4a" strokeWidth={STROKE} fill="none" />
      <Circle
        cx={RING / 2}
        cy={RING / 2}
        r={r}
        stroke={C.saffron}
        strokeWidth={STROKE}
        fill="none"
        strokeLinecap="round"
        strokeDasharray={`${len} ${len}`}
        strokeDashoffset={len * (1 - Math.min(1, Math.max(0, progress)))}
        transform={`rotate(-90 ${RING / 2} ${RING / 2})`}
      />
    </Svg>
  );
}

function CtrlIcon({ name, size = 26, color = '#fff' }: { name: 'play' | 'pause' | 'prev' | 'next'; size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {name === 'play' && <Path d="M8 5l11 7-11 7z" fill={color} />}
      {name === 'pause' && (
        <>
          <Rect x={6.5} y={5} width={4} height={14} rx={1} fill={color} />
          <Rect x={13.5} y={5} width={4} height={14} rx={1} fill={color} />
        </>
      )}
      {name === 'prev' && <Path d="M18 6l-9 6 9 6zM6 6v12" stroke={color} strokeWidth={2} fill={color} strokeLinejoin="round" />}
      {name === 'next' && <Path d="M6 6l9 6-9 6zM18 6v12" stroke={color} strokeWidth={2} fill={color} strokeLinejoin="round" />}
    </Svg>
  );
}

/** Gyakorlás mód: időzítő, hangjelzés szakaszváltáskor, magyar narráció. */
export default function Practice() {
  // Gyakorlás közben ne aludjon el a kijelző (böngészőben nem mindenhol támogatott, ott csendben kihagyjuk).
  useEffect(() => {
    activateKeepAwakeAsync('practice').catch(() => undefined);
    return () => {
      try {
        const r = deactivateKeepAwake('practice') as unknown;
        if (r instanceof Promise) r.catch(() => undefined);
      } catch {
        // nincs teendő
      }
    };
  }, []);
  const db = useDb();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [plan, setPlan] = useState<Plan | null>(null);
  const { profile, loaded } = useProfile();
  const play = useSignals();

  useEffect(() => {
    getPlan(db, id).then(setPlan);
  }, [db, id]);

  const steps = useMemo(() => (plan ? buildSteps(plan) : []), [plan]);
  const total = useMemo(() => totalSeconds(steps), [steps]);
  const audio: AudioSettings = plan ? effectiveAudio(plan, profile) : profile;
  const audioRef = useRef(audio);
  audioRef.current = audio;

  const [idx, setIdx] = useState(0);
  const [remaining, setRemaining] = useState(0);
  const [running, setRunning] = useState(false);
  const [started, setStarted] = useState(false);
  const [finished, setFinished] = useState(false);
  const endAt = useRef(0);
  const idxRef = useRef(0);
  const speechTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const announce = useCallback(
    (i: number) => {
      const a = audioRef.current;
      if (speechTimer.current) clearTimeout(speechTimer.current);
      stopSpeech();
      const step = steps[i];
      const sound = stepSound(step);
      if (a.sounds) play(sound);
      if (a.narration) {
        const text = stepSpeech(steps, i);
        // A gong lecsengése alá ne beszéljen rá.
        const delay = a.sounds ? (sound === 'gong' ? 1400 : 400) : 0;
        speechTimer.current = setTimeout(() => speak(text), delay);
      }
    },
    [steps, play],
  );

  const goTo = useCallback(
    (i: number, keepRunning: boolean) => {
      if (i >= steps.length) {
        setRunning(false);
        setFinished(true);
        setRemaining(0);
        const a = audioRef.current;
        if (a.sounds) play('gong');
        if (a.narration) speechTimer.current = setTimeout(() => speak(END_SPEECH), a.sounds ? 1400 : 0);
        return;
      }
      const j = Math.max(0, i);
      idxRef.current = j;
      setIdx(j);
      setRemaining(steps[j].seconds);
      endAt.current = Date.now() + steps[j].seconds * 1000;
      setRunning(keepRunning);
      announce(j);
    },
    [steps, announce, play],
  );

  // Időzítő: a hátralévő időt a célidőpontból számoljuk, így nem csúszik el.
  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => {
      const rem = (endAt.current - Date.now()) / 1000;
      if (rem <= 0) goTo(idxRef.current + 1, true);
      else setRemaining(rem);
    }, 200);
    return () => clearInterval(t);
  }, [running, goTo]);

  useEffect(
    () => () => {
      if (speechTimer.current) clearTimeout(speechTimer.current);
      stopSpeech();
    },
    [],
  );

  const start = () => {
    setStarted(true);
    setFinished(false);
    goTo(0, true);
  };
  const togglePause = () => {
    if (running) {
      setRunning(false);
      if (speechTimer.current) clearTimeout(speechTimer.current);
      stopSpeech();
    } else {
      endAt.current = Date.now() + remaining * 1000;
      setRunning(true);
    }
  };

  const changeAudio = (patch: Partial<AudioSettings>) => {
    if (!plan) return;
    const next = { ...plan, practice: { ...plan.practice, ...patch } };
    setPlan(next);
    if (patch.narration === false) stopSpeech();
    // Az óra megjegyzi a saját beállítását.
    modifyPlan(db, plan.id, (p) => ({ ...p, practice: { ...p.practice, ...patch } })).catch(() => undefined);
  };

  if (!plan || !loaded) return <View style={{ flex: 1, backgroundColor: BG }} />;
  if (!steps.length)
    return (
      <View style={[st.center, { backgroundColor: BG }]}>
        <Text style={st.title}>Ebben az órában még nincs gyakorlat.</Text>
      </View>
    );

  const step = steps[idx];
  const next = steps[idx + 1];
  const practice = practiceOf({ kind: step.kind, poseId: step.poseId });
  const elapsed = steps.slice(0, idx).reduce((t, s) => t + s.seconds, 0) + (step.seconds - remaining);
  const header = (
    <Stack.Screen
      options={{
        title: plan.title || 'Gyakorlás',
        headerStyle: { backgroundColor: BG },
        headerTintColor: '#fff',
        headerTitleStyle: { color: '#fff' },
        contentStyle: { backgroundColor: BG },
      }}
    />
  );

  if (!started || finished)
    return (
      <ScrollView style={{ flex: 1, backgroundColor: BG }} contentContainerStyle={[st.intro, WIDE]}>
        {header}
        <Text style={st.kicker}>{finished ? 'Vége az órának' : 'Gyakorlás'}</Text>
        <Text style={st.bigTitle}>{plan.title}</Text>
        <Text style={st.sub}>
          {steps.length} lépés · kb. {Math.round(total / 60)} perc
        </Text>
        {finished ? (
          <Text style={[st.sub, { marginTop: 18, fontSize: 16, color: '#fff' }]}>Köszönöm, hogy gyakoroltál. Pihenj még egy kicsit, mielőtt felállsz.</Text>
        ) : (
          <Text style={[st.sub, { marginTop: 18 }]}>
            Készítsd elő a matracot, és tedd le a telefont úgy, hogy lásd és halld. Ha bármi fáj, állj meg: a szünet gombbal bármikor megállíthatod.
          </Text>
        )}
        <View style={st.panel}>
          <AudioToggles value={audio} onChange={changeAudio} dark />
          <Text style={st.panelHint}>Ennél az óránál megjegyezzük a beállítást. Az alapértéket a Profilban állíthatod.</Text>
        </View>
        <Pressable onPress={start} style={({ pressed }) => [st.startBtn, pressed && { opacity: 0.85 }]} accessibilityRole="button">
          <CtrlIcon name="play" size={22} color={C.dark} />
          <Text style={st.startText}>{finished ? 'Újrakezdés' : 'Indítás'}</Text>
        </Pressable>
        {finished && (
          <Pressable onPress={() => router.back()} style={st.linkBtn}>
            <Text style={st.linkText}>Vissza az órához</Text>
          </Pressable>
        )}
      </ScrollView>
    );

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      {header}
      <ScrollView contentContainerStyle={[st.content, WIDE]}>
        <View style={st.top}>
          <Text style={st.kicker}>{step.sectionTitle}</Text>
          <Text style={st.sub}>
            {idx + 1} / {steps.length} · hátra {fmtClock(total - elapsed)}
          </Text>
        </View>
        <View style={st.segments} accessibilityElementsHidden>
          {plan.sections.map((s, i) => (
            <View
              key={s.key}
              style={[st.seg, { backgroundColor: i < step.sectionIndex ? C.saffron : i === step.sectionIndex ? '#7fb3aa' : '#2c4e4a' }]}
            />
          ))}
        </View>

        <View style={st.ringWrap}>
          <Ring progress={1 - remaining / step.seconds} />
          <View style={st.disc}>{practice && <PracticeThumb practice={practice} kind={step.kind} width={150} />}</View>
        </View>

        <Text style={st.title}>{step.name}</Text>
        <Text style={st.sub}>
          {[step.side && `${step.side} oldal`, step.rep && `${step.rep.n}/${step.rep.of}. kör`, step.holdLabel].filter(Boolean).join(' · ')}
        </Text>
        <Text style={st.clock} accessibilityLabel={`Hátralévő idő ${fmtClock(remaining)}`}>
          {fmtClock(remaining)}
        </Text>
        {!!step.note && <Text style={st.note}>{step.note}</Text>}

        <View style={st.next}>
          <Text style={st.nextLabel}>Következik</Text>
          <Text style={st.nextText} numberOfLines={1}>
            {next ? `${next.name}${next.side ? ` (${next.side})` : ''}` : 'Vége'}
          </Text>
          {next && next.sectionIndex !== step.sectionIndex && <Text style={st.nextSection}>{next.sectionTitle}</Text>}
        </View>

        <View style={st.controls}>
          <Pressable onPress={() => goTo(idx - 1, running)} disabled={idx === 0} style={[st.ctrl, idx === 0 && { opacity: 0.35 }]} accessibilityLabel="Előző">
            <CtrlIcon name="prev" />
          </Pressable>
          <Pressable onPress={togglePause} style={st.playBtn} accessibilityLabel={running ? 'Szünet' : 'Folytatás'}>
            <CtrlIcon name={running ? 'pause' : 'play'} size={30} color={C.dark} />
          </Pressable>
          <Pressable onPress={() => goTo(idx + 1, running)} style={st.ctrl} accessibilityLabel="Következő">
            <CtrlIcon name="next" />
          </Pressable>
        </View>

        <View style={[st.panel, { marginTop: 18 }]}>
          <AudioToggles value={audio} onChange={changeAudio} dark compact />
        </View>
        {!running && <Text style={[st.sub, { textAlign: 'center', marginTop: 10 }]}>Szünetel</Text>}
      </ScrollView>
    </View>
  );
}

const st = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  intro: { padding: 24, paddingBottom: 40 },
  content: { padding: 20, paddingBottom: 32, alignItems: 'stretch' },
  top: { alignItems: 'center', gap: 2 },
  kicker: { color: C.saffron, fontSize: 12, fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase', textAlign: 'center' },
  bigTitle: { color: '#fff', fontSize: 28, fontWeight: '600', textAlign: 'center', marginTop: 8 },
  title: { color: '#fff', fontSize: 26, fontWeight: '600', textAlign: 'center', marginTop: 16 },
  sub: { color: SUB, fontSize: 14, textAlign: 'center', marginTop: 4, lineHeight: 20 },
  segments: { flexDirection: 'row', gap: 3, marginTop: 12 },
  seg: { flex: 1, height: 3, borderRadius: 2 },
  ringWrap: { width: RING, height: RING, alignSelf: 'center', marginTop: 22, alignItems: 'center', justifyContent: 'center' },
  disc: { width: RING - 44, height: RING - 44, borderRadius: (RING - 44) / 2, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' },
  clock: { color: C.saffron, fontSize: 52, fontWeight: '300', textAlign: 'center', marginTop: 6, fontVariant: ['tabular-nums'] },
  note: { color: '#f3d9a8', fontSize: 13, lineHeight: 19, textAlign: 'center', marginTop: 6 },
  next: { backgroundColor: PANEL, borderRadius: 16, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 18 },
  nextLabel: { color: '#a8c2bc', fontSize: 12, textTransform: 'uppercase', letterSpacing: 1 },
  nextText: { color: '#fff', fontSize: 15, fontWeight: '500', flex: 1 },
  nextSection: { color: C.saffron, fontSize: 12, fontWeight: '600' },
  controls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 28, marginTop: 22 },
  ctrl: { width: 56, height: 56, borderRadius: 28, backgroundColor: PANEL, alignItems: 'center', justifyContent: 'center' },
  playBtn: { width: 76, height: 76, borderRadius: 38, backgroundColor: C.saffron, alignItems: 'center', justifyContent: 'center' },
  panel: { backgroundColor: PANEL, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 6, marginTop: 24 },
  panelHint: { color: '#a8c2bc', fontSize: 12, lineHeight: 17, paddingVertical: 8 },
  startBtn: {
    marginTop: 24,
    height: 56,
    borderRadius: 28,
    backgroundColor: C.saffron,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  startText: { color: C.dark, fontSize: 17, fontWeight: '700' },
  linkBtn: { alignSelf: 'center', padding: 12, marginTop: 8 },
  linkText: { color: SUB, fontSize: 15, fontWeight: '600' },
});
