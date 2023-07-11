console.info('chrome-ext template-lit-ts background script')
import { ChatCompletionRequestMessage, Configuration, OpenAIApi } from 'openai-edge'

const DEFAULT_PROOFREADING =
  'You are a professional ghostwriter.' +
  'The data sent by the user is a blog manuscript.' +
  'Clean up and output the manuscript.' +
  'Output format is Markdown.' +
  'Output language is Japanese.' +
  'Write the Output as concisely as possible.'

const DEFAULT_GENERATE_TITLE =
  'You are a professional ghostwriter.' +
  'The data sent by the user is a blog content.' +
  'Suggest five optimal titles from the blog content.' +
  'Output language is Japanese.' +
  'Write the Output as concisely as possible.'

const DEFAULT_GENERATE_FOLLOWING_TEXT =
  'You are a professional ghostwriter.' +
  'The data sent by the user is a blog content.' +
  'Generate text that continues from this blog content.' +
  'Output language is Japanese.' +
  'Write the Output as concisely as possible.'

const DEFAULT_AVATAR_URL = 'https://www.gravatar.com/avatar/?d=mp'

chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch((error) => console.error(error))

chrome.runtime.onInstalled.addListener(async (detail) => {
  console.info('chrome.runtime.onInstalled')
  chrome.contextMenus.create({
    id: 'proofreading',
    title: `Proofreading "%s"`,
    contexts: ['selection', 'editable'],
  })
  chrome.contextMenus.create({
    id: 'generate-title',
    title: `Generate Title "%s"`,
    contexts: ['selection', 'editable'],
  })
  chrome.contextMenus.create({
    id: 'generate-following-text',
    title: `Generate Following Text "%s"`,
    contexts: ['selection', 'editable'],
  })
  const { proofreading } = await chrome.storage.sync.get('proofreading')
  if (!proofreading) {
    await chrome.storage.sync.set({ proofreading: DEFAULT_PROOFREADING })
    console.log('set default proofreading')
  }
  const { generateTitle } = await chrome.storage.sync.get('generateTitle')
  if (!generateTitle) {
    await chrome.storage.sync.set({ generateTitle: DEFAULT_GENERATE_TITLE })
    console.log('set default generateTitle')
  }
  const { generateFollowingText } = await chrome.storage.sync.get('generateFollowingText')
  if (!generateFollowingText) {
    await chrome.storage.sync.set({ generateFollowingText: DEFAULT_GENERATE_FOLLOWING_TEXT })
    console.log('set default generateFollowingText')
  }
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
      title: 'API Token Required',
      message: 'The OpenAI API token is not set. Please set it in the extension options.',
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
      title: 'Communication Error',
      message: 'Please open the side panel and select AI Ghostwriter',
    })
    return
  }
  const configuration = new Configuration({
    apiKey,
  })
  const openai = new OpenAIApi(configuration)
  console.info('chrome.contextMenus.onClicked')
  if (['proofreading', 'generate-title', 'generate-following-text'].includes(menuItemId)) {
    controller = new AbortController()
    const signal = controller.signal
    console.info('chrome.contextMenus.onClicked menuItemId')
    console.info(`chrome.runtime.sendMessage ${menuItemId}-start`)
    if (!skipStart) {
      chrome.runtime.sendMessage({
        name: `${menuItemId}-start`,
        selectionText: selectionText,
      })
    }
    console.info('before openai api call')
    let content = ''
    if (menuItemId === 'proofreading') {
      const { proofreading } = await chrome.storage.sync.get('proofreading')
      content = proofreading
    } else if (menuItemId === 'generate-title') {
      const { generateTitle } = await chrome.storage.sync.get('generateTitle')
      content = generateTitle
    } else if (menuItemId === 'generate-following-text') {
      const { generateFollowingText } = await chrome.storage.sync.get('generateFollowingText')
      content = generateFollowingText
    }
    const myMessages: ChatCompletionRequestMessage[] = [
      {
        role: 'system',
        content: content,
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
        max_tokens: 256,
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
    processStream(reader, decoder, selectionText || '', menuItemId).catch((err: any) => {
      console.error(err)
      if (signal.aborted) {
        console.log('signal.aborted.inner')
        chrome.runtime.sendMessage({
          name: `${menuItemId}-end`,
          selectionText: selectionText,
        })
      }
    })
  }
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
            console.info(`chrome.runtime.sendMessage ${menuItemId}-end`)
            chrome.runtime.sendMessage({
              name: `${menuItemId}-end`,
              selectionText,
              finishReason: finish_reason,
            })
          } else {
            console.info(`chrome.runtime.sendMessage ${menuItemId}-inprogress`)
            chrome.runtime.sendMessage({
              name: `${menuItemId}-inprogress`,
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
      menuItemId: chat.name,
      selectionText: chat.selectionText,
      messages: [
        { role: 'assistant', content: chat.comments.join('') },
        { role: 'user', content: 'Continue' },
      ],
      skipStart: true,
    })
  }
})

chrome.notifications.onClicked.addListener(() => {
  chrome.runtime.openOptionsPage()
})

export {}
