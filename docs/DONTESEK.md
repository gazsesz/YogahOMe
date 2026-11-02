# Döntésnapló

Itt rögzítjük lépésenként, mit és miért döntöttünk az app fejlesztése során.
A legfrissebb lépés van legfelül.

---

## Yoga hOMe 3. lépés – Pontosabb pózadatok, felelősségi nyilatkozat (2026-11-02)

**Gabor kérése:** a pózadatok pontosítása; első indításkor jelenjen meg egy figyelmeztetés a saját felelősségről.

| Döntés | Miért |
| --- | --- |
| `data/aszanak.json` v6: minden ászana új mezőket kapott: `sided`, `position`, `strengthens`, `stretches`, `intensity` (1–5), `phases`, `avoidFor`, `counterpose`, `hold` | A generátor eddig becsült (kategória, azonosító); most szakmai besorolásból dolgozik. |
| Az adatot a `scripts/adat/pozadat.py` írja (halmazok + szabályok, ismeretlen azonosítónál hibával áll meg) | Egy helyen, átláthatóan szerkeszthető; újrafuttatva ugyanazt adja. Mariann vagy Rea itt tudja majd átnézni. |
| Izomcsoportok: core, has, hát, kar, váll, láb, far; nyújtás: combhajlító, csípőhajlító, csípő, ágyék, mellkas, váll, gerinc, vádli, oldal, comb, nyak | Az erősítő és a lazító óratípusok ezekre súlyoznak (pl. futás után: combhajlító, vádli). |
| `avoidFor`: az ellenjavallat-szövegből felismert panaszok + szakmai szabályok: fejjel lefelé pózok (magas vérnyomás, szem, menstruáció, nyak, szív, várandósság), csuklóterhelés, térdterhelés, mély hátrahajlás (derék, nyak), erős hasizom és mély csavar (derék, hasi, menstruáció, várandósság), 4–5-ös intenzitás (szív, magas vérnyomás) | Biztonságosabb kizárás átlagfelhasználónak; a figyelmeztetések az óraszerkesztőben is ebből jönnek. |
| Sorrend testhelyzet szerint: álló → kéztámasz → térdelő → hason → ülő → oldalt → háton | Kevesebb felállás-lefekvés, természetes ív. |
| Ellenpóz az adatból (pl. sáska után gyermekpóz, vállállás után hal, csónak után híd), 3-as intenzitástól | Az eddigi „hátrahajlás után gyermekpóz” szabály általánosítása. Ha az időhöz igazításkor egy póz kimarad, az ellenpóza is vele megy. |
| Erősítő órában a célzott izmot dolgoztató pózok 2 ismétléssel kerülnek be, a többiek hátrébb sorolódnak | Kezdő szinten kevés ilyen póz van; így is a választott testrészre esik a hangsúly (teszt: a fő rész legalább 60%-a célzott). |
| **Felelősségi nyilatkozat** első indításkor, teljes képernyőn, „Elolvastam, elfogadom” gombbal; az elfogadás ideje elmentődik (`settings` tábla, séma v3; böngészőben localStorage). A főoldal alján újra elolvasható | Gabor kérése. A kulcs változatszámos (`disclaimer:v1`): ha a szöveg érdemben változik, újra el kell fogadni. Kiadás előtt érdemes jogásszal átnézetni. |

---

## Yoga hOMe – Saját repó (2026-11-02)

**Gabor kérése:** az app költözzön a saját `gazsesz/YogahOMe` repóba.

| Döntés | Miért |
| --- | --- |
| A Mariann-jogapp `claude/project-thread-nkbmp7` ágának teljes előzménye a YogahOMe `main` ágára került | Megmarad, honnan indult és miért döntöttünk úgy, ahogy. |
| A további fejlesztés itt folyik, ágakon és pull requesteken át; a Mariann-jogapp repó változatlan marad | A két app független. |

---

## Yoga hOMe 2. lépés – Egyszerű főoldal és óragenerátor (2026-11-02)

**Gabor kérése:** a kezdőoldal legyen nagyon egyszerű: Kedvencek; Új óra → szűrés → generálás,
a változatok listázása, kiválasztás, kedvencnek jelölés; Eddigi óráim, ahogy a designon van.

| Döntés | Miért |
| --- | --- |
| Három alsó fül: **Főoldal**, Gyakorlattár, Óráim | A főoldal a belépési pont; a gyakorlattár és a teljes lista másodlagos. |
| Főoldal: nagy „Új óra” gomb, Kedvencek (vízszintes kártyák), Eddigi óráim (5 legutóbbi), mindenhol csillag | A design vászon (Yoga hOMe – design) szerint. |
| Új óra: cél (19 óratípus), erősítésnél testrész, idő (10–90 perc), szint, kímélendő területek; alatta a szakaszok becsült perce | A terv szerinti szűrés; a szakaszidő látszik, mielőtt generál. |
| **19 óratípus** receptként (`src/lib/goals.ts`): hatásterület- és kategória-súlyok, kiemelt pózok, kizárt kategóriák/pózok, kizárt panaszok, „kíméletes” (csak kezdő) jelölés, bemelegítő sorozatok, ráhangoló légzés, szakaszarány-szorzó, záró pózok, biztonsági figyelmeztetés | A meglévő adatokból (hatásterület, kategória, szint, ellenjavallat-szöveg) már értelmes órák állnak össze; az új pózmezők (izomcsoport, szakasz, intenzitás) később pontosítják. |
| Generátor (`src/lib/generator.ts`): szakaszidők az alaptáblázatból × óratípus × változat; pontozás + kis véletlen; állótól a talajig rendezés; hátrahajlás után gyermekpóz ellenpóz; túl hosszú óránál a fő rész végéről elhagy | A terv 6. pontja. Determinisztikus mag: ugyanaz a kérés és mag ugyanazt adja. |
| **Három változat**: kiegyensúlyozott, lendületesebb, nyugodtabb | Legyen választék, és mégse kelljen sokat görgetni. „Újra” gomb: új változatok. |
| Kímélendő területnél a póz kimarad; kivétel a pihenő pózok (pl. savászana), ezek az ellenjavallat szövegét kapják megjegyzésként | Az ellenjavallat-szövegek sokszor módosítást írnak (párna a térd alá), nem tiltást; a pihenő pózok nélkül nem lenne relaxáció. |
| Oldalas pózok becslése azonosító és kategória alapján (`isSidedPose`) | Az adatban még nincs ilyen mező. |
| Az irodai mini legfeljebb 30 perc (`maxMinutes`) | Csak ülő/álló kezdő pózokból hosszabb óra ismétlődne. |
| A változat csak kiválasztáskor vagy csillagozáskor mentődik; a mentett óra a szerkesztőben módosítható | Ne teljen meg a lista ki nem próbált órákkal. Új mező: `Plan.generator` (cél, idő, szint, kímélt területek, változat). |
| „Mentett órák, amelyek illenek”: ugyanaz a cél, ±25% (legalább ±5 perc) időtartam | Gabor: a meglévők listázása a generálás után. |
| Tesztek (`tests/generator.test.ts`): minden óratípus × időtartam × változat időre stimmel, a szint, a kizárt kategóriák és a kímélt területek érvényesülnek | A generátor bővítésekor is biztonságos maradjon. |

---

## Yoga hOMe 1. lépés – Független ág, új név, egyszerűsített felület (2026-11-02)

**Gabor kérése:** a meglévő appot Mariann appjától teljesen független ágon visszük tovább,
átlagos (nem feltétlenül tapasztalt) felhasználóknak. Név: **Yoga hOMe** („Jóga otthon”).
A spirituális, csakrás szűrők kerüljenek egy haladó szekcióba, de ne törlődjenek.
A teljes terv: `docs/terv.html`.

| Döntés | Miért |
| --- | --- |
| Ág: `claude/project-thread-nkbmp7`, a Mariann-féle `claude/project-thread-24jwdm` (PR #3) állapotából indul | Független fejlődés, de a már meglévő adat és logika megmarad. |
| App neve **Yoga hOMe**, slug/scheme `yogahome`, csomagazonosító `hu.yogahome.app` | Gabor döntése; nem oktatói név. Az új azonosító miatt a telefonon külön appként települ a tanári mellé. |
| Zöldes-kékes (teal) téma: fő szín `#1f5a55`, háttér `#eff3f0`, kiemelő sáfrány `#e9b76a` | Gabor kérése; a design vászon (claude.ai artifact „Yoga hOMe – design”) színei. |
| Két alsó fül: **Gyakorlattár** (Ászanák / Sorozatok / Légzés váltóval) és **Óráim** | Az eddigi 5 fül sok egy kezdőnek. A Főoldal a célalapú órákkal a 3. lépésben jön. |
| A mudratár a Gyakorlattár „Mudrák ›” linkjéről nyílik, nem fül | Gabor: a mudrák a haladó részbe kerülnek; a légzés elöl marad, mert a relaxációban és a panaszos órákban kell. |
| A szűrőpanelen az irányzat, csakra és öt elem egy összecsukott **„Haladó szűrők”** részbe került; ha bármelyik aktív, nyitva marad | Kezdőnek a szint, kategória, hatásterület elég; a spirituális szempontok nem törlődnek. |
| Az óraszerkesztőben a csakra- és elem-egyensúly is összecsukva, „Haladó” felirattal | Ugyanaz az elv. |
| **Kedvencek**: csillag az óra kártyáján és az óraszerkesztő fejlécében, „Kedvencek” lista az Óráim fülön; másolat nem örökli | Gabor kérése. Új mező: `Plan.favorite` (a meglévő mentéseket nem kell átalakítani, hiányzó = nem kedvenc). |
| A tematikák neve **Programok** (pl. „7 nap a derékért”) | Gabor: opcionális funkcióként maradhat. |
| A kézi óraszerkesztő marad, de nem hangsúlyos | Később fizetős funkció lehet. |

---

## 5. lépés – Dinamikus sorozatok, oldal és körszám (2026-10-25)

**Gabor kérése:** legyenek dinamikus ászanasorozatok (nap-, hold-, földüdvözlet, vinyásza),
és az óravázlatokban (a tematikákban is) lehessen megadni az oldalt (jobb, bal), sorozatoknál
az ismétlésszámot.

| Döntés | Miért |
| --- | --- |
| **20 sorozat, 5 kategória**: napüdvözletek (A, B, 12 lépéses, térdelő), holdüdvözletek (álló oldalirányú, 14 lépéses, félhold-áramlás), földüdvözletek (álló, térdelő, guggolás-áramlás), vinyásza-áramlások (alap, kezdő, harcos, istennő–csillag, szék, kitörés–félspárga), gyengéd áramlások (macska–tehén, gyermek–kobra, fekvő csavar, szélfelszabadító) – `data/sorozatok.json` | A leggyakrabban tanított hagyományos és modern sorozatok, az óra minden részére (bemelegítés, fő rész, levezetés). |
| A sorozat lépései az ászanatár pózaira hivatkoznak, lépésenként légzéssel (be / ki / maradj) és rövid instrukcióval | Így minden lépésnek van figurája, és egy koppintással megnyílik a póz adatlapja. A generátor (`scripts/adat/sorozatok.py`) ellenőrzi, hogy minden póz létezik. |
| A sorozatnak saját csakra, elem, hatás és ellenjavallat adata van | Ugyanúgy szűrhető, és beszámít az óra egyensúlyába és a figyelmeztetésekbe. |
| A sorozatnál jelöljük, hogy oldalanként végzendő-e (pl. klasszikus napüdvözlet, harcos-áramlás), és van javasolt körszáma | Ettől függ, hogy az óravázlatban oldalt is lehet-e választani. |
| Új alsó fül: **Sorozatok** (az Ászanák után); a választóban is külön fül | Egy koppintásra elérhető. |
| Új órába a sorozat a **Bemelegítés** szakaszba kerül | Ott a leggyakoribb (napüdvözlet), utána áthelyezhető. |
| Óraelemnél **oldal**: – / jobb / bal / mindkét gombsor (ászanánál és oldalanként végzett sorozatnál) | A korábbi, koppintásra váltogató gomb nem volt elég feltűnő; így egy érintéssel választható. |
| Óraelemnél **kör / ismétlés** számláló (−/+): sorozatnál „kör” (a javasolt körszámmal indul), ászanánál „ismétlés” (alapból üres) | Dinamikus ismétléseknél ászanánál is hasznos lehet (pl. háromszor a fa). Új mező: `PlanItem.reps`. |
| A tematika napjain az óravázlat tartalma szakaszonként, oldal- és körszámmal látszik (pl. „Harcos-áramlás (3 kör, bal oldal) · Fa (2 ismétlés, jobb oldal)”), a heti PDF-ben is | Gabor kérése: a tematikában is látszódjon. |
| Az óra PDF-jében a sorozat lépései is felsorolódnak légzéssel | Nyomtatva is követhető. |

---

## 4. lépés – Mudratár, pránájámák, tablet nézet (2026-10-25)

**Gabor kérése:** az ászanák mellett legyen mudratár és pránájáma-gyűjtemény, ugyanúgy
kategorizálva, és ezek is kerülhessenek az óravázlatba. A Galaxy Tab S6 Lite tableten is
jól kell kinéznie.

| Döntés | Miért |
| --- | --- |
| **39 mudra, 6 kategória**: meditációs, elem-, energetikai, fej-, test-mudrák, bandhák (`data/mudrak.json`) | A klasszikus (hatha, tantra) és a modern gyógyító mudra-hagyomány legismertebb kézjelei; a bandhák is ide kerültek, mert az órán hasonlóan, kiegészítésként használjuk őket. |
| **22 pránájáma, 6 kategória**: alapozó, kiegyensúlyozó, nyugtató, hűsítő, élénkítő, légzésvisszatartásos (`data/pranayamak.json`) | Hatás szerint csoportosítva, mert az órán a szándékhoz (lenyugtatás, felébresztés) választunk légzést. A visszatartásosak külön kategóriában vannak, mert ezekhez a legtöbb ellenjavallat tartozik. |
| A mudráknak és pránájámáknak is van szint, csakra (elsődleges + másodlagos), öt elem, hatásterület, ellenjavallat és ajánlott időtartam; a pránájámáknál ritmus is (pl. 4–7–8) | Így ugyanazokkal a szűrőkkel kereshetők, és az óra csakra-, elem-egyensúlyába és a panasz-figyelmeztetésekbe is beszámítanak. |
| Az adatfájlok Python generátorból készülnek (`scripts/adat/mudrak.py`, `scripts/adat/pranayamak.py`) | Egy helyen szerkeszthető, ellenőrzött szöveg; újrafuttatva frissül a JSON. |
| Közös adatmodell: `Practice` (alap), ebből `Pose` (ászana) és `Technique` (mudra, pránájáma); a szűrők, adatlap, lista ugyanazok a komponensek, `kind` paraméterrel | Egy kód, három tár: amit egyszer javítunk vagy bővítünk, mindháromnál működik. |
| Két új alsó fül: **Mudrák** és **Pránájáma**; az ászanák fül neve „Ászanák” | Mindegyik tár egy koppintásra elérhető. |
| Az óravázlat elemeinél `kind` mező (hiánya = ászana) | A régebben mentett órák változtatás nélkül megnyílnak. |
| A „+ Gyakorlat” választóban fülek: Ászanák / Mudrák / Pránájáma | Egy szakaszba vegyesen is tehetünk gyakorlatokat (pl. ráhangolódás: légzés + mudra). |
| Új órába a mudra és pránájáma a **Ráhangolódás** szakaszba kerül, az ászana a Fő részbe | Ez a leggyakoribb helyük; utána szabadon áthelyezhetők. |
| Új panasz-szűrők: szívbetegség, menstruáció, sérv/hasi műtét/fekély, szorongás/pánik, epilepszia | A légzésvisszatartások és az erős hasi légzések ellenjavallatai miatt kellettek. |
| Az óralistán és PDF-ben a darabszám típus szerint (pl. „6 ászana · 1 mudra · 2 pránájáma”) | Ránézésre látszik az óra összetétele. |
| **Tablet:** a tartalom középre igazított, legfeljebb 860 pt széles oszlop (`WIDE` a `src/lib/theme.ts`-ben) | Az S6 Lite fekvő helyzetében (és nagy képernyőn) ne nyúljanak szét a sorok; álló helyzetben a teljes szélességet használja. |

A böngészős változat ugyanazon a linken frissült.

---

## 3. lépés – Böngészős változat (2026-10-25)

**Gabor kérése:** buildeljük le, hogy böngészőből is meg lehessen nézni.

| Döntés | Miért |
| --- | --- |
| Böngészőben **localStorage** a tárolás (`src/lib/store.web.tsx`), telefonon marad az SQLite (`src/lib/store.tsx`) | Az expo-sqlite webes változata különleges szerverfejléceket és WebAssemblyt kér, ami megosztott linken nem működik. A képernyők kódja közös, csak a tároló cserélődik. |
| Egyetlen önálló HTML fájl készül (`npm run build:web`, majd `node scripts/web-single-file.mjs dist dist/mariann-jogapp.html`) | Bárhol megnyitható és megosztható, nincs szükség szerverre. |
| Közzétéve Claude Artifactként: https://claude.ai/artifact/Fthcs1MM3NpeeyhHcW3RRu | Privát link, Gabor oszthatja meg (Share menü). |
| Böngészőben saját megerősítő ablak (törlésnél) | Beágyazott oldalon a böngésző saját párbeszédablakai nem jelennek meg. |
| A PDF gomb csak a telefonos appban látszik | Beágyazott oldalon a nyomtatás le van tiltva. |
| Ismeretlen címről a kezdőlapra irányít (`src/app/+not-found.tsx`) | A link bármilyen útvonalon nyílhat meg. |

A böngészőben mentett órák csak abban a böngészőben látszanak, nem szinkronizálódnak a telefonnal.

---

## 2. lépés – Öt elem és heti tematika (2026-10-25)

**Gabor kérése:** az ászanákhoz kerüljön be az öt alapelem, és lehessen egy témát
több napra (pl. egy hétre) lebontani, ami az óravázlatoknál is látszik.

### Öt elem

| Döntés | Miért |
| --- | --- |
| Az „5 alapelem” a jógai **pañca mahābhūta**: Föld, Víz, Tűz, Levegő, Éter | A jóga hagyományában ez az öt elem, és az első öt csakrához kötődik. (A kínai öt elem – fa, tűz, föld, fém, víz – más rendszer; ha arra lenne igény, külön vehetjük fel.) |
| Az elem **a csakrákból származik** (Föld–Mūlādhāra, Víz–Svādhiṣṭhāna, Tűz–Maṇipūra, Levegő–Anāhata, Éter–Viśuddha) | Így következetes a meglévő csakra-hozzárendeléssel. Ha az elsődleges csakra a 6. vagy 7., akkor az első 1–5. másodlagos csakra eleme az elsődleges, ennek híján Éter (4 fordított/fejre irányuló póz). |
| Az adat a `data/aszanak.json`-ba került (5. verzió): `elements` lista és pózonként `elements: {primary, secondary}` | Egy forrás az appnak és később az ászanatárnak. A `docs/aszanatar.html` még nem mutatja az elemeket. |
| Megjelenik: szűrő („Öt elem”), lista, adatlap (elem minősége), óravázlat „Öt elem egyensúlya” sávdiagram, PDF | Az óra elem-egyensúlya ugyanúgy látszik, mint a csakráké. |

Eloszlás: Tűz 58, Víz 49, Levegő 43, Föld 38, Éter 17 ászana (elsődleges elem).

### Tematika

| Döntés | Miért |
| --- | --- |
| Új egység: **tematika** = cím, téma, jegyzet és napok listája; minden nap: cím, fókusz, hozzárendelt óravázlat | Egy témát napokra bontva lehet megtervezni, a napok óravázlatai külön is használhatók. |
| Alapból 7 nap, de napok hozzáadhatók, törölhetők, mozgathatók | Lehet 5 napos vagy 10 napos sorozat is. |
| Sablonok: **Üres hét**, **Csakra-utazás (7 nap)**, **Öt elem (5 nap + integráló + pihentető nap)** | Gyors indulás; a napok címe és fókusza kitöltve, átírható. |
| Egy naphoz új óravázlat készíthető (cím: „Tematika – N. nap: …”, téma = a nap fókusza, címke = a tematika neve), vagy meglévő rendelhető hozzá | Rugalmas: kész órák is beilleszthetők. |
| Az **Óravázlataim** fülön „Órák / Tematikák” váltó; az órák kártyáján látszik, melyik tematika hányadik napja | Gabor kérése szerint az óravázlatoknál is látszik a tematika. |
| Tematika törlésekor az óravázlatok megmaradnak; óravázlat törlésekor a nap üres lesz | Ne vesszen el véletlenül kidolgozott óra. |
| Heti elem-egyensúly és PDF heti áttekintés (naponként fókusz és pózok szakaszonként) | Áttekinthető a hét íve, kinyomtatható. |
| Tárolás: új `series` tábla (SQLite séma 2. verzió), JSON-ban | Ugyanaz a minta, mint az óravázlatoknál. |

---

## 1. lépés – Az app alapja (2026-10-25)

**Cél:** működő első változat telefonra: ászanatár szűrőkkel, óravázlat
összeállítása és mentése, PDF óravázlat.

### Technológia

| Döntés | Miért |
| --- | --- |
| **React Native + Expo (SDK 58), TypeScript** | Egy kódbázis Androidra és iOS-re. Expo Go-val a telefonon azonnal kipróbálható, Mac és Android Studio nélkül. |
| **expo-router**, a képernyők a `src/app/` mappában | Fájlalapú navigáció, az Expo ajánlott megoldása. |
| **expo-sqlite**, helyi adatbázis az eszközön | Offline működés, nincs fiók és szerver. Egy óravázlat egy sor, a tartalma JSON-ként tárolódik, így a formátum később bővíthető táblamódosítás nélkül. |
| **react-native-svg** a figurákhoz | Az ászanatár pálcikafiguráit ugyanazokból a szögadatokból rajzoljuk (`src/lib/figure.ts`), nincs szükség képfájlokra. |
| **expo-print + expo-sharing** a PDF-hez | A telefon saját PDF-készítőjét használja, a kész fájl megosztható (e-mail, Drive, nyomtatás). |
| Az ászanaadat a repó `data/aszanak.json` fájljából jön | Egyetlen forrás az ászanatárnak és az appnak. Az app a 4-es verziót (hatásterületekkel, PR #2) használja. |
| A kezelőfelület magyar | Mariann és a magyar oktatók a célcsoport. |

### Funkciók az 1. körben (a piackutatás alapján)

- **Ászanatár:** keresés magyar, szanszkrit vagy angol névre (ékezet nélkül is),
  kategóriánként csoportosított lista figurákkal.
- **Kombinálható szűrők:** kategória, szint, irányzat, csakra (opcionálisan csak
  elsődleges), hatásterület. Egy szemponton belül VAGY, szempontok között ÉS.
- **Ászana-adatlap:** végrehajtás, hatások, csakrák, ellenjavallatok,
  hozzáadás bármelyik óravázlat bármelyik szakaszához.
- **Óravázlat:** cím, téma/szándék, célzott szint, időtartam, címkék, jegyzet.
  Alapértelmezett szakaszok: Ráhangolódás, Bemelegítés, Fő rész, Levezetés,
  Relaxáció. A szakaszok átnevezhetők, mozgathatók, törölhetők, újak vehetők fel.
- **Pózonként:** tartási idő (szabad szöveg, pl. „5 légzés”, „3 perc”; Yin pózoknál
  alapból 3 perc), oldal (–, mindkét, jobb, bal), jegyzet, sorrend mozgatása.
- **Ellenjavallat-figyelmeztetés:** az órához megjelölhetők a csoportban jelzett
  panaszok (pl. magas vérnyomás, térd, várandósság). Az app az ászanák
  ellenjavallat-szövegében keres rájuk, és jelzi az érintett pózokat. Azt is jelzi,
  ha egy póz nehezebb az óra célzott szintjénél.
- **Csakra-egyensúly:** az óra pózainak elsődleges csakrái sávdiagramon.
- **Óravázlataim:** lista keresővel, másolat készítése, törlés.
- **PDF óravázlat** figurákkal, jegyzetekkel, figyelmeztetésekkel.
- Minden változás **automatikusan mentődik**.

### Szándékosan későbbre hagyva

- Óraelemző panel bővítése (hatás-lefedettség, intenzitásgörbe), következő-póz
  javaslat, újrahasználható blokkok (pl. napüdvözlet), tanítási mód (2. kör a
  piackutatás szerint).
- Húzással rendezés (most fel/le nyilak vannak).
- Felhőszinkron, fiók: nem tervezzük, amíg nincs rá igény.
- Sötét téma.

### Nyitott kérdések Mariann felé

- Jók-e az alapértelmezett szakasznevek?
- Milyen panaszok forduljanak elő még a csoportokban (a lista bővíthető)?
- Mi kerüljön még a PDF-re (pl. zene, légzőgyakorlat külön mezőben)?
