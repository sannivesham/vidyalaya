import { getAccessToken } from './auth.js'

const DRIVE_FILES_URL = 'https://www.googleapis.com/drive/v3/files'
const DRIVE_UPLOAD_URL = 'https://www.googleapis.com/upload/drive/v3/files'
const FOLDER_NAME = 'Vidyalaya'

let folderIdCache = null

async function ensureAppFolder() {
  if (folderIdCache) return folderIdCache

  const cached = localStorage.getItem('vidyalaya-drive-folder-id')
  if (cached) { folderIdCache = cached; return cached }

  const token = await getAccessToken()

  // Look for an existing folder first, in case one was created in a past session
  const q = encodeURIComponent(`name='${FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false`)
  const searchRes = await fetch(`${DRIVE_FILES_URL}?q=${q}&fields=files(id,name)`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  const searchData = await searchRes.json()
  if (searchData.files?.length) {
    folderIdCache = searchData.files[0].id
    localStorage.setItem('vidyalaya-drive-folder-id', folderIdCache)
    return folderIdCache
  }

  // Create it
  const createRes = await fetch(DRIVE_FILES_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ name: FOLDER_NAME, mimeType: 'application/vnd.google-apps.folder' }),
  })
  const created = await createRes.json()
  folderIdCache = created.id
  localStorage.setItem('vidyalaya-drive-folder-id', folderIdCache)
  return folderIdCache
}

/**
 * Uploads a File/Blob to the user's Google Drive, inside the app's folder.
 * Returns the Drive file ID.
 */
export async function uploadFile(blob, fileName, mimeType) {
  const token = await getAccessToken()
  const folderId = await ensureAppFolder()

  const metadata = { name: fileName, parents: [folderId] }
  const boundary = 'vidyalaya-boundary-' + Math.random().toString(36).slice(2)
  const metadataPart =
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n`
  const filePartHeader = `--${boundary}\r\nContent-Type: ${mimeType || 'application/octet-stream'}\r\n\r\n`
  const closing = `\r\n--${boundary}--`

  const body = new Blob([metadataPart, filePartHeader, blob, closing])

  const res = await fetch(`${DRIVE_UPLOAD_URL}?uploadType=multipart&fields=id`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': `multipart/related; boundary=${boundary}`,
    },
    body,
  })
  if (!res.ok) throw new Error('Drive upload failed: ' + (await res.text()))
  const data = await res.json()
  return data.id
}

/**
 * Downloads a Drive file's raw bytes as a Blob.
 */
export async function downloadFile(driveFileId) {
  const token = await getAccessToken()
  const res = await fetch(`${DRIVE_FILES_URL}/${driveFileId}?alt=media`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error('Drive download failed: ' + (await res.text()))
  return res.blob()
}

/**
 * Deletes a file from Drive (called when the user removes it from their library).
 */
export async function deleteFile(driveFileId) {
  const token = await getAccessToken()
  await fetch(`${DRIVE_FILES_URL}/${driveFileId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  })
}
