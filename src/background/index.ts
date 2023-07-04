console.info('chrome-ext template-lit-ts background script')

chrome.runtime.onInstalled.addListener(async () => {
  chrome.contextMenus.create({
    id: 'proofreading',
    title: `文章校正 "%s"`,
    contexts: ['selection', 'editable'],
  })

  chrome.contextMenus.onClicked.addListener((info) => {
    console.log({ info })
  })
})

export {}