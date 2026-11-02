"""Gyakorlási adatok az ászanákhoz (data/aszanak.json, v6).

Az óragenerátornak szükséges mezőket tölti ki minden ászanánál:

- sided:      oldalanként végzendő-e
- position:   testhelyzet a sorrendhez (allo, terdelo, kez, ulo, hason, haton, oldal)
- strengthens: mely izomcsoportokat erősíti (core, has, hat, kar, vall, lab, far)
- stretches:  mit nyújt (combhajlito, csipohajlito, csipo, agyek, mellkas, vall, gerinc, vadli, oldal, nyak, comb)
- intensity:  terhelés 1–5 (1 = pihentető, 5 = nagy erőt igénylő)
- phases:     hova illik az órában (bemelegites, fo, levezetes, relaxacio)
- avoidFor:   panaszok (cautions.ts azonosítók), amelyeknél kerülendő: az
              ellenjavallat-szövegből felismertek + szakmai szabályok (pl. fordított pózok)
- counterpose: javasolt ellenpóz azonosítója (ha van)
- hold:       alap tartás légzésszámban és másodpercben

A szkript idempotens: újrafuttatva ugyanazt az eredményt adja.
Használat: python3 scripts/adat/pozadat.py
"""
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
PATH = ROOT / "data" / "aszanak.json"


def ids(s: str) -> set[str]:
    return set(s.split())


# --- Oldalanként végzendő pózok -------------------------------------------------
NOT_SIDED = ids("""
tadasana urdhva-hastasana utkatasana utkata-konasana utthita-tadasana pranamasana utthita-hasta-padasana
uttanasana ardha-uttanasana padangusthasana padahastasana prasarita-padottanasana pascimottanasana upavistha-konasana kurmasana
ubhaya-padangusthasana urdhva-mukha-pascimottanasana sasankasana-sasangasana rongybaba-uttanasana-valtozat
bhujangasana salamba-bhujangasana urdhva-mukha-svanasana salabhasana dhanurasana ustrasana setu-bandha-sarvangasana urdhva-dhanurasana
matsyasana purvottanasana ardha-purvottanasana bitilasana marjaryasana anahatasana supta-virasana ardha-cakrasana ardha-ustrasana
bhekasana kapotasana dvi-pada-viparita-dandasana laghu-vajrasana jathara-parivartanasana
baddha-konasana malasana mandukasana ananda-balasana samakonasana yoganidrasana supta-kapotasana
dandasana sukhasana siddhasana padmasana vajrasana virasana simhasana svastikasana baddha-padmasana yoga-mudra parvatasana upavistha-konasana-ulo-terpesz
bakasana caturanga-dandasana tittibhasana mayurasana bhujapidasana lolasana tolasana kakasana kukkutasana hamsasana astanga-namaskara
phalakasana makara-adho-mukha-svanasana navasana ardha-navasana urdhva-prasarita-padasana bharmanasana uttanapadasana viparita-salabhasana cakki-calanasana
adho-mukha-svanasana ardha-pincha-mayurasana salamba-sarvangasana halasana karnapidasana salamba-sirsasana salamba-sirsasana-ii
adho-mukha-vrksasana pincha-mayurasana vrscikasana ardha-sirsasana viparita-karani-mudra niralamba-sarvangasana supta-konasana
balasana savasana makarasana apanasana supta-baddha-konasana viparita-karani utthita-balasana salamba-balasana
salamba-setu-bandha-sarvangasana salamba-matsyasana supta-sukhasana advasana
pillango-yin hernyo-yin cipofuzo-yin nyereg-yin foka-yin csiga-yin szitakoto-yin labujjguggolas-yin bokanyujtas-yin
kati-cakrasana parivrtta-prasarita-padottanasana
""")
# A ciklikus mozgások és a pavanamuktasana is mindkét oldalra mennek, de fekve,
# egy légzésvezetéssel: ezeket oldalasnak vesszük.

# --- Testhelyzet ------------------------------------------------------------------
POSITION_BY_CAT = {
    "allo": "allo", "egyensuly": "allo", "elore": "ulo", "hatra": "hason", "csavar": "ulo",
    "csipo": "terdelo", "ulo": "ulo", "kar": "kez", "core": "kez", "forditott": "kez", "pihen": "haton", "yin": "ulo",
}
POSITION = {
    "allo": ids("""uttanasana ardha-uttanasana padangusthasana padahastasana prasarita-padottanasana rongybaba-uttanasana-valtozat
              ardha-cakrasana parivrtta-utkatasana kati-cakrasana parivrtta-prasarita-padottanasana malasana skandasana"""),
    "terdelo": ids("""ustrasana ardha-ustrasana bitilasana marjaryasana anahatasana kapotasana laghu-vajrasana parivrtta-anjaneyasana
                 parighasana sasankasana-sasangasana bharmanasana dandayamana-bharmanasana vajrasana virasana simhasana
                 supta-virasana sarkany-yin labujjguggolas-yin bokanyujtas-yin utthan-prsthasana utthan-prsthasana-repulo-gyik"""),
    "kez": ids("""urdhva-mukha-svanasana purvottanasana phalakasana caturanga-dandasana vasisthasana makara-adho-mukha-svanasana
             alkaros-oldalso-deszka astanga-namaskara eka-pada-adho-mukha-svanasana"""),
    "hason": ids("""bhujangasana salamba-bhujangasana salabhasana dhanurasana ardha-bhekasana bhekasana viparita-salabhasana makarasana
               advasana foka-yin balasana salamba-balasana utthita-balasana parsva-balasana mandukasana"""),
    "haton": ids("""setu-bandha-sarvangasana eka-pada-setu-bandha-sarvangasana urdhva-dhanurasana eka-pada-urdhva-dhanurasana matsyasana
               supta-matsyendrasana jathara-parivartanasana ananda-balasana supta-padangusthasana sucirandhrasana supta-kapotasana
               urdhva-prasarita-padasana uttanapadasana navasana ardha-navasana yoganidrasana dvi-pada-viparita-dandasana
               salamba-sarvangasana halasana karnapidasana viparita-karani-mudra niralamba-sarvangasana eka-pada-sarvangasana supta-konasana
               csiga-yin banan-yin supta-baddha-konasana pavanamuktasana apanasana viparita-karani savasana
               salamba-setu-bandha-sarvangasana salamba-matsyasana supta-sukhasana camatkarasana"""),
    "oldal": ids("anantasana matsya-kridasana"),
    "ulo": ids("""pascimottanasana janu-sirsasana upavistha-konasana kurmasana triang-mukhaikapada-pascimottanasana ardha-baddha-padma-pascimottanasana
              maricyasana-i ubhaya-padangusthasana urdhva-mukha-pascimottanasana baddha-konasana gomukhasana agnistambhasana hanumanasana
              ardha-hanumanasana samakonasana eka-pada-sirsasana krauncasana pillango-yin felpillango-yin hernyo-yin cipofuzo-yin
              negyzet-yin szitakoto-yin szarvas-yin hattyu-yin alvo-hattyu-yin kapotasana-elokeszito eka-pada-rajakapotasana
              eka-pada-rajakapotasana-hableany nyereg-yin cakki-calanasana"""),
}

# --- Erősítés (izomcsoportok) -----------------------------------------------------
STRENGTHENS = {
    "core": ids("""phalakasana makara-adho-mukha-svanasana navasana ardha-navasana urdhva-prasarita-padasana dandayamana-bharmanasana
              uttanapadasana cakki-calanasana vasisthasana alkaros-oldalso-deszka utthita-vasisthasana caturanga-dandasana bakasana kakasana
              parsva-bakasana tolasana lolasana mayurasana eka-pada-kaundinyasana dvi-pada-kaundinyasana astavakrasana tittibhasana
              virabhadrasana-iii ardha-candrasana parivrtta-ardha-candrasana utthita-hasta-padangusthasana adho-mukha-vrksasana
              pincha-mayurasana ardha-pincha-mayurasana salamba-sirsasana purvottanasana anantasana parivrtta-utkatasana
              eka-pada-bakasana kukkutasana visvamitrasana eka-hasta-bhujasana hamsasana bhujapidasana eka-pada-galavasana"""),
    "has": ids("""navasana ardha-navasana urdhva-prasarita-padasana uttanapadasana cakki-calanasana phalakasana makara-adho-mukha-svanasana
             bakasana kakasana tolasana lolasana jathara-parivartanasana mayurasana tittibhasana parsva-bakasana kukkutasana
             vasisthasana alkaros-oldalso-deszka utthita-vasisthasana dandayamana-bharmanasana caturanga-dandasana ardha-pincha-mayurasana
             parivrtta-utkatasana anantasana"""),
    "hat": ids("""salabhasana viparita-salabhasana bhujangasana dhanurasana urdhva-mukha-svanasana dandayamana-bharmanasana ardha-uttanasana
             virabhadrasana-iii setu-bandha-sarvangasana eka-pada-setu-bandha-sarvangasana urdhva-dhanurasana ustrasana purvottanasana
             ardha-purvottanasana natarajasana ardha-bhekasana bhekasana camatkarasana dvi-pada-viparita-dandasana salamba-bhujangasana
             eka-pada-urdhva-dhanurasana laghu-vajrasana kapotasana"""),
    "kar": ids("""phalakasana caturanga-dandasana vasisthasana utthita-vasisthasana bakasana kakasana parsva-bakasana tittibhasana mayurasana
             astavakrasana eka-pada-kaundinyasana dvi-pada-kaundinyasana bhujapidasana lolasana tolasana eka-pada-galavasana eka-pada-bakasana
             kukkutasana visvamitrasana hamsasana astanga-namaskara eka-hasta-bhujasana adho-mukha-vrksasana pincha-mayurasana
             urdhva-dhanurasana purvottanasana urdhva-mukha-svanasana adho-mukha-svanasana eka-pada-adho-mukha-svanasana
             ardha-pincha-mayurasana camatkarasana alkaros-oldalso-deszka makara-adho-mukha-svanasana"""),
    "vall": ids("""phalakasana caturanga-dandasana vasisthasana utthita-vasisthasana adho-mukha-svanasana eka-pada-adho-mukha-svanasana
              ardha-pincha-mayurasana pincha-mayurasana adho-mukha-vrksasana salamba-sirsasana salamba-sirsasana-ii vrscikasana
              urdhva-hastasana virabhadrasana-ii purvottanasana ardha-purvottanasana urdhva-dhanurasana camatkarasana alkaros-oldalso-deszka
              makara-adho-mukha-svanasana bakasana kakasana astanga-namaskara urdhva-mukha-svanasana salabhasana viparita-salabhasana"""),
    "lab": ids("""utkatasana virabhadrasana-i virabhadrasana-ii viparita-virabhadrasana utthita-trikonasana parivrtta-trikonasana
             utthita-parsvakonasana parivrtta-parsvakonasana asta-candrasana utkata-konasana vrksasana garudasana natarajasana
             utthita-hasta-padangusthasana ardha-candrasana parivrtta-ardha-candrasana virabhadrasana-iii eka-pada-utkatasana
             parivrtta-utkatasana parivrtta-anjaneyasana anjaneyasana malasana skandasana baddha-virabhadrasana utthita-asva-sancalanasana
             ardha-baddha-padmottanasana urdhva-prasarita-eka-padasana dandayamana-janusirasana svarga-dvijasana ardha-candra-capasana
             padangusthasana-labujj-egyensuly setu-bandha-sarvangasana eka-pada-setu-bandha-sarvangasana urdhva-dhanurasana
             labujjguggolas-yin utthita-tadasana"""),
    "far": ids("""utkatasana virabhadrasana-i virabhadrasana-ii virabhadrasana-iii utkata-konasana setu-bandha-sarvangasana
             eka-pada-setu-bandha-sarvangasana salabhasana viparita-salabhasana dandayamana-bharmanasana urdhva-dhanurasana
             eka-pada-utkatasana malasana skandasana asta-candrasana natarajasana ardha-candrasana purvottanasana ardha-purvottanasana
             anantasana dhanurasana parivrtta-utkatasana"""),
}

# --- Nyújtás ----------------------------------------------------------------------
STRETCHES = {
    "combhajlito": ids("""uttanasana ardha-uttanasana padangusthasana padahastasana prasarita-padottanasana pascimottanasana janu-sirsasana
              upavistha-konasana kurmasana parsvottanasana adho-mukha-svanasana eka-pada-adho-mukha-svanasana supta-padangusthasana
              hanumanasana ardha-hanumanasana utthita-trikonasana utthita-hasta-padangusthasana triang-mukhaikapada-pascimottanasana
              maricyasana-i ubhaya-padangusthasana urdhva-mukha-pascimottanasana rongybaba-uttanasana-valtozat halasana hernyo-yin
              szitakoto-yin felpillango-yin csiga-yin dandayamana-janusirasana urdhva-prasarita-eka-padasana krauncasana
              upavistha-konasana-ulo-terpesz samakonasana parivrtta-janu-sirsasana anantasana"""),
    "csipohajlito": ids("""anjaneyasana asta-candrasana virabhadrasana-i hanumanasana ardha-hanumanasana eka-pada-rajakapotasana
              eka-pada-rajakapotasana-hableany utthan-prsthasana utthan-prsthasana-repulo-gyik sarkany-yin ustrasana ardha-ustrasana
              setu-bandha-sarvangasana urdhva-dhanurasana supta-virasana dhanurasana natarajasana kapotasana laghu-vajrasana
              utthita-asva-sancalanasana parivrtta-anjaneyasana nyereg-yin foka-yin salamba-setu-bandha-sarvangasana"""),
    "csipo": ids("""baddha-konasana kapotasana-elokeszito malasana gomukhasana agnistambhasana skandasana utthan-prsthasana mandukasana
             ananda-balasana sucirandhrasana supta-kapotasana eka-pada-rajakapotasana upavistha-konasana samakonasana pillango-yin
             felpillango-yin hattyu-yin alvo-hattyu-yin cipofuzo-yin negyzet-yin szarvas-yin supta-baddha-konasana utkata-konasana
             garudasana eka-pada-utkatasana labujjguggolas-yin yoganidrasana eka-pada-sirsasana upavistha-konasana-ulo-terpesz
             parivrtta-sukhasana supta-matsyendrasana"""),
    "mellkas": ids("""bhujangasana salamba-bhujangasana urdhva-mukha-svanasana ustrasana ardha-ustrasana matsyasana setu-bandha-sarvangasana
             urdhva-dhanurasana camatkarasana purvottanasana ardha-purvottanasana anahatasana bitilasana dhanurasana salamba-matsyasana
             supta-baddha-konasana viparita-virabhadrasana ardha-cakrasana natarajasana gomukhasana salabhasana viparita-salabhasana
             foka-yin nyereg-yin prasarita-padottanasana"""),
    "vall": ids("""gomukhasana garudasana anahatasana parsva-balasana adho-mukha-svanasana prasarita-padottanasana purvottanasana
             urdhva-hastasana ardha-pincha-mayurasana utthita-balasana parsvottanasana baddha-virabhadrasana yoga-mudra parvatasana"""),
    "gerinc": ids("""marjaryasana bitilasana balasana ardha-matsyendrasana maricyasana-iii bharadvajasana supta-matsyendrasana
             parivrtta-sukhasana vakrasana jathara-parivartanasana parivrtta-trikonasana parivrtta-parsvakonasana pasasana
             parivrtta-janu-sirsasana kati-cakrasana parivrtta-utkatasana parivrtta-anjaneyasana parsva-balasana banan-yin
             csiga-yin halasana sasankasana-sasangasana apanasana pavanamuktasana"""),
    "agyek": ids("""balasana apanasana pavanamuktasana supta-matsyendrasana marjaryasana salamba-balasana utthita-balasana
             sasankasana-sasangasana hernyo-yin csiga-yin pascimottanasana malasana ananda-balasana"""),
    "vadli": ids("""adho-mukha-svanasana eka-pada-adho-mukha-svanasana parsvottanasana uttanasana padangusthasana padahastasana
             malasana labujjguggolas-yin ardha-hanumanasana supta-padangusthasana dandasana"""),
    "oldal": ids("""parsva-urdhva-hastasana utthita-trikonasana utthita-parsvakonasana viparita-virabhadrasana parighasana parsva-sukhasana
             banan-yin ardha-candra-capasana ardha-candrasana parivrtta-janu-sirsasana utthita-balasana"""),
    "comb": ids("""virasana supta-virasana bhekasana ardha-bhekasana natarajasana nyereg-yin foka-yin laghu-vajrasana kapotasana
             eka-pada-rajakapotasana-hableany"""),
    "nyak": ids("halasana karnapidasana salamba-sarvangasana matsyasana parsva-sukhasana"),
}

# --- Intenzitás -------------------------------------------------------------------
CAT_INTENSITY = {"allo": 2, "egyensuly": 3, "elore": 2, "hatra": 3, "csavar": 2, "csipo": 2, "ulo": 1, "kar": 4,
                 "core": 3, "forditott": 4, "pihen": 1, "yin": 1}
INTENSITY = {
    1: ids("""tadasana pranamasana urdhva-hastasana sukhasana svastikasana vajrasana dandasana bharmanasana marjaryasana bitilasana
         balasana apanasana pavanamuktasana supta-matsyendrasana parivrtta-sukhasana parsva-sukhasana vakrasana kati-cakrasana
         ananda-balasana sucirandhrasana supta-kapotasana baddha-konasana salamba-bhujangasana parsva-balasana rongybaba-uttanasana-valtozat
         simhasana parvatasana"""),
    2: ids("""adho-mukha-svanasana bhujangasana setu-bandha-sarvangasana anjaneyasana malasana dandayamana-bharmanasana
         ardha-purvottanasana ardha-ustrasana ardha-cakrasana eka-pada-adho-mukha-svanasana uttanapadasana anahatasana
         vrksasana viparita-karani-mudra"""),
    3: ids("""utkatasana virabhadrasana-ii phalakasana salabhasana viparita-salabhasana ustrasana purvottanasana makara-adho-mukha-svanasana
         ardha-navasana alkaros-oldalso-deszka cakki-calanasana urdhva-prasarita-padasana ardha-pincha-mayurasana salamba-sarvangasana halasana"""),
    4: ids("""navasana caturanga-dandasana vasisthasana dhanurasana bakasana kakasana urdhva-dhanurasana virabhadrasana-iii
         salamba-sirsasana camatkarasana"""),
    5: ids("""mayurasana adho-mukha-vrksasana pincha-mayurasana vrscikasana tittibhasana astavakrasana eka-pada-kaundinyasana
         dvi-pada-kaundinyasana lolasana tolasana eka-pada-galavasana kukkutasana visvamitrasana eka-hasta-bhujasana
         eka-pada-bakasana parsva-bakasana bhujapidasana utthita-vasisthasana kapotasana eka-pada-urdhva-dhanurasana
         dvi-pada-viparita-dandasana laghu-vajrasana hamsasana"""),
}

# --- Szakaszok --------------------------------------------------------------------
WARM_IDS = ids("""tadasana urdhva-hastasana parsva-urdhva-hastasana pranamasana marjaryasana bitilasana bharmanasana
             dandayamana-bharmanasana adho-mukha-svanasana balasana apanasana supta-padangusthasana anjaneyasana malasana
             kati-cakrasana parivrtta-sukhasana parsva-sukhasana sukhasana ardha-uttanasana rongybaba-uttanasana-valtozat
             utthita-tadasana salamba-bhujangasana bhujangasana setu-bandha-sarvangasana virabhadrasana-ii utthita-trikonasana
             asta-candrasana utkatasana vakrasana parighasana sucirandhrasana ananda-balasana pavanamuktasana""")
COOL_CATS = {"elore", "csavar", "csipo", "yin", "pihen", "ulo"}
RELAX_IDS = ids("savasana advasana supta-baddha-konasana viparita-karani salamba-balasana salamba-matsyasana makarasana supta-sukhasana")

# --- Szakmai kerülési szabályok (az ellenjavallat-szövegen felül) -------------------
HEAD_DOWN = ids("""salamba-sirsasana salamba-sirsasana-ii ardha-sirsasana adho-mukha-vrksasana pincha-mayurasana vrscikasana
                halasana karnapidasana salamba-sarvangasana niralamba-sarvangasana eka-pada-sarvangasana viparita-karani-mudra supta-konasana
                ardha-pincha-mayurasana dvi-pada-viparita-dandasana""")
WRIST_LOAD = STRENGTHENS["kar"] | ids("bharmanasana dandayamana-bharmanasana marjaryasana bitilasana urdhva-mukha-svanasana purvottanasana ardha-purvottanasana")
KNEE_LOAD = ids("""virasana supta-virasana padmasana baddha-padmasana ardha-padmasana bhekasana ardha-bhekasana mandukasana malasana
               eka-pada-rajakapotasana kapotasana-elokeszito agnistambhasana gomukhasana laghu-vajrasana kapotasana nyereg-yin
               labujjguggolas-yin vajrasana hattyu-yin alvo-hattyu-yin cipofuzo-yin negyzet-yin""")
DEEP_BACKBEND = ids("""urdhva-dhanurasana eka-pada-urdhva-dhanurasana dhanurasana ustrasana kapotasana laghu-vajrasana bhekasana
                   dvi-pada-viparita-dandasana camatkarasana natarajasana eka-pada-rajakapotasana eka-pada-rajakapotasana-hableany
                   supta-virasana vrscikasana""")
STRONG_CORE = ids("navasana ardha-navasana urdhva-prasarita-padasana uttanapadasana jathara-parivartanasana mayurasana")
DEEP_TWIST = ids("pasasana maricyasana-iii parivrtta-parsvakonasana parivrtta-ardha-candrasana parivrtta-utkatasana ardha-matsyendrasana")

# --- Ellenpózok -------------------------------------------------------------------
COUNTER = {}
for i in DEEP_BACKBEND | ids("bhujangasana salabhasana viparita-salabhasana urdhva-mukha-svanasana ardha-ustrasana"):
    COUNTER[i] = "balasana"
for i in ids("setu-bandha-sarvangasana eka-pada-setu-bandha-sarvangasana urdhva-dhanurasana matsyasana"):
    COUNTER[i] = "apanasana"
for i in ids("salamba-sarvangasana halasana karnapidasana niralamba-sarvangasana eka-pada-sarvangasana"):
    COUNTER[i] = "matsyasana"
for i in ids("salamba-sirsasana salamba-sirsasana-ii ardha-sirsasana adho-mukha-vrksasana pincha-mayurasana"):
    COUNTER[i] = "balasana"
for i in ids("navasana ardha-navasana urdhva-prasarita-padasana uttanapadasana"):
    COUNTER[i] = "setu-bandha-sarvangasana"
for i in ids("pascimottanasana janu-sirsasana kurmasana upavistha-konasana"):
    COUNTER[i] = "ardha-purvottanasana"

# A cautions.ts mintái (szinkronban kell tartani!).
CONDITION_PATTERNS = {
    "magasvn": r"magas vérnyomás",
    "alacsonyvn": r"alacsony vérnyomás|szédül",
    "terhes": r"terhes|várandós",
    "nyak": r"nyak\w*\s?(sérül|panasz|probl|fájd)|nyaki (panasz|probl|sérül)",
    "vall": r"váll\w*\s?(sérül|panasz|probl|fájd|delikát)|váll- ",
    "csuklo": r"csukló\w*\s?(sérül|panasz|probl|fájd)|csukló-",
    "derek": r"derék|hát(sérül|fájd|panasz|probl)|ágyék|porckorong|isiász|gerinc\w*\s?(sérül|probl|panasz)",
    "csipo": r"csípő\w*\s?(sérül|panasz|probl|fájd)|csípőprotézis",
    "terd": r"térd\w*\s?(sérül|panasz|fájd|probl|érzékeny)|ha a térd fáj",
    "boka": r"boka|bütyök|lábujjprobl",
    "combh": r"combhajlító",
    "szem": r"glaukóm|szem\w*\s?(probl|nyomás|műtét)",
    "sziv": r"szívbeteg|mellkasi fájdalom",
    "menstruacio": r"menstruáció",
    "hasi": r"sérv|hasi műtét|fekély",
    "szorongas": r"szorongás|pánik",
    "epilepszia": r"epilepszi",
}


def position(p):
    for pos, s in POSITION.items():
        if p["id"] in s:
            return pos
    return POSITION_BY_CAT[p["category"]]


def intensity(p):
    for lv, s in INTENSITY.items():
        if p["id"] in s:
            return lv
    base = CAT_INTENSITY[p["category"]]
    return max(1, min(5, base + (p["level"] - 2)))


def phases(p, inten):
    out = []
    if p["id"] in WARM_IDS:
        out.append("bemelegites")
    if p["category"] != "pihen":
        out.append("fo")
    if p["id"] in RELAX_IDS or (p["category"] in COOL_CATS and inten <= 2 and p["level"] == 1):
        out.append("levezetes")
    if p["id"] in RELAX_IDS:
        out.append("relaxacio")
    return out


def avoid_for(p, inten):
    text = p["cautions"].lower()
    out = {c for c, pat in CONDITION_PATTERNS.items() if re.search(pat, text)}
    i = p["id"]
    if i in HEAD_DOWN:
        out |= {"magasvn", "szem", "menstruacio", "nyak", "sziv", "terhes"}
    if p["category"] == "forditott" and i not in HEAD_DOWN and i not in ("viparita-karani",):
        out |= {"szem"}
    if i in WRIST_LOAD and inten >= 2:
        out.add("csuklo")
    if i in KNEE_LOAD:
        out.add("terd")
    if i in DEEP_BACKBEND:
        out |= {"derek", "nyak"}
    if i in STRONG_CORE:
        out |= {"derek", "hasi", "menstruacio", "terhes"}
    if i in DEEP_TWIST:
        out |= {"derek", "hasi", "menstruacio", "terhes"}
    if inten >= 4:
        out |= {"sziv", "magasvn"}
    return sorted(out)


def hold(p, inten):
    if p["category"] == "yin":
        return {"breaths": 0, "sec": 180}
    if p["id"] in RELAX_IDS or p["category"] == "pihen":
        return {"breaths": 0, "sec": 90}
    if inten >= 4:
        return {"breaths": 3, "sec": 20}
    if p["category"] in ("elore", "csipo") and p["level"] == 1:
        return {"breaths": 8, "sec": 45}
    return {"breaths": 5, "sec": 30}


def main():
    data = json.loads(PATH.read_text(encoding="utf-8"))
    known = {p["id"] for p in data["poses"]}
    for name, groups in (("POSITION", POSITION), ("STRENGTHENS", STRENGTHENS), ("STRETCHES", STRETCHES), ("INTENSITY", INTENSITY)):
        for k, s in groups.items():
            bad = s - known
            assert not bad, f"{name}[{k}]: ismeretlen azonosító: {sorted(bad)}"
    for s in (NOT_SIDED, WARM_IDS, RELAX_IDS, HEAD_DOWN, KNEE_LOAD, DEEP_BACKBEND, STRONG_CORE, DEEP_TWIST, set(COUNTER), set(COUNTER.values())):
        bad = s - known
        assert not bad, f"ismeretlen azonosító: {sorted(bad)}"

    for p in data["poses"]:
        inten = intensity(p)
        p["sided"] = p["id"] not in NOT_SIDED
        p["position"] = position(p)
        p["strengthens"] = sorted(k for k, s in STRENGTHENS.items() if p["id"] in s)
        p["stretches"] = sorted(k for k, s in STRETCHES.items() if p["id"] in s)
        p["intensity"] = inten
        p["phases"] = phases(p, inten)
        p["avoidFor"] = avoid_for(p, inten)
        if p["id"] in COUNTER:
            p["counterpose"] = COUNTER[p["id"]]
        else:
            p.pop("counterpose", None)
        p["hold"] = hold(p, inten)

    data["version"] = 6
    data["practiceNote"] = (
        "v6: gyakorlási mezők az óragenerátorhoz (sided, position, strengthens, stretches, intensity, phases, "
        "avoidFor, counterpose, hold). Forrás: scripts/adat/pozadat.py."
    )
    PATH.write_text(json.dumps(data, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    n = len(data["poses"])
    print(f"{n} ászana frissítve (v6)")
    for k in STRENGTHENS:
        print(f"  erősít {k}: {sum(k in p['strengthens'] for p in data['poses'])}")
    print("  oldalas:", sum(p["sided"] for p in data["poses"]))


if __name__ == "__main__":
    main()
