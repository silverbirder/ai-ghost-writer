import { html, css, LitElement } from 'lit'
import { customElement, state } from 'lit/decorators.js'
import { unsafeHTML } from 'lit/directives/unsafe-html.js'

/**
 * sidepanel
 */
@customElement('crx-sidepanel')
export class Sidepanel extends LitElement {
  @state()
  chats: {
    type: string
    selectionText: string
    comments: string[]
    enabled: { stop: boolean; continue: boolean }
  }[] = [
    // {
    //   type: 'proofreading',
    //   selectionText: 'A'.repeat(1000),
    //   comments: ['B'.repeat(2000)],
    //   enabled: { stop: false, continue: false },
    // },
  ]

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
          type: 'proofreading',
          selectionText,
          comments: [],
          enabled: {
            stop: true,
            continue: false,
          },
        })
        console.log('proofreading-start')
        break
      case 'proofreading-inprogress':
        console.info(data)
        this.chats[this.chats.length - 1].comments.push(data)
        this.chats[this.chats.length - 1].enabled.stop = true
        break
      case 'proofreading-end':
        console.info(this.chats[this.chats.length - 1].comments)
        this.chats[this.chats.length - 1].enabled.stop = false
        this.chats[this.chats.length - 1].enabled.continue =
          finishReason === 'length' ? true : false
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

  private async _onStopClick() {
    console.log('onStopClick')
    await chrome.runtime.sendMessage({ stop: true })
    this.chats[this.chats.length - 1].enabled.stop = false
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
              ${this.chats.map(({ type, comments, selectionText, enabled }) => {
                return html` <div class="chat-message user-message">
                    <img
                      src="https://google-account-photo.vercel.app/api/?account_id=101722346324226588907"
                      alt="You"
                      class="avatar"
                    />
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
                  </div>`
              })}
            </div>`
          : ''}
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
  `
}

declare global {
  interface HTMLElementTagNameMap {
    'crx-sidepanel': Sidepanel
  }
}
