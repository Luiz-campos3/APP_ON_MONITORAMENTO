import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';

import type { UploadFile } from '@/services/mobile-api';

// Maior lado da imagem enviada e qualidade do JPEG. O reencode via manipulator
// **descarta o EXIF** (inclui GPS/identificação do aparelho) antes do upload —
// requisito de LGPD da Fase B.
const MAX_DIMENSION = 1600;
const JPEG_QUALITY = 0.7;
// Limite real do backend para a foto do chamado (responde 400 acima disso).
// Guarda defensiva pós-compressão — na prática o reencode já mantém bem abaixo.
const TICKET_PHOTO_MAX_BYTES = 10 * 1024 * 1024;

export type PhotoResult = { file: UploadFile } | { error: string } | null;

// Tamanho em bytes do arquivo local, sem dependência nova (blob do próprio uri).
// Best-effort: se não der para medir, retorna 0 e a guarda não bloqueia (o
// servidor ainda barra com 400) — nunca impede o envio por falha de medição.
async function fileByteSize(uri: string): Promise<number> {
  try {
    const blob = await (await fetch(uri)).blob();
    return blob.size ?? 0;
  } catch {
    return 0;
  }
}

async function processImage(uri: string, width?: number): Promise<UploadFile> {
  const context = ImageManipulator.manipulate(uri);
  if (typeof width === 'number' && width > MAX_DIMENSION) {
    context.resize({ width: MAX_DIMENSION });
  }
  const image = await context.renderAsync();
  // Sempre reencoda (mesmo sem resize) → remove metadados do original.
  const result = await image.saveAsync({ compress: JPEG_QUALITY, format: SaveFormat.JPEG });
  return { uri: result.uri, name: `chamado-${Date.now()}.jpg`, mimeType: 'image/jpeg' };
}

async function fromAsset(result: ImagePicker.ImagePickerResult): Promise<PhotoResult> {
  if (result.canceled || !result.assets?.length) return null;
  const asset = result.assets[0];
  const file = await processImage(asset.uri, asset.width);
  const bytes = await fileByteSize(file.uri);
  if (bytes > TICKET_PHOTO_MAX_BYTES) {
    return { error: 'A foto ficou acima de 10 MB mesmo após a compressão. Tente outra imagem.' };
  }
  return { file };
}

export async function captureTicketPhoto(): Promise<PhotoResult> {
  const permission = await ImagePicker.requestCameraPermissionsAsync();
  if (!permission.granted) {
    return { error: 'Permita o acesso à câmera nos ajustes do sistema para tirar a foto.' };
  }
  return fromAsset(await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 1 }));
}

export async function pickTicketPhoto(): Promise<PhotoResult> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    return { error: 'Permita o acesso às fotos nos ajustes do sistema para anexar a imagem.' };
  }
  return fromAsset(await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 1 }));
}
