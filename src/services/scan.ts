// Receipt photo → text, read on the phone (Google ML Kit on Android, Apple Vision on iOS).
// Needs the Corpus app build — Expo Go and the web don't include the text reader, so canScan is false there.
import { requireOptionalNativeModule } from 'expo';
import * as ImagePicker from 'expo-image-picker';
import { Platform } from 'react-native';

type TextReader = { isSupported: boolean; extractTextFromImage: (path: string) => Promise<string[]> };
const reader = Platform.OS === 'web' ? null : requireOptionalNativeModule<TextReader>('ExpoTextExtractor');

export const canScan = !!reader?.isSupported;

export type ScanResult = { ok: true; text: string } | { ok: false; reason: 'cancelled' | 'denied' | 'empty' | 'unavailable' };

export async function scanReceipt(from: 'camera' | 'library'): Promise<ScanResult> {
  if (!reader?.isSupported) return { ok: false, reason: 'unavailable' };
  const perm = from === 'camera' ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) return { ok: false, reason: 'denied' };
  const opts: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 1, allowsEditing: from === 'camera' };
  const res = from === 'camera' ? await ImagePicker.launchCameraAsync(opts) : await ImagePicker.launchImageLibraryAsync(opts);
  if (res.canceled || !res.assets?.[0]) return { ok: false, reason: 'cancelled' };
  const blocks = await reader.extractTextFromImage(res.assets[0].uri.replace('file://', ''));
  const text = blocks.join('\n').trim();
  return text ? { ok: true, text } : { ok: false, reason: 'empty' };
}
