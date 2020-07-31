'use strict'

import liveSync from './liveSync'

console.log(liveSync)

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log(
    sender.tab
      ? 'from a content script:' + sender.tab.url
      : 'from the extension',
    request,
    sender
  )

  if (request.type === 'GET_ALL_LIVE' || request.type === 'GET_SINGLE_LIVE') {
    liveSync.startSync(sender.tab.id, request.data)
  }

  sendResponse('')
})
