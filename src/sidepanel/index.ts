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
    name: string
    id: string
    type: string
    selectionText: string
    comments: string[]
    enabled: { stop: boolean; continue: boolean }
  }[] = []

  _onMessage = ({
    name,
    id,
    data,
    contextMenuName,
    selectionText,
    finishReason,
  }: {
    name: string
    id: string
    data: any
    contextMenuName: string
    selectionText: string
    finishReason: string
  }) => {
    switch (name) {
      case 'smoke':
        console.log('smoke ok!')
        return
      case 'start':
        this.chats.push({
          name: name,
          id: id,
          type: contextMenuName,
          selectionText,
          comments: [],
          enabled: {
            stop: true,
            continue: false,
          },
        })
        console.log('start')
        break
      case 'inprogress':
        console.info(data)
        this.chats[this.chats.length - 1].comments.push(data)
        this.chats[this.chats.length - 1].enabled.stop = true
        break
      case 'end':
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
    const hello = chrome.i18n.getMessage('hello')
    console.log(hello)
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
    chrome.storage.sync.set({ chats: this.chats })
    this.requestUpdate()
  }

  private _onRemoveClick(index: number) {
    this.chats.splice(index, 1)
    chrome.storage.sync.set({ chats: this.chats })
    this.requestUpdate()
  }

  private async _onContinueClick() {
    const chat = this.chats[this.chats.length - 1]
    console.log({ chat })
    await chrome.runtime.sendMessage({ continue: true, chat: chat })
    this.chats[this.chats.length - 1].enabled.continue = false
    chrome.storage.sync.set({ chats: this.chats })
    this.requestUpdate()
  }
  render() {
    return html`
      <main>
        <h3>${chrome.i18n.getMessage('comments_from_ai')}</h3>
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
                          ${chrome.i18n.getMessage('stop')}
                        </button>`
                      : ''}
                    ${enabled.continue === true
                      ? html`<button
                          class="message-button continue-button"
                          @click="${this._onContinueClick}"
                        >
                          ${chrome.i18n.getMessage('continue')}
                        </button>`
                      : ''}
                  </div>
                </div>`
              })}
            </div>`
          : html`<p>${chrome.i18n.getMessage('please_select_the_text')}</p>`}
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
      color: black;
      border: 1px solid #ddd;
      border-radius: 50%;
      width: 20px;
      height: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
    }

    @media (prefers-color-scheme: dark) {
      .remove-icon {
        background-color: black;
        color: white;
      }
    }

    .chat-section {
      border: 1px solid #ddd;
      margin-bottom: 10px;
      padding: 5px;
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
