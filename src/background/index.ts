console.info('chrome-ext template-lit-ts background script')
import { ChatCompletionRequestMessage, Configuration, OpenAIApi } from 'openai-edge'

const DEFAULT_PROOFREADING =
  'You are a professional ghostwriter.\n' +
  'The data sent by the user is a blog manuscript.\n' +
  'Clean up and output the manuscript.\n' +
  'Output format is Markdown.\n' +
  'Output language is Japanese.\n' +
  'Write the Output as concisely as possible.'

const DEFAULT_GENERATE_TITLE =
  'You are a professional ghostwriter.\n' +
  'The data sent by the user is a blog content.\n' +
  'Suggest five optimal titles from the blog content.\n' +
  'Output language is Japanese.\n' +
  'Write the Output as concisely as possible.'

const DEFAULT_GENERATE_FOLLOWING_TEXT =
  'You are a professional ghostwriter.\n' +
  'The data sent by the user is a blog content.\n' +
  'Generate text that continues from this blog content.\n' +
  'Output language is Japanese.\n' +
  'Write the Output as concisely as possible.'

const DEFAULT_AVATAR_URL = 'https://www.gravatar.com/avatar/?d=mp'

chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch((error) => console.error(error))

const generateUUID = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    var r = (Math.random() * 16) | 0,
      v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

chrome.runtime.onInstalled.addListener(async (detail) => {
  console.info('chrome.runtime.onInstalled')
  let { contextMenus } = await chrome.storage.sync.get('contextMenus')
  console.log(contextMenus)
  if (!contextMenus || contextMenus.length === 0) {
    const defaultContextMenus = [
      {
        id: generateUUID(),
        name: chrome.i18n.getMessage('proofreading'),
        content: DEFAULT_PROOFREADING,
      },
      {
        id: generateUUID(),
        name: chrome.i18n.getMessage('generate_title'),
        content: DEFAULT_GENERATE_TITLE,
      },
      {
        id: generateUUID(),
        name: chrome.i18n.getMessage('generate_following_text'),
        content: DEFAULT_GENERATE_FOLLOWING_TEXT,
      },
    ]
    await chrome.storage.sync.set({
      contextMenus: defaultContextMenus,
    })
    console.log('set default contextMenus')
    contextMenus = defaultContextMenus
  }
  contextMenus.forEach((contextMenu: { name: string; id: string }) => {
    chrome.contextMenus.create({
      id: contextMenu.id,
      title: `${contextMenu.name} "%s"`,
      contexts: ['selection', 'editable'],
    })
  })
  const { avatarUrl } = await chrome.storage.sync.get('avatarUrl')
  if (!avatarUrl) {
    await chrome.storage.sync.set({ avatarUrl: DEFAULT_AVATAR_URL })
    console.log('set default avatar url')
  }
  if (detail.reason === 'install') {
    chrome.tabs.create({ url: 'options.html' })
  }
})

let controller: AbortController | undefined
chrome.contextMenus.onClicked.addListener(async (info) => {
  onContextMenusClick({
    menuItemId: info.menuItemId.toString(),
    selectionText: info.selectionText || '',
  })
})

const onContextMenusClick = async ({
  menuItemId,
  selectionText,
  messages = [],
  skipStart = false,
}: {
  menuItemId: string
  selectionText: string
  messages?: ChatCompletionRequestMessage[]
  skipStart?: boolean
}) => {
  const { apiToken: apiKey } = await chrome.storage.sync.get('apiToken')
  if (!apiKey) {
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'img/logo-128.png',
      title: chrome.i18n.getMessage('notification_api_token_required_title'),
      message: chrome.i18n.getMessage('notification_api_token_required_message'),
    })
    return
  }

  try {
    await chrome.runtime.sendMessage({
      name: `smoke`,
    })
  } catch {
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'img/logo-128.png',
      title: chrome.i18n.getMessage('notification_communication_error_title'),
      message: chrome.i18n.getMessage('notification_communication_error_message'),
    })
    return
  }
  const configuration = new Configuration({
    apiKey,
  })
  const openai = new OpenAIApi(configuration)
  console.info('chrome.contextMenus.onClicked')

  controller = new AbortController()
  const signal = controller.signal
  console.info('chrome.contextMenus.onClicked menuItemId')
  console.info(`chrome.runtime.sendMessage start`)
  const { contextMenus } = await chrome.storage.sync.get('contextMenus')
  const contextMenu = contextMenus.find(
    (contextMenu: { id: string }) => contextMenu.id === menuItemId,
  )
  console.log({ contextMenus, contextMenu, menuItemId })
  if (!skipStart) {
    chrome.runtime.sendMessage({
      name: `start`,
      id: contextMenu.id,
      selectionText: selectionText,
      contextMenuName: contextMenu.name,
    })
  }
  console.info('before openai api call')
  const myMessages: ChatCompletionRequestMessage[] = [
    {
      role: 'system',
      content: contextMenu.content,
    },
    { role: 'user', content: selectionText },
    ...messages,
  ]
  console.log('messages')
  console.log(myMessages)
  const completion = await openai.createChatCompletion(
    {
      model: 'gpt-4',
      messages: myMessages,
      temperature: 0,
      stream: true,
      max_tokens: 12,
    },
    {
      signal,
    },
  )
  console.info('after openai api call')
  if (!completion.body) return
  if (completion.status !== 200) {
    throw new Error('Request failed')
  }
  const reader: ReadableStreamReader<Uint8Array> = completion.body?.getReader()
  const decoder: TextDecoder = new TextDecoder('utf-8')
  processStream(reader, decoder, selectionText || '', contextMenu.id).catch((err: any) => {
    console.error(err)
    if (signal.aborted) {
      chrome.runtime.sendMessage({
        name: `end`,
        selectionText: selectionText,
      })
    }
  })
}

async function processStream(
  reader: ReadableStreamReader<Uint8Array>,
  decoder: TextDecoder,
  selectionText: string,
  menuItemId: string,
): Promise<void> {
  while (true) {
    // @ts-ignore
    const result: ReadableStreamReadResult<Uint8Array> = await reader.read()
    if (result.done) {
      console.log('Stream finished.')
      reader.releaseLock()
      break
    }
    const text = decoder.decode(result.value, { stream: true })
    const lines = text.split('\n\n')
    for (const line of lines) {
      const splitText = line.split('data: ')
      if (splitText.length > 1) {
        try {
          const json = JSON.parse(splitText[1])
          console.log('api json is', { json })
          const finish_reason = json.choices[0].finish_reason
          if (finish_reason === 'stop' || finish_reason === 'length') {
            console.info(`chrome.runtime.sendMessage end`)
            chrome.runtime.sendMessage({
              name: `end`,
              id: menuItemId,
              selectionText,
              finishReason: finish_reason,
            })
          } else {
            console.info(`chrome.runtime.sendMessage inprogress`)
            chrome.runtime.sendMessage({
              name: `inprogress`,
              id: menuItemId,
              data: json.choices[0].delta.content,
              selectionText,
            })
          }
        } catch (error) {}
      }
    }
  }
}

chrome.runtime.onMessage.addListener((request) => {
  console.info('chrome.runtime.onMessage')
  console.log(request)
  if (request.stop) {
    controller?.abort()
  }
  if (request.continue) {
    const chat = request.chat
    console.log(chat)
    onContextMenusClick({
      menuItemId: chat.id,
      selectionText: chat.selectionText,
      messages: [
        { role: 'assistant', content: chat.comments.join('') },
        { role: 'user', content: chrome.i18n.getMessage('openai_message_user_continue') },
      ],
      skipStart: true,
    })
  }
})

chrome.notifications.onClicked.addListener(() => {
  chrome.runtime.openOptionsPage()
})

export {}
