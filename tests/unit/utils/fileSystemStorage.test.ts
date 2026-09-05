import { describe, expect, it } from 'vitest'
import { FileSystemStorage } from '@/utils/storage/fileSystemStorage'

describe('folder backup reads', () => {
  it('reports a malformed backup instead of treating it as a missing file', async () => {
    const storage = new FileSystemStorage()
    ;(storage as any).directoryHandle = { getFileHandle: async () => ({ getFile: async () => ({ text: async () => '{broken' }) }) }
    await expect(storage.readFile('RECIPES')).rejects.toThrow('recipes.json')
  })
  it('returns null only when the backup does not exist', async () => {
    const storage = new FileSystemStorage()
    ;(storage as any).directoryHandle = { getFileHandle: async () => { throw new DOMException('missing', 'NotFoundError') } }
    expect(await storage.readFile('RECIPES')).toBeNull()
  })
})
