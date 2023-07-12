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
  contextMenus: { id: string; name: string; content: string }[] = []

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
        alert(chrome.i18n.getMessage('alert_last_error'))
      } else {
        alert(chrome.i18n.getMessage('alert_success'))
      }
    })
  }

  private _onContextMenu(event: Event) {
    event.preventDefault()
    this.contextMenus.forEach((menu, index) => {
      menu.name = (this.shadowRoot!.getElementById(`name${index}`) as HTMLInputElement).value
      menu.content = (this.shadowRoot!.getElementById(`content${index}`) as HTMLInputElement).value
    })
    chrome.storage.sync.set({ contextMenus: this.contextMenus }, () => {
      if (chrome.runtime.lastError) {
        alert(chrome.i18n.getMessage('alert_last_error'))
      } else {
        alert(chrome.i18n.getMessage('alert_success'))
        chrome.contextMenus.removeAll()
        this.contextMenus.forEach((contextMenu) => {
          chrome.contextMenus.create({
            id: contextMenu.id,
            title: `${contextMenu.name} "%s"`,
            contexts: ['selection', 'editable'],
          })
        })
      }
    })
  }

  generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      var r = (Math.random() * 16) | 0,
        v = c === 'x' ? r : (r & 0x3) | 0x8
      return v.toString(16)
    })
  }

  addMenu() {
    this.contextMenus.push({
      id: this.generateUUID(),
      name: chrome.i18n.getMessage('context_new_menu'),
      content: '',
    })
    this.requestUpdate()
  }

  deleteMenu(id: string) {
    this.contextMenus = this.contextMenus.filter((menu) => menu.id !== id)
  }

  connectedCallback() {
    super.connectedCallback()
    chrome.storage.sync
      .get(['apiToken', 'contextMenus', 'avatarUrl'])
      .then(({ apiToken, contextMenus, avatarUrl }) => {
        console.log({ apiToken, contextMenus })
        this.apiToken = apiToken
        this.contextMenus = contextMenus
        this.avatarUrl = avatarUrl
      })
  }

  render() {
    return html`
      <div class="container">
        <aside class="sidebar">
          <nav>
            <button
              class="${this.activeMenu === 'userSettings' ? 'active' : ''}"
              @click="${() => (this.activeMenu = 'userSettings')}"
            >
              ${chrome.i18n.getMessage('user_settings')}
            </button>
            <button
              class="${this.activeMenu === 'contextMenu' ? 'active' : ''}"
              @click="${() => (this.activeMenu = 'contextMenu')}"
            >
              ${chrome.i18n.getMessage('context_menu')}
            </button>
            <button
              class="${this.activeMenu === 'shortcuts' ? 'active' : ''}"
              @click="${() => (this.activeMenu = 'shortcuts')}"
            >
              ${chrome.i18n.getMessage('shortcuts')}
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
      case 'shortcuts':
        return this.renderShortcuts()
      default:
        return ''
    }
  }

  renderContextMenu() {
    return html`
      <h2>${chrome.i18n.getMessage('context_menu')}</h2>
      <p>
        ${chrome.i18n.getMessage('content_please_enter')}
        <a
          href="https://platform.openai.com/docs/api-reference/chat/create#chat/create-messages"
          target="_blank"
          >${chrome.i18n.getMessage('content_in_the_messages')}</a
        >.
      </p>
      <form id="contextMenu" @submit="${this._onContextMenu}">
        ${this.contextMenus.map(
          (menu, index) => html`
            <div class="form-group">
              <div class="menu-header">
                <h3>${chrome.i18n.getMessage('menu')} No.${index + 1}</h3>
                <button
                  type="button"
                  class="delete-menu-button"
                  @click="${() => this.deleteMenu(menu.id)}"
                >
                  &#10006; ${chrome.i18n.getMessage('delete_menu')}
                </button>
              </div>
              <label for="name${index}">${chrome.i18n.getMessage('menu_name')}</label>
              <input type="text" id="name${index}" value="${menu.name}" />
              <label for="content${index}">${chrome.i18n.getMessage('content')}</label>
              <textarea id="content${index}" rows="10">${menu.content}</textarea>
            </div>
          `,
        )}
        <div class="button-group">
          <button type="button" class="add-menu-button" @click="${this.addMenu}">
            <span class="plus-icon">&#43;</span> ${chrome.i18n.getMessage('add_menu')}
          </button>
          <input
            type="submit"
            value="${chrome.i18n.getMessage('save')}"
            class="submit-button"
            ?disabled="${this.contextMenus.length === 0}"
          />
        </div>
      </form>
    `
  }

  renderUserSettings() {
    return html`
      <h2>${chrome.i18n.getMessage('user_settings')}</h2>
      <form id="UserSettings" @submit="${this._onUserSettings}">
        <div class="form-group">
          <h3>OpenAI API Token</h3>
          <input type="text" id="apiToken" placeholder="sk-" value="${this.apiToken}" />
          ${!this.apiToken
            ? html`<p class="warning">${chrome.i18n.getMessage('api_token_is_required')}</p>`
            : null}
          <p>
            ${chrome.i18n.getMessage('if_you_dont_have_api_token')}
            <a href="https://platform.openai.com/account/api-keys" target="_blank"
              >${chrome.i18n.getMessage('here')}</a
            >.
          </p>
          <h3>${chrome.i18n.getMessage('your_avatar_url')}</h3>
          <input type="text" id="avatarUrl" value="${this.avatarUrl}" />
          <p>
            ${chrome.i18n.getMessage('want_to_display')}
            <a
              href="https://google-account-photo.vercel.app/api/?account_id=YOUR_ACCOUNT_ID"
              target="_blank"
              >https://google-account-photo.vercel.app/api/?account_id=YOUR_ACCOUNT_ID</a
            >. ${chrome.i18n.getMessage('the_your_account_id')}
            <a
              href="https://developers.google.com/people/api/rest/v1/people/get?hl=ja&apix_params=%7B%22resourceName%22%3A%22people%2Fme%22%2C%22personFields%22%3A%22photos%22%7D"
              target="_blank"
              >${chrome.i18n.getMessage('here')}</a
            >
            ${chrome.i18n.getMessage('and_executing_the_api')}
            <a href="https://github.com/silverbirder/Google-Account-Photo-API" target="_blank"
              >https://github.com/silverbirder/Google-Account-Photo-API</a
            >.
          </p>
        </div>
        <input type="submit" value="${chrome.i18n.getMessage('save')}" class="submit-button" />
      </form>
    `
  }

  renderShortcuts() {
    return html`
      <h2>${chrome.i18n.getMessage('shortcuts')}</h2>
      <form>
        <div class="form-group">
          <p>${chrome.i18n.getMessage('shortcut_view_or_change')}</p>
          <code>chrome://extensions/shortcuts</code>
          <p>${chrome.i18n.getMessage('shortcut_very_convenient')}</p>
        </div>
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
      padding: 1em;
      margin: 0 auto;
      padding-top: 4rem;
      min-height: calc(100vh - 4rem - 52px);
      max-width: 650px;
    }

    @media (max-width: 650px) {
      .container {
        grid-template-columns: 1fr;
      }
    }

    .sidebar {
      padding: 1em;
    }

    h2,
    h3 {
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
      position: relative;
    }

    .form-group label {
      margin-bottom: 0.5em;
    }

    .form-group input[type='text'] {
      padding: 0.5em;
      border: 1px solid #ccc;
      border-radius: 4px;
      width: 93%;
    }

    .form-group textarea {
      padding: 0.5em;
      border: 1px solid #ccc;
      border-radius: 4px;
      width: 93%;
    }

    input[type='submit']:disabled {
      background-color: #ccc;
      cursor: not-allowed;
    }

    .submit-button {
      padding: 0.5em 1em;
      color: #fff;
      background-color: #31c48d;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      transition: background-color 0.3s ease;    }

    .submit-button:hover {
      background-color: #28a870;
    }

    .add-menu-button {
      padding: 0.5em 1em;
      color: #fff;
      background-color: #31c48d;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      transition: background-color 0.3s ease;
    }

    .plus-icon {
      margin-right: 0.5em;
    }

    .add-menu-button:hover {
      background-color: #28a870;
    }

    .button-group {
      display: flex;
      justify-content: space-between;
      width: 98%;
    }

    .menu-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .delete-menu-button {
      border: none;
      color: #ffffff;
      background-color: #dc3545;
      padding: 5px 10px;
      font-size: 0.8rem;
      border-radius: 5px;
      cursor: pointer;
      text-decoration: none;
      position: absolute;
      right: 10px;
    }

    .delete-menu-button:hover {
      background-color: #c82333;
    }

    .warning {
      color: red;
    }
  `
}

declare global {
  interface HTMLElementTagNameMap {
    'crx-options': Options
  }
}
