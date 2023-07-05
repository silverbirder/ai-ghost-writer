console.info('chrome-ext template-lit-ts background script')
import { Configuration, OpenAIApi } from 'openai-edge'

chrome.runtime.onInstalled.addListener(async () => {
  chrome.contextMenus.create({
    id: 'proofreading',
    title: `文章校正 "%s"`,
    contexts: ['selection', 'editable'],
  })
  const { apiToken: apiKey } = await chrome.storage.sync.get('apiToken')
  const configuration = new Configuration({
    apiKey,
  })
  const openai = new OpenAIApi(configuration)
  chrome.contextMenus.onClicked.addListener(async (info) => {
    if (info.menuItemId === 'proofreading') {
      chrome.runtime.sendMessage({
        name: 'proofreading-start',
      })
      const completion = await openai.createChatCompletion({
        model: 'gpt-4',
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
        temperature: 0,
        stream: true,
      })
      if (!completion.body) return
      if (completion.status !== 200) {
        throw new Error('Request failed')
      }
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
      reader.releaseLock()
      break
    }
    const text = decoder.decode(result.value, { stream: true })
    const splitText = text.split('data: ')
    if (splitText.length > 1) {
      try {
        const json = JSON.parse(splitText[1])
        if (json.choices[0].delta.finish_reason === 'stop') {
          chrome.runtime.sendMessage({
            name: 'proofreading-end',
          })
        } else {
          chrome.runtime.sendMessage({
            name: 'proofreading-inprogress',
            data: json,
          })
        }
      } catch (error) {}
    }
  }
}

export {}
