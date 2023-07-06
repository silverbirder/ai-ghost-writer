import { html, css, LitElement } from 'lit'
import { customElement, state } from 'lit/decorators.js'
import { unsafeHTML } from 'lit/directives/unsafe-html.js'

/**
 * sidepanel
 */
@customElement('crx-sidepanel')
export class Sidepanel extends LitElement {
  @state()
  chats: { type: string; selectionText: string; comments: string[] }[] = []

  _onMessage = ({
    name,
    data,
    selectionText,
  }: {
    name: string
    data: any
    selectionText: string
  }) => {
    switch (name) {
      case 'proofreading-start':
        this.chats.push({ type: 'proofreading', selectionText, comments: [] })
        break
      case 'proofreading-inprogress':
        console.info(data.choices[0].delta.content)
        this.chats[this.chats.length - 1].comments.push(data.choices[0].delta.content)
        break
      case 'proofreading-end':
        console.info(this.chats[this.chats.length - 1].comments)
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
        ${this.chats.length > 0
          ? html`<div class="chat-container">
              ${this.chats.map(({ comments, selectionText }) => {
                return html` <div class="chat-message user-message">
                    <img
                      src="https://google-account-photo.vercel.app/api/?account_id=101722346324226588907"
                      alt="You"
                      class="avatar"
                    />
                    <p>次のテキストを校正して下さい。"${selectionText}"</p>
                  </div>
                  <div class="chat-message bot-message">
                    <img src="/img/logo-128.png" alt="Bot" class="avatar" />
                    <p>${unsafeHTML(comments.join('').replace(/\n/g, '<br>'))}</p>
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
      width: 500px;
      padding: 10px;
      border: 1px solid #ddd;
      border-radius: 5px;
      font-family: Arial, sans-serif;
    }

    .avatar {
      width: 50px;
      height: 50px;
      border-radius: 50%;
      object-fit: cover;
      margin-right: 10px;
    }

    .chat-message {
      padding: 10px;
      margin-bottom: 10px;
      display: flex;
      align-items: center;
    }

    .user-message {
      align-self: flex-start;
      background-color: #white;
      border-radius: 5px;
    }

    .bot-message {
      align-self: flex-end;
      background-color: #e0e0e0;
      border-radius: 5px;
    }
    .bot-message p {
      min-height: 50px;
      width: 100%;
      overflow: auto;
    }

    .chat-message h5 {
      margin: 0 0 5px 0;
    }

    .chat-message p {
      margin: 0;
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
