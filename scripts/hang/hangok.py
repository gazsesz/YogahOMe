"""Hangjelzések generálása a gyakorlás módhoz (assets/sounds/*.wav).

gong.wav  – szakaszváltás: mély, lecsengő tál-/gonghang (inharmonikus felhangok).
chime.wav – pózváltás: rövid, halk csengő.
Futtatás: python3 scripts/hang/hangok.py
"""
import math, struct, wave, pathlib

RATE = 22050
OUT = pathlib.Path(__file__).resolve().parents[2] / 'assets' / 'sounds'


def render(partials, dur, attack=0.004):
    n = int(RATE * dur)
    data = []
    for i in range(n):
        t = i / RATE
        env_a = min(1.0, t / attack)
        v = sum(a * math.exp(-t / d) * math.sin(2 * math.pi * f * t) for f, a, d in partials)
        data.append(v * env_a)
    peak = max(abs(x) for x in data) or 1
    return [x / peak for x in data]


def write(name, samples, gain):
    OUT.mkdir(parents=True, exist_ok=True)
    with wave.open(str(OUT / name), 'wb') as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(RATE)
        w.writeframes(b''.join(struct.pack('<h', int(s * gain * 32767)) for s in samples))


# Éneklő tál jellegű gong: alaphang 196 Hz (G3) + inharmonikus felhangok, lassú lecsengés.
gong = render([(196, 1.0, 1.6), (196 * 2.76, 0.5, 0.9), (196 * 5.4, 0.25, 0.5), (198.5, 0.6, 1.8)], 3.2, attack=0.01)
write('gong.wav', gong, 0.8)

# Halk csengő: 880 Hz + 2,0x és 3,0x felhang, gyors lecsengés.
chime = render([(880, 1.0, 0.25), (1760, 0.35, 0.15), (2640, 0.15, 0.08)], 0.7)
write('chime.wav', chime, 0.45)
print('ok', list(OUT.iterdir()))
