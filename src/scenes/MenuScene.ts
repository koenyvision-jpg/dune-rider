import Phaser from 'phaser'

export class MenuScene extends Phaser.Scene {
  private menuEl: HTMLDivElement | null = null
  private injectedStyles: HTMLStyleElement[] = []

  constructor() { super('MenuScene') }

  create(): void {
    ;(window as any).__startGame = () => {
      this.removeMenu()
      this.scene.start('GameScene')
    }

    fetch(import.meta.env.BASE_URL + 'menu.html')
      .then(r => r.text())
      .then(html => this.injectMenu(html))
  }

  private injectMenu(html: string): void {
    const doc = new DOMParser().parseFromString(html, 'text/html')

    // Inject <style> blocks into document head
    doc.querySelectorAll('style').forEach(s => {
      const style = document.createElement('style')
      style.textContent = s.textContent
      document.head.appendChild(style)
      this.injectedStyles.push(style)
    })

    // Wrapper replicates the body centering from menu.html
    const wrapper = document.createElement('div')
    wrapper.style.cssText = 'position:fixed;inset:0;z-index:1000;background:#0a0010;display:flex;align-items:center;justify-content:center;overflow:hidden;'

    // Copy all non-script body children into wrapper
    Array.from(doc.body.childNodes).forEach(node => {
      if ((node as Element).tagName !== 'SCRIPT') {
        wrapper.appendChild(document.importNode(node, true))
      }
    })

    document.body.appendChild(wrapper)
    this.menuEl = wrapper

    // Execute scripts in order (innerHTML doesn't run them)
    doc.querySelectorAll('script').forEach(old => {
      const s = document.createElement('script')
      s.textContent = old.textContent
      document.body.appendChild(s)
      document.body.removeChild(s)
    })
  }

  private removeMenu(): void {
    this.menuEl?.remove()
    this.menuEl = null
    this.injectedStyles.forEach(s => s.remove())
    this.injectedStyles = []
    delete (window as any).__startGame
  }

  shutdown(): void {
    this.removeMenu()
  }
}
