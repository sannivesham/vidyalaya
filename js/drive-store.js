// Backward-compatibility wrapper delegating to telegram-store and IndexedDB
import { uploadFileToTelegram, downloadFileFromTelegram } from './telegram-store.js'
import { getFileBlob } from './store.js'

export async function uploadFile(blob, fileName, mimeType) {
  return uploadFileToTelegram(blob, fileName)
}

export async function downloadFile(fileId) {
  const localBlob = await getFileBlob(fileId)
  if (localBlob) return localBlob
  return downloadFileFromTelegram(fileId)
}

export async function deleteFile(fileId) {
  // Telegram files don't need explicit deletion call
  return true
}
