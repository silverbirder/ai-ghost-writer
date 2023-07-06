import { html, css, LitElement } from 'lit'
import { customElement, property, state } from 'lit/decorators.js'

/**
 * options
 */
@customElement('crx-options')
export class Options extends LitElement {
  @property()
  crx = 'create-chrome-ext'

  @state()
  apiToken = ''

  @state()
  proofreading = ''

  private _onTokenSubmit(event: Event) {
    event.preventDefault()
    const apiToken = (this.shadowRoot!.getElementById('apiToken') as HTMLInputElement).value
    chrome.storage.sync.set({ apiToken }, () => {
      console.log('API Token is stored in Chrome storage.')
    })
  }

  private _onMessageSubmit(event: Event) {
    event.preventDefault()
    const proofreading = (this.shadowRoot!.getElementById('proofreading') as HTMLInputElement).value
    chrome.storage.sync.set({ proofreading }, () => {
      console.log('Proofreading is stored in Chrome storage.')
    })
  }

  connectedCallback() {
    super.connectedCallback()
    chrome.storage.sync.get('apiToken').then(({ apiToken }) => {
      this.apiToken = apiToken
    })
    chrome.storage.sync.get('proofreading').then(({ proofreading }) => {
      this.proofreading = proofreading
    })
  }

  render() {
    return html`
      <main>
        <h2>OpenAI API Token Settings</h2>
        <form id="apiTokenForm" @submit="${this._onTokenSubmit}">
          <label for="apiToken">API Token:</label>
          <input type="text" id="apiToken" placeholder="sk-" value="${this.apiToken}" />
          <input type="submit" value="Save" />
        </form>
        <h2>OpenAI System Message Settings</h2>
        <form id="systemMessage" @submit="${this._onMessageSubmit}">
          <label for="proofreading">Proofreading:</label>
          <textarea id="proofreading" placeholder="" value="${this.proofreading}"></textarea>
          <input type="submit" value="Save" />
        </form>
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

    h1 {
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
    'crx-options': Options
  }
}
