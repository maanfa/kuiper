import { Worker } from 'node:worker_threads'
import type { WorkerFileEntry, WorkerCommand, WorkerResponse } from './worker-protocol'

export class FileWorkerPool {
  private workers: Worker[]
  private busy: boolean[]

  constructor(count: number, workerScript: string) {
    this.workers = []
    this.busy = []
    for (let i = 0; i < count; i++) {
      this.workers.push(new Worker(workerScript))
      this.busy.push(false)
    }
  }

  async readFiles(files: WorkerFileEntry[]): Promise<WorkerFileEntry[]> {
    if (files.length === 0) return []
    const batches = this.splitIntoBatches(files, this.workers.length)
    const tasks = batches.map((batch, i) => this.exec(i, { type: 'read', id: Date.now() + i, files: batch }))
    const results = await Promise.all(tasks)
    return results.flatMap((r) => r.data ?? [])
  }

  async writeFiles(entries: WorkerFileEntry[]): Promise<void> {
    if (entries.length === 0) return
    const batches = this.splitIntoBatches(entries, this.workers.length)
    const tasks = batches.map((batch, i) => this.exec(i, { type: 'write', id: Date.now() + i, files: batch }))
    await Promise.all(tasks)
  }

  destroy(): void {
    for (const w of this.workers) {
      w.terminate()
    }
  }

  /** 向指定 worker 发送任意命令并等待响应 */
  async sendCommand(workerIndex: number, cmd: WorkerCommand): Promise<WorkerResponse> {
    return this.exec(workerIndex, cmd)
  }

  private async exec(workerIndex: number, cmd: WorkerCommand): Promise<WorkerResponse> {
    await this.waitFree(workerIndex)
    const worker = this.workers[workerIndex]
    this.busy[workerIndex] = true

    return new Promise<WorkerResponse>((resolve, reject) => {
      let settled = false

      const onMessage = (msg: WorkerResponse) => {
        if (msg.id !== cmd.id) return
        settled = true
        cleanup()
        if (msg.type === 'error') {
          reject(new Error(msg.error))
        } else {
          resolve(msg)
        }
      }

      const onError = (err: Error) => {
        if (settled) return
        settled = true
        cleanup()
        reject(new Error(`子线程 ${workerIndex} 错误: ${err.message}`))
      }

      const onExit = (code: number) => {
        if (settled) return
        settled = true
        cleanup()
        reject(new Error(`子线程 ${workerIndex} 意外退出 (code: ${code})`))
      }

      const timer = setTimeout(() => {
        if (settled) return
        settled = true
        cleanup()
        worker.terminate()
        reject(new Error(`子线程 ${workerIndex} 响应超时 (30s)，已终止`))
      }, 30000)

      function cleanup(): void {
        worker.removeListener('message', onMessage)
        worker.removeListener('error', onError)
        worker.removeListener('exit', onExit)
        clearTimeout(timer)
      }

      worker.on('message', onMessage)
      worker.once('error', onError)
      worker.once('exit', onExit)
      worker.postMessage(cmd)
    }).finally(() => {
      this.busy[workerIndex] = false
    })
  }

  private async waitFree(workerIndex: number): Promise<void> {
    while (this.busy[workerIndex]) {
      await new Promise((r) => setTimeout(r, 10))
    }
  }

  private splitIntoBatches<T>(arr: T[], n: number): T[][] {
    const size = Math.ceil(arr.length / n)
    const batches: T[][] = []
    for (let i = 0; i < arr.length; i += size) {
      batches.push(arr.slice(i, i + size))
    }
    return batches
  }
}
