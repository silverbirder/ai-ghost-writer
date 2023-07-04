console.info('chrome-ext template-lit-ts background script')
import { Configuration, OpenAIApi } from 'openai-edge'

const configuration = new Configuration({
  apiKey: 'sk-',
})
const openai = new OpenAIApi(configuration)

chrome.runtime.onInstalled.addListener(async () => {
  chrome.contextMenus.create({
    id: 'proofreading',
    title: `文章校正 "%s"`,
    contexts: ['selection', 'editable'],
  })
  chrome.contextMenus.onClicked.addListener(async (info) => {
    if (info.menuItemId === 'proofreading') {
      const completion = await openai.createChatCompletion({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content:
              'You are a professional ghostwriter.' +
              'The data sent by the user is a blog manuscript.' +
              'Please clean up the manuscript and output the cleaned up manuscript.' +
              'The format is Markdown.',
          },
          { role: 'user', content: info.selectionText },
        ],
        stream: true,
      })
      if (!completion.body) return
      const reader: ReadableStreamReader<Uint8Array> = completion.body?.getReader()
      const decoder: TextDecoder = new TextDecoder('utf-8')
      processStream(reader, decoder).catch((err: any) => console.error(err))
    }
  })
})

async function processStream(
  reader: ReadableStreamReader<Uint8Array>,
  decoder: TextDecoder,
): Promise<void> {
  while (true) {
    // @ts-ignore
    const result: ReadableStreamReadResult<Uint8Array> = await reader.read()
    if (result.done) {
      console.log('Stream finished.')
      break
    }
    const text = decoder.decode(result.value)
    const splitText = text.split('data: ')
    if (splitText.length > 1) {
      try {
        const json = JSON.parse(splitText[1])
        chrome.runtime.sendMessage({
          name: 'proofreading',
          data: json,
        })
      } catch (error) {}
    }
  }
}

export {}
