import { html, css, LitElement } from 'lit'
import { customElement, state } from 'lit/decorators.js'

/**
 * sidepanel
 */
@customElement('crx-sidepanel')
export class Sidepanel extends LitElement {
  @state()
  chats: { selectionText: string; comments: string[] }[] = []

  _onMessage = ({
    name,
    data,
    selectionText,
  }: {
    name: string
    data: any
    selectionText: string
  }) => {
    console.info('_onMessage', { name, data, selectionText })
    switch (name) {
      case 'proofreading-start':
        this.chats.push({ selectionText, comments: [] })
        break
      case 'proofreading-inprogress':
        this.chats[this.chats.length - 1].comments.push(data.choices[0].delta.content)
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
        <div>
          ${this.chats.map(({ comments, selectionText }) => {
            return html`<div>
              <h4>Selection Text: ${selectionText}</h4>
              <div>${comments.join('')}</div>
            </div>`
          })}
        </div>
      </main>
    `
  }

  static styles = css`
    :global(body) {
      min-width: 20rem;
    }

    main {
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
