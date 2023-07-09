import { html, css, LitElement } from 'lit'
import { customElement, state } from 'lit/decorators.js'

/**
 * options
 */
@customElement('crx-options')
export class Options extends LitElement {
  @state()
  apiToken = ''

  @state()
  proofreading = ''

  @state()
  activeMenu = 'userSettings'

  @state()
  avatarUrl = ''

  private _onUserSettings(event: Event) {
    event.preventDefault()
    const apiToken = (this.shadowRoot!.getElementById('apiToken') as HTMLInputElement).value
    const avatarUrl = (this.shadowRoot!.getElementById('avatarUrl') as HTMLInputElement).value
    chrome.storage.sync.set({ apiToken, avatarUrl }, () => {
      if (chrome.runtime.lastError) {
        alert('An error occurred while saving your settings.')
      } else {
        alert('Your settings have been saved successfully!')
      }
    })
  }

  private _onContextMenu(event: Event) {
    event.preventDefault()
    const proofreading = (this.shadowRoot!.getElementById('proofreading') as HTMLInputElement).value
    chrome.storage.sync.set({ proofreading }, () => {
      if (chrome.runtime.lastError) {
        alert('An error occurred while saving your settings.')
      } else {
        alert('Your settings have been saved successfully!')
      }
    })
  }

  connectedCallback() {
    super.connectedCallback()
    chrome.storage.sync
      .get(['apiToken', 'proofreading', 'avatarUrl'])
      .then(({ apiToken, proofreading, avatarUrl }) => {
        console.log({ apiToken, proofreading })
        this.apiToken = apiToken
        this.proofreading = proofreading
        this.avatarUrl = avatarUrl
      })
  }

  render() {
    return html`
      <div class="container">
        <aside class="sidebar">
          <nav>
            <button
              class="${this.activeMenu === 'contextMenu' ? 'active' : ''}"
              @click="${() => (this.activeMenu = 'contextMenu')}"
            >
              Context Menu
            </button>
            <button
              class="${this.activeMenu === 'userSettings' ? 'active' : ''}"
              @click="${() => (this.activeMenu = 'userSettings')}"
            >
              User Settings
            </button>
          </nav>
        </aside>
        <main class="content">${this.renderContent()}</main>
      </div>
    `
  }

  renderContent() {
    switch (this.activeMenu) {
      case 'contextMenu':
        return this.renderContextMenu()
      case 'userSettings':
        return this.renderUserSettings()
      default:
        return ''
    }
  }

  renderContextMenu() {
    return html`
      <h2>Context Menu</h2>
      <!-- context menu settings form goes here -->
      <form id="contextMenu" @submit="${this._onContextMenu}">
        <div class="form-group">
          <label for="proofreading">Proofreading:</label>
          <textarea id="proofreading" rows="10">${this.proofreading}</textarea>
          <p>
            Please enter the instructions you want to be proofread. The text area below represents
            the contents of
            <a
              href="https://platform.openai.com/docs/api-reference/chat/create#chat/create-messages"
              target="_blank"
              >OpenAI's Role: System messages</a
            >.
          </p>
        </div>
        <input type="submit" value="Save" class="submit-button" />
      </form>
    `
  }

  renderUserSettings() {
    return html`
      <h2>User Settings</h2>
      <form id="UserSettings" @submit="${this._onUserSettings}">
        <div class="form-group">
          <label for="apiToken">OpenAI API Token:</label>
          <input type="text" id="apiToken" placeholder="sk-" value="${this.apiToken}" />
          <p>
            If you don't have an API token, you can generate one
            <a href="https://platform.openai.com/account/api-keys" target="_blank">here</a>.
          </p>
          <label for="avatarUrl">Your Avatar Url:</label>
          <input type="text" id="avatarUrl" value="${this.avatarUrl}" />
          <p>
            Want to display your Google Account image? Please use
            <a
              href="https://google-account-photo.vercel.app/api/?account_id=YOUR_ACCOUNT_ID"
              target="_blank"
              >https://google-account-photo.vercel.app/api/?account_id=YOUR_ACCOUNT_ID</a
            >. The <code>YOUR_ACCOUNT_ID</code> can be found by accessing
            <a
              href="https://developers.google.com/people/api/rest/v1/people/get?hl=ja&apix_params=%7B%22resourceName%22%3A%22people%2Fme%22%2C%22personFields%22%3A%22photos%22%7D"
              target="_blank"
              >here</a
            >
            and executing the API. The response will contain "people/YOUR_ACCOUNT_ID", and you can
            use that as your <code>YOUR_ACCOUNT_ID</code>. For more details, please visit
            <a href="https://github.com/silverbirder/Google-Account-Photo-API" target="_blank"
              >https://github.com/silverbirder/Google-Account-Photo-API</a
            >.
          </p>
        </div>
        <input type="submit" value="Save" class="submit-button" />
      </form>
    `
  }

  static styles = css`
    :global(body) {
      min-width: 20rem;
      display: flex;
      justify-content: center;
      align-items: center;
      height: 100vh;
      margin: 0;
      padding: 0;
      background-color: #f5f5f5;
    }

    .container {
      display: grid;
      grid-template-columns: 1fr 3fr;
      gap: 1rem;
      background-color: #fff;
      padding: 1em;
      margin: 0 auto;
      max-width: 530px;
      padding-top: 4rem;
      min-height: calc(100vh - 4rem - 52px);
    }

    @media (max-width: 600px) {
      .container {
        grid-template-columns: 1fr;
      }
    }

    .sidebar {
      padding: 1em;
    }

    .content {
    }

    h2 {
      color: #31c48d;
    }

    nav {
      display: flex;
      flex-direction: column;
      align-items: start;
    }

    nav button {
      background: none;
      color: inherit;
      border: none;
      padding: 0;
      margin-bottom: 1em;
      text-decoration: underline;
      cursor: pointer;
    }

    nav button.active {
      text-decoration: none;
      border-bottom: 2px solid #31c48d;
      color: #31c48d;
    }

    .form-group {
      display: flex;
      flex-direction: column;
      align-items: start;
      margin-bottom: 1em;
    }

    .form-group label {
      margin-bottom: 0.5em;
    }

    .form-group input[type='text'] {
      padding: 0.5em;
      border: 1px solid #ccc;
      border-radius: 4px;
      width: 100%;
    }

    .form-group textarea {
      padding: 0.5em;
      border: 1px solid #ccc;
      border-radius: 4px;
      width: 100%;
    }

    .submit-button {
      padding: 0.5em 1em;
      color: #fff;
      background-color: #31c48d;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      transition: background-color 0.3s ease;
    }

    .submit-button:hover {
      background-color: #28a870;
    }
  `
}

declare global {
  interface HTMLElementTagNameMap {
    'crx-options': Options
  }
}
