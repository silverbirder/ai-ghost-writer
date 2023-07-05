import { html, css, LitElement } from 'lit'
import { customElement, property } from 'lit/decorators.js'

/**
 * options
 */
@customElement('crx-options')
export class Options extends LitElement {
  @property()
  crx = 'create-chrome-ext'

  private _onSubmit(event: Event) {
    event.preventDefault()
    const apiToken = (this.shadowRoot!.getElementById('apiToken') as HTMLInputElement).value
    chrome.storage.sync.set({ apiToken }, () => {
      console.log('API Token is stored in Chrome storage.')
    })
  }

  render() {
    return html`
      <main>
        <h1>OpenAI API Token Settings</h1>
        <form id="apiTokenForm" @submit="${this._onSubmit}">
          <label for="apiToken">API Token:</label>
          <input type="text" id="apiToken" placeholder="sk-" />
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
