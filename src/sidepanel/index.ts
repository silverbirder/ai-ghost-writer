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
  texts: string[] = ['hello']

  _onMessage = ({ name, data }: { name: string; data: any }) => {
    if (name === 'proofreading') {
      console.log('proofreading', { data })
      if (data.choices[0].delta.finish_reason === 'stop') {
        return
      }
      this.texts.push(data.choices[0].delta.content)
      this.requestUpdate()
    }
  }

  connectedCallback() {
    super.connectedCallback()
    chrome.runtime.onMessage.addListener(this._onMessage)
  }

  disconnectedCallback() {
    super.disconnectedCallback()
    chrome.runtime.onMessage.removeListener(this._onMessage)
  }

  render() {
    return html`
      <main>
        <h3>Sidepanel Page!</h3>

        <h6>v 0.0.0</h6>

        <slot></slot>

        <a href="https://www.npmjs.com/package/create-chrome-ext" target="_blank"
          >Generator by ${this.crx}</a
        >
        <div>${this.texts.join('')}</div>
      </main>
    `
  }

  static styles = css`
    :root {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell,
        'Open Sans', 'Helvetica Neue', sans-serif;
    }

    :global(body) {
      min-width: 20rem;
    }

    main {
      text-align: center;
      padding: 1em;
      margin: 0 auto;
    }

    h3 {
      color: #3355ff;
      text-transform: uppercase;
      font-size: 1.5rem;
      font-weight: 200;
      line-height: 1.2rem;
      margin: 2rem auto;
    }

    h6 {
      font-size: 0.5rem;
      color: #333333;
      margin: 0.5rem;
    }

    a {
      font-size: 0.5rem;
      margin: 0.5rem;
      color: #cccccc;
      text-decoration: none;
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
