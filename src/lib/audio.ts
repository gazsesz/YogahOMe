import { setAudioModeAsync, useAudioPlayer } from 'expo-audio';
import * as Speech from 'expo-speech';
import { useCallback, useEffect } from 'react';

// Hangjelzés (expo-audio) és magyar narráció a telefon beépített felolvasójával
// (expo-speech). Ehhez nem kell kisegítő lehetőséget bekapcsolni: a rendszer
// szövegfelolvasó motorját használja, mint a navigációs appok.

export const SPEECH_LANG = 'hu-HU';

export function speak(text: string, onDone?: () => void) {
  Speech.stop();
  Speech.speak(text, { language: SPEECH_LANG, rate: 0.92, pitch: 1, onDone });
}

export const stopSpeech = () => {
  Speech.stop();
};

/** Van-e magyar hang az eszközön (ha nincs, a telefon az alapértelmezett nyelvén próbálja). */
export async function hasHungarianVoice(): Promise<boolean | null> {
  try {
    const voices = await Speech.getAvailableVoicesAsync();
    if (!voices.length) return null; // némelyik böngésző csak később tölti be a hangokat
    return voices.some((v) => v.language?.toLowerCase().replace('_', '-').startsWith('hu'));
  } catch {
    return null;
  }
}

/** A két hangjelzés lejátszója. */
export function useSignals() {
  const gong = useAudioPlayer(require('../../assets/sounds/gong.wav'));
  const chime = useAudioPlayer(require('../../assets/sounds/chime.wav'));
  useEffect(() => {
    // iOS-en a némító kapcsoló állásától függetlenül szóljon, és ne állítsa le a háttérzenét.
    setAudioModeAsync({ playsInSilentMode: true, interruptionMode: 'duckOthers' }).catch(() => undefined);
  }, []);
  return useCallback(
    (which: 'gong' | 'chime') => {
      const p = which === 'gong' ? gong : chime;
      try {
        p.seekTo(0);
        p.play();
      } catch {
        // a hangjelzés hiánya ne akassza meg a gyakorlást
      }
    },
    [gong, chime],
  );
}
