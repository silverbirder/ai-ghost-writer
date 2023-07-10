import { html, css, LitElement } from 'lit'
import { customElement, state } from 'lit/decorators.js'
import { unsafeHTML } from 'lit/directives/unsafe-html.js'

/**
 * sidepanel
 */
@customElement('crx-sidepanel')
export class Sidepanel extends LitElement {
  @state()
  avatarUrl: string = ''
  @state()
  chats: {
    type: string
    selectionText: string
    comments: string[]
    enabled: { stop: boolean; continue: boolean }
  }[] = []

  _onMessage = ({
    name,
    data,
    selectionText,
    finishReason,
  }: {
    name: string
    data: any
    selectionText: string
    finishReason: string
  }) => {
    switch (name) {
      case 'proofreading-start':
        this.chats.push({
          type: 'Proofreading',
          selectionText,
          comments: [],
          enabled: {
            stop: true,
            continue: false,
          },
        })
        console.log('proofreading-start')
        break
      case 'generate-title-start':
        this.chats.push({
          type: 'Generate title',
          selectionText,
          comments: [],
          enabled: {
            stop: true,
            continue: false,
          },
        })
        console.log('generate-title-start')
        break
      case 'generate-following-text-start':
        this.chats.push({
          type: 'Generate following text',
          selectionText,
          comments: [],
          enabled: {
            stop: true,
            continue: false,
          },
        })
        console.log('generate-next-text-start')
        break
      case 'proofreading-inprogress':
      case 'generate-title-inprogress':
      case 'generate-following-text-inprogress':
        console.info(data)
        this.chats[this.chats.length - 1].comments.push(data)
        this.chats[this.chats.length - 1].enabled.stop = true
        break
      case 'proofreading-end':
      case 'generate-title-end':
      case 'generate-following-text-end':
        console.info(this.chats[this.chats.length - 1].comments)
        this.chats[this.chats.length - 1].enabled.stop = false
        this.chats[this.chats.length - 1].enabled.continue =
          finishReason === 'length' ? true : false
        break
    }
    this.requestUpdate()
    chrome.storage.sync.set({ chats: this.chats })
  }

  connectedCallback() {
    super.connectedCallback()
    console.info('connectedCallback')
    chrome.storage.sync.get(['avatarUrl', 'chats']).then(({ avatarUrl, chats }) => {
      this.avatarUrl = avatarUrl
      this.chats = chats || []
    })
    chrome.runtime.onMessage.addListener(this._onMessage)
  }

  disconnectedCallback() {
    super.disconnectedCallback()
    console.info('disconnectedCallback')
    chrome.storage.sync.set({ chats: this.chats })
    chrome.runtime.onMessage.removeListener(this._onMessage)
  }

  private async _onStopClick() {
    console.log('onStopClick')
    await chrome.runtime.sendMessage({ stop: true })
    this.chats[this.chats.length - 1].enabled.stop = false
    this.requestUpdate()
  }

  private _onRemoveClick(index: number) {
    this.chats.splice(index, 1)
    chrome.storage.sync.set({ chats: this.chats })
    this.requestUpdate()
  }

  private async _onContinueClick() {
    const chat = this.chats[this.chats.length - 1]
    await chrome.runtime.sendMessage({ continue: true, chat: chat })
    this.chats[this.chats.length - 1].enabled.continue = false
    this.requestUpdate()
  }
  render() {
    return html`
      <main>
        <h3>Comments from AI ghost writer</h3>
        ${this.chats.length > 0
          ? html`<div class="chat-container">
              ${this.chats.map(({ type, comments, selectionText, enabled }, index) => {
                return html`<div class="chat-section">
                  <div class="remove-icon" @click="${() => this._onRemoveClick(index)}">
                    &times;
                  </div>
                  <div class="chat-message user-message">
                    <img src="${this.avatarUrl}" alt="You" class="avatar" />
                    <p>${type} "${selectionText}"</p>
                  </div>
                  <div class="chat-message bot-message">
                    <img src="/img/logo-128.png" alt="Bot" class="avatar" />
                    <p>${unsafeHTML(comments.join('').replace(/\n/g, '<br>'))}</p>
                  </div>
                  <div class="bot-message-buttons">
                    ${enabled.stop === true
                      ? html`<button
                          class="message-button stop-button"
                          @click="${this._onStopClick}"
                        >
                          Stop
                        </button>`
                      : ''}
                    ${enabled.continue === true
                      ? html`<button
                          class="message-button continue-button"
                          @click="${this._onContinueClick}"
                        >
                          Continue
                        </button>`
                      : ''}
                  </div>
                </div>`
              })}
            </div>`
          : html`<p>
              Please select the text on the browser, open the context menu by right-clicking, and
              select 'Proofreading'.
            </p>`}
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

    .chat-container {
      display: flex;
      flex-direction: column;
      padding: 10px;
      border-radius: 5px;
    }

    .avatar {
      width: 50px;
      height: 50px;
      border-radius: 50%;
      object-fit: cover;
      margin-right: 10px;
    }

    .chat-message {
      position: relative;
      margin-bottom: 10px;
      display: flex;
      align-items: center;
      min-height: 50px;
      width: 100%;
    }

    .chat-message p {
      margin: 0;
      overflow-wrap: anywhere;
    }

    .user-message {
      align-self: flex-start;
    }

    .bot-message {
      align-self: flex-end;
    }

    .bot-message-buttons {
      display: flex;
      justify-content: space-around;
      margin-bottom: 10px;
    }

    .message-button {
      padding: 10px 20px;
      font-size: 16px;
      border: none;
      border-radius: 5px;
      color: white;
      cursor: pointer;
    }

    .stop-button {
      background-color: #f44336;
    }

    .stop-button:hover {
      background-color: #d32f2f;
    }

    .continue-button {
      background-color: #31c48d;
    }

    .continue-button:hover {
      background-color: #28b082;
    }

    .remove-icon {
      position: absolute;
      top: -10px;
      left: -10px;
      font-size: 20px;
      background-color: white;
      border: 1px solid #ddd;
      border-radius: 50%;
      width: 20px;
      height: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
    }

    .chat-section {
      border: 1px solid #ddd;
      margin-bottom: 10px;
      border-radius: 5px;
      position: relative;
    }
  `
}

declare global {
  interface HTMLElementTagNameMap {
    'crx-sidepanel': Sidepanel
  }
}
