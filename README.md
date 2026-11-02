# Yoga hOMe – Jóga otthon

Otthoni jóga app átlagos felhasználóknak (React Native + Expo, TypeScript – Android és iOS): célalapú, időtartamra generált órák, magyar narrációval. A Mariann-féle tanári óratervezőből (gazsesz/Mariann-jogapp) indult, 2026-11-02 óta ebben a saját repóban fejlődik (terv: `docs/terv.html`, döntések: `docs/DONTESEK.md`).

## Tartalom

- `src/app/` – az app képernyői (expo-router): Főoldal (Új óra, Kedvencek, Eddigi óráim), Profil és beállítások, Új óra szűrés és generált változatok, Gyakorlás mód (időzítő, hangjelzés, magyar narráció), Gyakorlattár (ászanák, sorozatok, légzés; a mudratár a haladó részben), közös adatlap, Óráim (órák, kedvencek, programok), óraszerkesztő.
- `src/lib/` – adat, óratípusok (`goals.ts`), óragenerátor (`generator.ts`), gyakorlás lépései és narrációs szövegei (`practice.ts`), profil (`profile.ts`), hang (`audio.ts`), szűrők, ellenjavallat-figyelmeztetések, figurarajzolás, mentés (SQLite), PDF.
- `data/aszanak.json` – az ászanatár app-barát adatai (205 ászana, 12 kategória, irányzat-címkék, csakrák, öt elem, hatásterületek, lépések, ellenjavallatok, figura-szögek; v6-tól gyakorlási mezők: oldalas, testhelyzet, erősített izmok, nyújtás, intenzitás, szakasz, kerülendő panaszok, ellenpóz, tartás – generátor: `scripts/adat/pozadat.py`).
- `data/sorozatok.json` – 20 dinamikus sorozat (nap-, hold-, földüdvözlet, vinyásza, gyengéd áramlások) 5 kategóriában, lépésenként ászanával és légzéssel.
- `data/mudrak.json`, `data/pranayamak.json` – 39 mudra és 22 pránájáma, 6–6 kategóriában (generátor: `scripts/adat/`).
- `assets/sounds/` – gong és csengő hangjelzés (generátor: `scripts/hang/hangok.py`).
- `docs/aszanatar.html` – az ászanatár önálló, böngészőben megnyitható változata SVG figurákkal.
- `docs/DONTESEK.md` – döntésnapló: lépésenként mit és miért döntöttünk.
- `tests/` – a szűrő-, figyelmeztetés-, figura- és PDF-logika tesztjei.

## Kipróbálás a telefonon (Windows)

1. Telepítsd a **Node.js LTS** változatát: <https://nodejs.org> (a telepítőben mindent hagyj alapértelmezésen).
2. Telepítsd a telefonra az **Expo Go** appot (Google Play vagy App Store).
3. Nyiss egy parancssort (PowerShell) a projekt mappájában, és futtasd:

   ```
   git pull
   npm install
   npx expo start
   ```

4. Megjelenik egy QR-kód. Androidon az Expo Go appal, iPhone-on a Kamera appal olvasd be.
   A telefon és a gép legyen ugyanazon a Wi-Fi hálózaton. Ha nem csatlakozik, próbáld: `npx expo start --tunnel`.

Böngészőben is megnézhető: `npx expo start --web`.

Önálló, megosztható HTML fájl (böngészős változat, a mentés localStorage-ban):

```
npm run build:web
node scripts/web-single-file.mjs dist dist/yogahome.html
```

## Telepíthető Android app (APK)

Gép nélkül, rendes appként futó változat. Ingyenes Expo-fiók kell hozzá (<https://expo.dev/signup>);
a fordítást az Expo felhője végzi.

1. A projekt mappájában (PowerShell):

   ```
   git pull
   npm install
   npx eas-cli login
   npx eas-cli build --platform android --profile preview
   ```

   Az első futáskor rákérdez, hogy létrehozza-e a projektet az Expo-fiókodban, és hogy generáljon-e
   aláíró kulcsot (Android Keystore): mindkettőre **Yes**. Ha közben az `app.json` módosul
   (bekerül a projekt azonosítója), azt érdemes commitolni.
2. Kb. 10–20 perc múlva a parancssor kiír egy linket és egy QR-kódot. Nyisd meg a telefonon, töltsd le az
   `.apk` fájlt, és telepítsd. Ha a telefon kéri, engedélyezd a telepítést ismeretlen forrásból
   (a böngészőnek vagy a Fájlok appnak).
3. Új változatnál ugyanez a build parancs; az új APK a régi fölé települ, a mentett órák megmaradnak.

A `production` profil a Google Play áruházba feltölthető csomagot (`.aab`) készít, ha később oda kerül az app.

## Fejlesztés

```
npm run typecheck   # TypeScript ellenőrzés
npm test            # logikai tesztek
```
