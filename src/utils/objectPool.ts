export class ObjectPool<T extends { active: boolean }> {
  private pool: T[] = []

  constructor(factory: () => T, size: number) {
    for (let i = 0; i < size; i++) {
      this.pool.push(factory())
    }
  }

  acquire(): T | null {
    return this.pool.find(obj => !obj.active) ?? null
  }

  release(obj: T): void {
    obj.active = false
  }

  getActive(): T[] {
    return this.pool.filter(obj => obj.active)
  }
}
