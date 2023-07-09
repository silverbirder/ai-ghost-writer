console.info('chrome-ext template-lit-ts background script')
import { Configuration, OpenAIApi } from 'openai-edge'

const DEFAULT_PROOFREADING =
  'You are a professional ghostwriter.' +
  'The data sent by the user is a blog manuscript.' +
  'Clean up and output the manuscript.' +
  'Output format is Markdown.' +
  'Output language is Japanese.' +
  'Write the Output as concisely as possible.'

chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch((error) => console.error(error))

chrome.runtime.onInstalled.addListener(async () => {
  console.info('chrome.runtime.onInstalled')
  chrome.contextMenus.create({
    id: 'proofreading',
    title: `Proofreading "%s"`,
    contexts: ['selection', 'editable'],
  })
  const { proofreading } = await chrome.storage.sync.get('proofreading')
  console.log(proofreading)
  if (!proofreading) {
    await chrome.storage.sync.set({ proofreading: DEFAULT_PROOFREADING })
    console.log('set default proofreading')
  }
})

let controller: AbortController | undefined
chrome.contextMenus.onClicked.addListener(async (info) => {
  const { apiToken: apiKey } = await chrome.storage.sync.get('apiToken')
  const configuration = new Configuration({
    apiKey,
  })
  const openai = new OpenAIApi(configuration)
  console.info('chrome.contextMenus.onClicked')
  if (info.menuItemId === 'proofreading') {
    controller = new AbortController()
    const signal = controller.signal
    console.info('chrome.contextMenus.onClicked menuItemId proofreading')
    console.info('chrome.runtime.sendMessage proofreading-start')
    chrome.runtime.sendMessage({
      name: 'proofreading-start',
      selectionText: info.selectionText,
    })
    console.info('before openai api call')
    const { proofreading } = await chrome.storage.sync.get('proofreading')
    console.log(proofreading)
    try {
      const completion = await openai.createChatCompletion(
        {
          model: 'gpt-4',
          messages: [
            {
              role: 'system',
              content: proofreading,
            },
            { role: 'user', content: info.selectionText },
          ],
          temperature: 0,
          stream: true,
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
      processStream(reader, decoder, info.selectionText || '').catch((err: any) => {
        console.error(err)
        if (signal.aborted) {
          console.log('signal.aborted.inner')
          chrome.runtime.sendMessage({
            name: 'proofreading-end',
            selectionText: info.selectionText,
            data: 'signal.aborted.inner',
          })
        }
      })
    } catch (error) {
      if (signal.aborted) {
        console.log('signal.aborted')
        chrome.runtime.sendMessage({
          name: 'proofreading-end',
          selectionText: info.selectionText,
          data: 'signal.aborted',
        })
      }
    }
  }
})

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
          if (json.choices[0].delta.finish_reason === 'stop') {
            console.info('chrome.runtime.sendMessage proofreading-end')
            chrome.runtime.sendMessage({
              name: 'proofreading-end',
              data: 'END',
              selectionText,
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
  if (request.stop) {
    controller?.abort()
  }
})

export {}
