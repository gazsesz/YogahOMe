import { useEffect, useState } from 'react';
import { Modal, ScrollView, StyleSheet, Text, View } from 'react-native';
import { getSetting, setSetting, useDb } from '../lib/store';
import { C, WIDE } from '../lib/theme';
import { Button } from './ui';

/** A nyilatkozat változata: ha a szöveg érdemben változik, növeld, és újra el kell fogadni. */
export const DISCLAIMER_KEY = 'disclaimer:v1';

export const DISCLAIMER_POINTS = [
  'A Yoga hOMe általános tájékoztató és gyakorlást segítő alkalmazás. Nem orvosi tanács, és nem helyettesíti az orvosi vizsgálatot, kezelést, sem a képzett jógaoktató személyes útmutatását.',
  'A gyakorlatokat saját felelősségedre végzed. Az alkalmazás készítői nem vállalnak felelősséget a gyakorlás során vagy annak következtében esetleg bekövetkező sérülésért, egészségkárosodásért.',
  'Ha betegséged, sérülésed vagy krónikus panaszod van, várandós vagy, nemrég műtéten estél át, vagy bizonytalan vagy abban, hogy végezheted-e a gyakorlatokat, előbb kérd ki orvosod véleményét.',
  'Figyelj a testedre, és ne erőltess semmit. Fájdalom, szédülés, légszomj, mellkasi nyomás vagy zsibbadás esetén azonnal hagyd abba a gyakorlást; erős vagy tartós tünetnél fordulj orvoshoz.',
  'A panaszokra összeállított órák (pl. hátfájás, fejfájás, menstruációs görcsök) a közérzet javítását segíthetik, de gyógyulást nem ígérnek.',
];

export function DisclaimerText() {
  return (
    <View style={{ gap: 12 }}>
      {DISCLAIMER_POINTS.map((t, i) => (
        <View key={i} style={st.point}>
          <Text style={st.bullet}>{i + 1}.</Text>
          <Text style={st.text}>{t}</Text>
        </View>
      ))}
    </View>
  );
}

/** Első indításkor (és a nyilatkozat új változatánál) megjelenő, kötelezően elfogadandó felelősségi nyilatkozat. */
export function DisclaimerGate() {
  const db = useDb();
  const [open, setOpen] = useState(false);
  useEffect(() => {
    getSetting(db, DISCLAIMER_KEY)
      .then((v) => setOpen(!v))
      .catch(() => setOpen(true));
  }, [db]);
  const accept = async () => {
    await setSetting(db, DISCLAIMER_KEY, new Date().toISOString());
    setOpen(false);
  };
  return (
    <Modal visible={open} animationType="fade" onRequestClose={() => undefined}>
      <View style={st.wrap}>
        <ScrollView contentContainerStyle={[st.content, WIDE]}>
          <Text style={st.brand}>Yoga hOMe</Text>
          <Text style={st.title}>Mielőtt elkezded</Text>
          <DisclaimerText />
        </ScrollView>
        <View style={st.footer}>
          <Button label="Elolvastam, elfogadom" onPress={accept} style={[{ flex: 1 }, WIDE]} />
        </View>
      </View>
    </Modal>
  );
}

const st = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: C.bg },
  content: { padding: 24, paddingTop: 48 },
  brand: { color: C.accent, fontWeight: '700', fontSize: 15, letterSpacing: 0.5 },
  title: { fontSize: 28, fontWeight: '600', color: C.ink, marginTop: 4, marginBottom: 20 },
  point: { flexDirection: 'row', gap: 10 },
  bullet: { color: C.accent, fontWeight: '700', fontSize: 16, lineHeight: 23, width: 18 },
  text: { flex: 1, color: C.ink, fontSize: 16, lineHeight: 23 },
  footer: { flexDirection: 'row', padding: 16, paddingBottom: 28, borderTopWidth: 1, borderTopColor: C.line, backgroundColor: C.surface },
});
