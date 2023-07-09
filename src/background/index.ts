console.info('chrome-ext template-lit-ts background script')
import { ChatCompletionRequestMessage, Configuration, OpenAIApi } from 'openai-edge'

const DEFAULT_PROOFREADING =
  'You are a professional ghostwriter.' +
  'The data sent by the user is a blog manuscript.' +
  'Clean up and output the manuscript.' +
  'Output format is Markdown.' +
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
  const { proofreading } = await chrome.storage.sync.get('proofreading')
  if (!proofreading) {
    await chrome.storage.sync.set({ proofreading: DEFAULT_PROOFREADING })
    console.log('set default proofreading')
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
  const configuration = new Configuration({
    apiKey,
  })
  const openai = new OpenAIApi(configuration)
  console.info('chrome.contextMenus.onClicked')
  if (menuItemId === 'proofreading') {
    controller = new AbortController()
    const signal = controller.signal
    console.info('chrome.contextMenus.onClicked menuItemId proofreading')
    console.info('chrome.runtime.sendMessage proofreading-start')
    if (!skipStart) {
      chrome.runtime.sendMessage({
        name: 'proofreading-start',
        selectionText: selectionText,
      })
    }
    console.info('before openai api call')
    const { proofreading } = await chrome.storage.sync.get('proofreading')
    console.log(proofreading)
    const myMessages: ChatCompletionRequestMessage[] = [
      {
        role: 'system',
        content: proofreading,
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
        max_tokens: 128,
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
    processStream(reader, decoder, selectionText || '').catch((err: any) => {
      console.error(err)
      if (signal.aborted) {
        console.log('signal.aborted.inner')
        chrome.runtime.sendMessage({
          name: 'proofreading-end',
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
            console.info('chrome.runtime.sendMessage proofreading-end')
            chrome.runtime.sendMessage({
              name: 'proofreading-end',
              selectionText,
              finishReason: finish_reason,
            })
          } else {
            console.info('chrome.runtime.sendMessage proofreading-inprogress')
            chrome.runtime.sendMessage({
              name: 'proofreading-inprogress',
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
      menuItemId: chat.type,
      selectionText: chat.selectionText,
      messages: [
        { role: 'assistant', content: chat.comments.join('') },
        { role: 'user', content: 'Continue' },
      ],
      skipStart: true,
    })
  }
})

export {}
