// Célalapú óratípusok („receptek”) az óragenerátorhoz.
// A súlyok a meglévő adatmezőkre épülnek: hatásterület (benefitAreas), kategória,
// szint és az ellenjavallat-szövegből felismert panaszok (cautions.ts).

/** Az öt szakasz sorrendje: ráhangolódás, bemelegítés, fő rész, levezetés, relaxáció. */
export type PhaseMult = [number, number, number, number, number];

export interface Goal {
  id: string;
  name: string;
  /** Egy mondat a célválasztóban. */
  short: string;
  /** Hatásterület-súlyok (aszanak.json → benefitAreas). */
  benefits: Record<string, number>;
  /** Kategória-súlyok (álló, hátrahajlás, csípőnyitó…). */
  categories: Record<string, number>;
  /** Erősített izomcsoport-súlyok (pose.strengthens). */
  muscles?: Record<string, number>;
  /** Nyújtott terület-súlyok (pose.stretches). */
  stretches?: Record<string, number>;
  /** Ezeket a pózokat külön előnyben részesíti. */
  boostIds?: string[];
  /** Kizárt kategóriák (pl. migrénnél a fordított pózok). */
  avoidCategories?: string[];
  /** Kizárt pózok. */
  avoidIds?: string[];
  /** Panaszok, amelyekre az ellenjavallat kitér: ezek a pózok kimaradnak (a relaxációs pózok kivételével). */
  avoidConditions?: string[];
  /** Csak kezdő szintű pózok, függetlenül a választott szinttől. */
  gentle?: boolean;
  /** Ha meg van adva, csak ezekből a kategóriákból választ (pl. irodai: ülő, álló). */
  onlyCategories?: string[];
  /** Bemelegítő sorozatok, preferencia-sorrendben (sorozatok.json). */
  warmSequences?: string[];
  /** Ráhangoló légzőgyakorlat (pranayamak.json). */
  openPranayama: string;
  /** Szakaszarány-módosító az alaptáblázathoz képest. */
  mult?: PhaseMult;
  /** A levezetés végére kerülő pózok (pl. lábak a falon). */
  coolExtra?: string[];
  /** Figyelmeztetés az óra elején (mikor ne gyakorolj). */
  safety?: string;
  /** A leghosszabb értelmes időtartam (pl. irodai mini: 30 perc). */
  maxMinutes?: number;
  /** Al-választó (erősítésnél izomcsoport). */
  options?: { id: string; name: string; categories: Record<string, number>; muscles?: Record<string, number>; boostIds?: string[]; warmSequences?: string[] }[];
}

export const GOALS: Goal[] = [
  {
    id: 'reggeli',
    name: 'Reggeli ébresztő',
    short: 'Átmozgat, felfrissít, energiát ad a naphoz.',
    benefits: { allokepesseg: 2, sziv: 2, tudo: 2 },
    stretches: { mellkas: 1, gerinc: 1, oldal: 1 },
    categories: { allo: 3, hatra: 2, csavar: 1, egyensuly: 1 },
    avoidCategories: ['yin'],
    warmSequences: ['surya-namaskara-hatha', 'surya-namaskara-a', 'alap-vinyasa'],
    openPranayama: 'teljes-joga-legzes',
    mult: [1, 1.3, 1.1, 0.8, 0.5],
  },
  {
    id: 'derek',
    name: 'Derék, hát',
    short: 'Kíméletes mobilizálás és nyújtás derék- és hátfájásra.',
    benefits: { tartas: 3, hajlekonysag: 2 },
    stretches: { agyek: 3, gerinc: 2, combhajlito: 1, csipo: 1 },
    categories: { pihen: 2, csipo: 2, csavar: 1, hatra: 1 },
    boostIds: ['marjaryasana', 'bitilasana', 'balasana', 'apanasana', 'sucirandhrasana', 'supta-padangusthasana', 'setu-bandha-sarvangasana', 'anahatasana'],
    avoidConditions: ['derek'],
    avoidCategories: ['kar', 'forditott'],
    avoidIds: ['ardha-purvottanasana', 'ardha-ustrasana', 'ardha-cakrasana', 'viparita-virabhadrasana'],
    gentle: true,
    warmSequences: ['macska-tehen', 'fekvo-csavar-aramlas'],
    openPranayama: 'hasi-legzes',
    mult: [1, 1, 0.9, 1.3, 1],
    safety: 'Akut, erős vagy lába kisugárzó fájdalom, zsibbadás esetén ne gyakorolj, fordulj orvoshoz.',
  },
  {
    id: 'futas',
    name: 'Futás után',
    short: 'Vádli, comb és csípő lazítása edzés után.',
    benefits: { hajlekonysag: 3 },
    stretches: { combhajlito: 3, vadli: 3, csipohajlito: 2, csipo: 2 },
    categories: { csipo: 3, elore: 2, yin: 2, pihen: 1, csavar: 1 },
    boostIds: ['anjaneyasana', 'ardha-hanumanasana', 'supta-padangusthasana', 'sucirandhrasana', 'adho-mukha-svanasana', 'parsvottanasana'],
    avoidCategories: ['kar', 'core'],
    openPranayama: 'hasi-legzes',
    mult: [0.5, 0.5, 1, 1.6, 1.2],
    coolExtra: ['viparita-karani'],
  },
  {
    id: 'ulomunka',
    name: 'Ülő- és állómunka után',
    short: 'Mellkasnyitás, csípőhajlító-nyújtás, lábak pihentetése.',
    benefits: { tartas: 3, hajlekonysag: 2, sziv: 1 },
    stretches: { csipohajlito: 3, mellkas: 3, vall: 1, vadli: 1 },
    categories: { hatra: 2, csipo: 2, elore: 1, csavar: 1, pihen: 1 },
    boostIds: ['anjaneyasana', 'anahatasana', 'bhujangasana', 'parsva-sukhasana', 'uttanasana', 'setu-bandha-sarvangasana'],
    warmSequences: ['macska-tehen', 'surya-namaskara-hatha'],
    openPranayama: 'teljes-joga-legzes',
    coolExtra: ['viparita-karani'],
  },
  {
    id: 'fejfajas',
    name: 'Fejfájás',
    short: 'Nyugodt, fekvő és ülő óra feszültséges fejfájásra, migrénre.',
    benefits: { elme: 3, alvas: 2 },
    categories: { pihen: 3, elore: 1, ulo: 1, yin: 1 },
    boostIds: ['balasana', 'salamba-balasana', 'supta-baddha-konasana', 'parsva-sukhasana', 'makarasana'],
    avoidCategories: ['forditott', 'kar', 'core', 'egyensuly'],
    avoidIds: ['uttanasana', 'prasarita-padottanasana', 'padahastasana', 'padangusthasana', 'adho-mukha-svanasana'],
    gentle: true,
    openPranayama: 'visama-vritti',
    mult: [1.5, 0.5, 0.8, 1.2, 2],
    safety: 'Hirtelen, szokatlanul erős fejfájás, látászavar vagy láz esetén ne gyakorolj, fordulj orvoshoz. Migrénrohamban elég a légzés és a relaxáció.',
  },
  {
    id: 'faradtsag',
    name: 'Fáradtság',
    short: 'Gyengéd mellkasnyitás és keringésélénkítés kimerültségre.',
    benefits: { sziv: 2, tudo: 2, hormon: 2 },
    stretches: { mellkas: 2 },
    categories: { hatra: 2, allo: 1, pihen: 1, csavar: 1 },
    warmSequences: ['macska-tehen', 'kezdo-vinyasa'],
    openPranayama: 'nadi-shodhana',
    mult: [1, 1, 1, 1, 0.7],
    coolExtra: ['viparita-karani'],
  },
  {
    id: 'megfazas',
    name: 'Megfázás ellen',
    short: 'Mellkas- és légzésnyitó óra az immunrendszerért.',
    benefits: { immun: 3, tudo: 2 },
    stretches: { mellkas: 2, gerinc: 1 },
    categories: { hatra: 2, csavar: 2, forditott: 1 },
    warmSequences: ['surya-namaskara-hatha', 'terdelo-napudvozlet'],
    openPranayama: 'ujjayi',
    safety: 'Lázas, akut betegség idején ne gyakorolj: pihenj.',
  },
  {
    id: 'menstruacio',
    name: 'Menstruáció',
    short: 'Görcsoldó, támasztott pózok, hasi légzés.',
    benefits: { hormon: 3, emesztes: 1 },
    stretches: { csipo: 2, agyek: 2 },
    categories: { csipo: 3, pihen: 3, yin: 2, ulo: 1 },
    boostIds: ['supta-baddha-konasana', 'baddha-konasana', 'balasana', 'salamba-balasana', 'marjaryasana', 'bitilasana', 'apanasana', 'pillango-yin'],
    avoidConditions: ['menstruacio'],
    avoidCategories: ['forditott', 'core', 'kar'],
    avoidIds: ['pasasana', 'parivrtta-parsvakonasana', 'maricyasana-iii', 'dhanurasana', 'urdhva-dhanurasana'],
    gentle: true,
    warmSequences: ['macska-tehen'],
    openPranayama: 'hasi-legzes',
    mult: [1, 0.8, 0.8, 1.3, 1.6],
  },
  {
    id: 'erosites',
    name: 'Erősítés',
    short: 'Izomerősítő óra a kiválasztott testrészre.',
    benefits: { allokepesseg: 3 },
    categories: { allo: 1, core: 1 },
    warmSequences: ['surya-namaskara-a', 'alap-vinyasa'],
    openPranayama: 'ujjayi',
    mult: [0.6, 1, 1.3, 0.8, 0.6],
    options: [
      { id: 'egesz', name: 'Egész test', categories: { allo: 1, core: 1 }, muscles: { core: 1, lab: 1, kar: 1, hat: 1, far: 1, vall: 1 } },
      { id: 'core', name: 'Core (törzs)', categories: { core: 2 }, muscles: { core: 3, has: 1 }, boostIds: ['phalakasana', 'navasana', 'ardha-navasana', 'vasisthasana', 'alkaros-oldalso-deszka'] },
      { id: 'has', name: 'Hasizom', categories: { core: 2 }, muscles: { has: 4 }, boostIds: ['navasana', 'ardha-navasana', 'urdhva-prasarita-padasana', 'uttanapadasana', 'cakki-calanasana'] },
      { id: 'hat', name: 'Hátizom', categories: { hatra: 2 }, muscles: { hat: 4 }, boostIds: ['salabhasana', 'bhujangasana', 'viparita-salabhasana', 'dhanurasana', 'ardha-purvottanasana'] },
      { id: 'kar', name: 'Kar és váll', categories: { kar: 1, core: 1 }, muscles: { kar: 3, vall: 2 }, boostIds: ['phalakasana', 'caturanga-dandasana', 'vasisthasana', 'ardha-pincha-mayurasana', 'purvottanasana'] },
      { id: 'lab', name: 'Láb és far', categories: { allo: 2, egyensuly: 1 }, muscles: { lab: 3, far: 2 }, boostIds: ['utkatasana', 'virabhadrasana-ii', 'utkata-konasana', 'setu-bandha-sarvangasana', 'malasana'], warmSequences: ['szek-aramlas', 'istenno-csillag'] },
    ],
  },
  {
    id: 'stressz',
    name: 'Stresszoldás',
    short: 'Lassú, földelő óra hosszabb kilégzéssel.',
    benefits: { elme: 3 },
    categories: { elore: 2, pihen: 2, allo: 1, ulo: 1 },
    warmSequences: ['macska-tehen'],
    openPranayama: 'visama-vritti',
    mult: [1.4, 0.8, 0.9, 1.2, 1.5],
  },
  {
    id: 'alvas',
    name: 'Jobb alvás',
    short: 'Esti levezető óra yin pózokkal.',
    benefits: { alvas: 3, elme: 2 },
    categories: { yin: 3, pihen: 3, elore: 2 },
    avoidCategories: ['kar', 'core', 'egyensuly'],
    gentle: true,
    warmSequences: ['szelfelszabadito-aramlas'],
    openPranayama: 'visama-vritti',
    mult: [1.2, 0.5, 0.8, 1.5, 1.6],
  },
  {
    id: 'nyak',
    name: 'Nyak, váll',
    short: 'Képernyő előtti feszülés oldása.',
    benefits: { tartas: 2 },
    stretches: { vall: 3, mellkas: 2, nyak: 1, gerinc: 1 },
    categories: { ulo: 2, csavar: 1, hatra: 1 },
    boostIds: ['parsva-sukhasana', 'anahatasana', 'gomukhasana', 'marjaryasana', 'bitilasana', 'balasana', 'parivrtta-sukhasana'],
    avoidCategories: ['forditott', 'kar'],
    avoidConditions: ['nyak'],
    gentle: true,
    openPranayama: 'teljes-joga-legzes',
  },
  {
    id: 'irodai',
    name: 'Irodai mini',
    short: 'Csak ülve és állva végezhető gyakorlatok.',
    benefits: { tartas: 2, elme: 1 },
    categories: { ulo: 2, allo: 2, csavar: 1 },
    onlyCategories: ['ulo', 'allo', 'csavar', 'egyensuly'],
    maxMinutes: 30,
    avoidIds: ['supta-matsyendrasana', 'jathara-parivartanasana', 'parsva-balasana'],
    gentle: true,
    openPranayama: 'koherens-legzes',
    mult: [1, 0.8, 1.2, 1, 0.5],
  },
  {
    id: 'emesztes',
    name: 'Emésztés',
    short: 'Csavarok és hasmasszázs puffadásra.',
    benefits: { emesztes: 3 },
    stretches: { gerinc: 2, agyek: 1 },
    categories: { csavar: 3, pihen: 2 },
    boostIds: ['apanasana', 'pavanamuktasana', 'supta-matsyendrasana', 'vajrasana', 'balasana'],
    avoidConditions: ['hasi'],
    warmSequences: ['szelfelszabadito-aramlas'],
    openPranayama: 'hasi-legzes',
    safety: 'Teli gyomorral ne gyakorolj: étkezés után várj legalább 2 órát.',
  },
  {
    id: 'csipo',
    name: 'Csípőnyitás',
    short: 'Hajlékonyság a csípőnek és a combnak.',
    benefits: { hajlekonysag: 3 },
    stretches: { csipo: 3, csipohajlito: 2 },
    categories: { csipo: 4, yin: 2 },
    warmSequences: ['csipo-nyito-aramlas', 'guggolo-aramlas'],
    openPranayama: 'ujjayi',
  },
  {
    id: 'egyensuly',
    name: 'Egyensúly',
    short: 'Fókusz, stabilitás, bokaerő.',
    benefits: { elme: 1, allokepesseg: 1 },
    muscles: { lab: 2, core: 1 },
    categories: { egyensuly: 4, allo: 2 },
    warmSequences: ['surya-namaskara-hatha'],
    openPranayama: 'sama-vritti',
  },
  {
    id: 'tura',
    name: 'Túra, kerékpár után',
    short: 'Csípőhajlító, comb és hát lazítása.',
    benefits: { hajlekonysag: 3 },
    stretches: { csipohajlito: 3, combhajlito: 2, agyek: 1, vadli: 1 },
    categories: { csipo: 3, elore: 2, hatra: 1, pihen: 1 },
    boostIds: ['anjaneyasana', 'ardha-hanumanasana', 'sucirandhrasana', 'bhujangasana', 'supta-padangusthasana'],
    avoidCategories: ['kar', 'core'],
    openPranayama: 'hasi-legzes',
    mult: [0.5, 0.5, 1, 1.6, 1.2],
    coolExtra: ['viparita-karani'],
  },
  {
    id: 'kezdo',
    name: 'Kezdő alapozó',
    short: 'Az alap pózok megismerése nyugodt tempóban.',
    benefits: { tartas: 1, allokepesseg: 1, hajlekonysag: 1 },
    categories: { allo: 2, ulo: 1, hatra: 1, elore: 1, pihen: 1 },
    gentle: true,
    warmSequences: ['surya-namaskara-hatha'],
    openPranayama: 'legzesmegfigyeles',
  },
  {
    id: 'kimeletes',
    name: 'Kíméletes, idősebbeknek',
    short: 'Lassú, biztonságos óra, sok ülő és fekvő gyakorlattal.',
    benefits: { tartas: 1, hajlekonysag: 1, elme: 1 },
    categories: { ulo: 2, pihen: 2, allo: 1 },
    avoidCategories: ['kar', 'forditott', 'core', 'yin'],
    avoidConditions: ['alacsonyvn'],
    gentle: true,
    warmSequences: ['macska-tehen'],
    openPranayama: 'hasi-legzes',
    mult: [1, 1, 0.9, 1.1, 1],
  },
];

export const GOAL_BY_ID: Record<string, Goal> = Object.fromEntries(GOALS.map((g) => [g.id, g]));

export const DURATIONS = [10, 15, 20, 30, 45, 60, 90] as const;

/** Kímélendő területek a szűrőben (a cautions.ts panaszaiból). */
export const AVOID_OPTIONS = ['terd', 'csuklo', 'nyak', 'vall', 'derek', 'csipo', 'boka', 'magasvn', 'alacsonyvn', 'szem', 'sziv', 'hasi'];
