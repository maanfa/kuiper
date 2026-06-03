import { parentPort } from 'node:worker_threads'
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import type { WorkerFileEntry, WorkerCommand } from './worker-protocol'

parentPort?.on('message', (cmd: WorkerCommand) => {
  try {
    switch (cmd.type) {
      case 'read': {
        const results: WorkerFileEntry[] = cmd.files.map((f) => ({
          path: f.path,
          z: f.z,
          x: f.x,
          y: f.y,
          data: readFileSync(f.path),
        }))
        parentPort!.postMessage({ type: 'result', id: cmd.id, data: results })
        break
      }
      case 'write': {
        for (const f of cmd.files) {
          mkdirSync(dirname(f.path), { recursive: true })
          writeFileSync(f.path, f.data!)
        }
        parentPort!.postMessage({ type: 'result', id: cmd.id, data: cmd.files.map((f) => ({ path: f.path })) })
        break
      }
      case 'readInsert': {
        const db = new DatabaseSync(cmd.dbPath!)
        db.exec(`
          CREATE TABLE tiles (
            z INTEGER NOT NULL,
            x INTEGER NOT NULL,
            y INTEGER NOT NULL,
            data BLOB NOT NULL,
            PRIMARY KEY (z, x, y)
          ) WITHOUT ROWID
        `)
        const stmt = db.prepare('INSERT INTO tiles (z, x, y, data) VALUES (?, ?, ?, ?)')
        db.exec('BEGIN')
        for (const f of cmd.files) {
          const data = readFileSync(f.path)
          stmt.run(f.z!, f.x!, f.y!, data)
        }
        db.exec('COMMIT')
        db.close()
        parentPort!.postMessage({ type: 'result', id: cmd.id })
        break
      }
    }
  } catch (err) {
    parentPort!.postMessage({ type: 'error', id: cmd.id, error: (err as Error).message })
  }
})
