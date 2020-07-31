import { LIVE_LIST_PAGE } from './constant'

export function isLiveListPage(url) {
  return new RegExp(`^${LIVE_LIST_PAGE}`).test(url)
}

export function unescape(html) {
  const map = {
    '&amp;': '&',
    '&apos;': "'",
    '&gt;': '>',
    '&lt;': '<',
    '&quot;': '"',
  }
  const reg = RegExp('(' + Object.keys(map).join('|') + ')', 'g')
  return html.replace(reg, function (match) {
    return map[match]
  })
}

export function setHeader(headers, header) {
  let hasSet = false
  for (var i = 0; i < headers.length; i++) {
    if (headers[i].name.toLowerCase() == name) {
      hasSet = true
      headers.splice(i, 1, header)
      break
    }
  }
  if (!hasSet) {
    headers.push(header)
  }
}

export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export async function fetchTaobao(url) {
  const response = await fetch(url, {
    referrerPolicy: 'no-referrer-when-downgrade',
    body: null,
    method: 'GET',
    mode: 'cors',
    credentials: 'include',
  })

  if (/^https:\/\/login.taobao.com\/member\/login\.jhtml/.test(response.url)) {
    throw new Error('NOT_LOGIN')
  }

  if (response.status === 200) {
    return response.json()
  } else {
    throw new Error(response)
  }
}

export const tabs = {
  getIndex(tabId) {
    return new Promise((resolve) =>
      chrome.tabs.query({}, (tabs) =>
        resolve(tabs.findIndex((tab) => tab.id === tabId))
      )
    )
  },
}
