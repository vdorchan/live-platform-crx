'use strict'

import liveSync from './liveSync'
import { notification, isContentPage } from './utils'

chrome.browserAction.setBadgeText({
  text: '',
})

console.log(liveSync)

chrome.webRequest.onBeforeSendHeaders.addListener(
  liveSync.onBeforeSendHeaders.bind(liveSync),
  { urls: ['*://*.taobao.com/*'] }, // filters
  ['blocking', 'requestHeaders', 'extraHeaders'] // extraInfoSpec
)

chrome.storage.local.get(['liveList'], function (result) {
  console.log('get live list from store', result)
  try {
    const liveList = JSON.parse(result.liveList)
    liveSync.setLiveList(liveList)
    liveSync.liveListStatus.hasInit = !!liveList.length
  } catch (error) {
    liveSync.liveList = []
  }

  liveSync.initLiveList()
})

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log(
    sender.tab
      ? 'from a content script:' + sender.tab.url
      : 'from the extension',
    request,
    sender
  )
  let res = ''

  if (request.type === 'GET_ALL_LIVE' || request.type === 'GET_SINGLE_LIVE') {
    liveSync.startSync(sender.tab.id, request.data)
  }

  if (request.type === 'GET_LIVE_LIST') {
    res = {
      hasLogin: liveSync.hasLogin,
      liveListWithData: liveSync.liveListWithData,
      liveList: liveSync.liveList,
      hasInit: liveSync.liveListStatus.hasInit,
      isIniting: liveSync.liveListStatus.isIniting,
    }
  }

  sendResponse(res)
})

chrome.tabs.onRemoved.addListener((tabId, removeInfo) => {
  // tab removed during syncing
  console.log(liveSync.tabId, tabId, removeInfo)
  if (liveSync.tabId === tabId && liveSync.ongoing) {
    liveSync.pause('你退出了豹播，同步将会在下次进入豹播后继续')
  }
})

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && isContentPage(tab.url)) {
    liveSync.reConnectTab(tabId)
  }
})
