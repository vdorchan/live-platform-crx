'use strict'

import liveSync from './liveSync'
import { notification, isContentPage, log } from './utils'
import { actionType, LIVE_SASS_ORIGIN } from './constant'

chrome.browserAction.setBadgeText({ text: '' })

console.log(liveSync)
const manifest = chrome.app.getDetails()

// inject content script into tabs with matching URLs after install
function injectContentScriptIntoTab(tabId) {
  try {
    var scripts = manifest.content_scripts[0].js
    scripts.forEach((script) =>
      chrome.tabs.executeScript(tabId, {
        file: script,
      })
    )
  } catch (error) {}
}

chrome.windows.getAll({ populate: true }, (windows) => {
  windows.forEach((window) =>
    window.tabs.forEach(
      (tab) =>
        tab.url.includes(LIVE_SASS_ORIGIN) && injectContentScriptIntoTab(tab.id)
    )
  )
})

chrome.webRequest.onBeforeSendHeaders.addListener(
  liveSync.onBeforeSendHeaders.bind(liveSync),
  { urls: ['*://*.taobao.com/*'] }, // filters
  ['blocking', 'requestHeaders', 'extraHeaders'] // extraInfoSpec
)

chrome.storage.local.get(['liveList'], function (result) {
  log.info(actionType.GET_LIVE_LIST_FROM_STORE, result)
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

// tab removed during syncing
chrome.tabs.onRemoved.addListener((tabId, removeInfo) => {
  log.info(actionType.SYNC_TAB_REMOVED, tabId, removeInfo)
  if (liveSync.tabId === tabId && liveSync.ongoing) {
    liveSync.tabId = null
    liveSync.pause()
    const onUpdated = (tabId, changeInfo, tab) => {
      if (changeInfo.status === 'complete' && isContentPage(tab.url)) {
        liveSync.reConnectTab(tabId)
        chrome.tabs.onUpdated.removeListener(onUpdated)
      }
    }

    chrome.tabs.onUpdated.addListener(onUpdated)
  }
})

let hasLoadFavicon = false

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (tabId === liveSync.tabId) {
    if (changeInfo.url && !isContentPage(changeInfo.url)) {
      liveSync.tabId = null
      return liveSync.pause()
    }

    if (isContentPage(tab.url)) {
      if (!hasLoadFavicon && changeInfo.favIconUrl) {
        hasLoadFavicon = true
      }
      if (hasLoadFavicon && changeInfo.status === 'complete') {
        hasLoadFavicon = false
        liveSync.continute()
      }
    }
  }
})
