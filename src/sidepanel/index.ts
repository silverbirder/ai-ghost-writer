import { html, css, LitElement } from 'lit'
import { customElement, property, state } from 'lit/decorators.js'

/**
 * sidepanel
 */
@customElement('crx-sidepanel')
export class Sidepanel extends LitElement {
  @property()
  crx = 'create-chrome-ext'

  @state()
  texts: string[] = ['']

  _onMessage = ({ name, data }: { name: string; data: any }) => {
    console.info('_onMessage', { name, data })
    switch (name) {
      case 'proofreading-start':
        this.texts = []
        break
      case 'proofreading-inprogress':
        this.texts.push(data.choices[0].delta.content)
        break
      case 'proofreading-end':
        break
    }
    this.requestUpdate()
  }

  connectedCallback() {
    super.connectedCallback()
    console.info('connectedCallback')
    chrome.runtime.onMessage.addListener(this._onMessage)
  }

  disconnectedCallback() {
    super.disconnectedCallback()
    console.info('disconnectedCallback')
    chrome.runtime.onMessage.removeListener(this._onMessage)
  }

  render() {
    return html`
      <main>
        <h3>Comments from AI ghost writer</h3>
        <div>${this.texts.join('')}</div>
      </main>
    `
  }

  static styles = css`
    :global(body) {
      min-width: 20rem;
    }

    main {
      text-align: center;
      padding: 1em;
      margin: 0 auto;
    }

    h3 {
      color: #31c48d;
    }

    @media (min-width: 480px) {
      h3 {
        max-width: none;
      }
    }
  `
}

declare global {
  interface HTMLElementTagNameMap {
    'crx-sidepanel': Sidepanel
  }
}
