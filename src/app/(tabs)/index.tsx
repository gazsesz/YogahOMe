import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { levelName } from '../../lib/data';
import { listPlans, savePlan, useDb } from '../../lib/store';
import { C, WIDE } from '../../lib/theme';
import type { Plan } from '../../lib/types';

function greeting(d = new Date()) {
  const h = d.getHours();
  return h < 10 ? 'Jó reggelt!' : h < 18 ? 'Szép napot!' : 'Jó estét!';
}

function Star({ on, onPress }: { on?: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={10}
      style={st.starBtn}
      accessibilityRole="button"
      accessibilityLabel={on ? 'Kedvenc jelölés levétele' : 'Megjelölés kedvencként'}
    >
      <Text style={[st.star, on && { color: C.saffron }]}>{on ? '★' : '☆'}</Text>
    </Pressable>
  );
}

const openPlan = (p: Plan) => router.push({ pathname: '/plan/[id]', params: { id: p.id } });

/** Főoldal: Új óra, Kedvencek, Eddigi óráim. */
export default function Home() {
  const db = useDb();
  const [plans, setPlans] = useState<Plan[]>([]);
  const reload = useCallback(() => {
    listPlans(db).then((ps) => setPlans([...ps].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))));
  }, [db]);
  useFocusEffect(reload);

  const toggleFavorite = async (p: Plan) => {
    await savePlan(db, { ...p, favorite: !p.favorite });
    reload();
  };
  const favorites = plans.filter((p) => p.favorite);
  const recent = plans.slice(0, 5);

  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.bg }} contentContainerStyle={[st.content, WIDE]}>
      <Text style={st.hello}>{greeting()}</Text>

      <Pressable
        onPress={() => router.push('/new')}
        style={({ pressed }) => [st.newCard, pressed && { opacity: 0.85 }]}
        accessibilityRole="button"
      >
        <View style={st.plus}>
          <Svg width={26} height={26} viewBox="0 0 24 24">
            <Path d="M12 5v14M5 12h14" stroke={C.dark} strokeWidth={2.4} strokeLinecap="round" />
          </Svg>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={st.newTitle}>Új óra</Text>
          <Text style={st.newSub}>Válassz célt és időt, mi összeállítjuk.</Text>
        </View>
      </Pressable>

      <View style={st.head}>
        <Text style={st.h2}>Kedvencek</Text>
        {favorites.length > 0 && (
          <Pressable onPress={() => router.push({ pathname: '/plans', params: { mode: 'kedvencek' } })} hitSlop={8}>
            <Text style={st.more}>Mind</Text>
          </Pressable>
        )}
      </View>
      {favorites.length ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingRight: 4 }}>
          {favorites.map((p) => (
            <Pressable key={p.id} onPress={() => openPlan(p)} style={({ pressed }) => [st.favCard, pressed && { opacity: 0.8 }]}>
              <View style={st.favTop}>
                <Text style={st.badge}>{p.durationMin ? `${p.durationMin} perc` : 'óra'}</Text>
                <Star on onPress={() => toggleFavorite(p)} />
              </View>
              <Text style={st.favTitle} numberOfLines={3}>
                {p.title || 'Névtelen óra'}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      ) : (
        <Text style={st.empty}>Még nincs kedvenced. Egy óra csillagára koppintva ide kerül.</Text>
      )}

      <View style={st.head}>
        <Text style={st.h2}>Eddigi óráim</Text>
        {plans.length > 0 && (
          <Pressable onPress={() => router.push({ pathname: '/plans', params: { mode: 'orak' } })} hitSlop={8}>
            <Text style={st.more}>Mind</Text>
          </Pressable>
        )}
      </View>
      {recent.length ? (
        <View style={st.list}>
          {recent.map((p, i) => (
            <Pressable
              key={p.id}
              onPress={() => openPlan(p)}
              style={({ pressed }) => [st.row, i < recent.length - 1 && st.rowLine, pressed && { opacity: 0.8 }]}
            >
              <View style={st.minBox}>
                <Text style={st.minText}>{p.durationMin ? `${p.durationMin}p` : '–'}</Text>
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={st.rowTitle} numberOfLines={1}>
                  {p.title || 'Névtelen óra'}
                </Text>
                <Text style={st.rowMeta}>
                  {new Date(p.updatedAt).toLocaleDateString('hu-HU')}
                  {p.level ? ` · ${levelName(p.level)}` : ''}
                </Text>
              </View>
              <Star on={p.favorite} onPress={() => toggleFavorite(p)} />
            </Pressable>
          ))}
        </View>
      ) : (
        <Text style={st.empty}>Itt jelennek meg az óráid. Kezdd az „Új óra” gombbal.</Text>
      )}

      <Pressable onPress={() => router.push('/nyilatkozat')} hitSlop={8} style={{ marginTop: 28 }} accessibilityRole="link">
        <Text style={st.legal}>Felelősségi nyilatkozat</Text>
      </Pressable>
    </ScrollView>
  );
}

const st = StyleSheet.create({
  content: { padding: 20, paddingBottom: 32 },
  hello: { fontSize: 28, fontWeight: '600', color: C.ink, marginBottom: 18 },
  newCard: { backgroundColor: C.dark, borderRadius: 22, padding: 20, flexDirection: 'row', alignItems: 'center', gap: 16 },
  plus: { width: 56, height: 56, borderRadius: 28, backgroundColor: C.saffron, alignItems: 'center', justifyContent: 'center' },
  newTitle: { color: '#f3f1ea', fontSize: 22, fontWeight: '600' },
  newSub: { color: '#cfe0db', fontSize: 14, marginTop: 4 },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 26, marginBottom: 10 },
  h2: { fontSize: 18, fontWeight: '600', color: C.ink },
  more: { color: C.accent, fontWeight: '600', fontSize: 14 },
  empty: { color: C.muted, fontSize: 14, lineHeight: 20 },
  favCard: { width: 156, minHeight: 112, backgroundColor: C.surface, borderRadius: 16, borderWidth: 1, borderColor: C.line, padding: 12 },
  favTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  badge: { fontSize: 12, fontWeight: '700', color: C.accent, backgroundColor: C.accentSoft, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2, overflow: 'hidden' },
  favTitle: { fontSize: 15, fontWeight: '600', color: C.ink, marginTop: 6, lineHeight: 20 },
  list: { backgroundColor: C.surface, borderRadius: 16, borderWidth: 1, borderColor: C.line },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, paddingLeft: 14, paddingRight: 6 },
  rowLine: { borderBottomWidth: 1, borderBottomColor: C.panel },
  minBox: { width: 42, height: 42, borderRadius: 12, backgroundColor: C.accentSoft, alignItems: 'center', justifyContent: 'center' },
  minText: { fontSize: 13, fontWeight: '700', color: C.accent },
  rowTitle: { fontSize: 15, fontWeight: '600', color: C.ink },
  rowMeta: { fontSize: 13, color: C.muted, marginTop: 2 },
  legal: { color: C.muted, fontSize: 13, textAlign: 'center', textDecorationLine: 'underline' },
  starBtn: { minWidth: 36, minHeight: 36, alignItems: 'center', justifyContent: 'center' },
  star: { fontSize: 22, color: C.muted },
});
