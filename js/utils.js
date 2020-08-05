import {
  LIVE_LIST_PAGE,
  LIVE_SASS_ORIGIN,
  DATA_SAVE_BASE_API,
} from './constant'

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

export async function request(url, options) {
  const response = await fetch(url, {
    referrerPolicy: 'no-referrer-when-downgrade',
    body: null,
    method: 'GET',
    mode: 'cors',
    credentials: 'include',
    ...options,
  })

  if (/^https:\/\/login.taobao.com\/member\/login\.jhtml/.test(response.url)) {
    throw new Error('NOT_LOGIN')
  }

  if (response.status === 200) {
    return response.json()
  } else {
    throw new Error(`response error: ${response.status}`)
  }
}

export async function fetchTaobao(url) {
  return request(url)
}

export const tabs = {
  getIndex(tabId) {
    return new Promise((resolve) =>
      chrome.tabs.query({}, (tabs) =>
        resolve(tabs.findIndex((tab) => tab.id === tabId))
      )
    )
  },

  focusOrCreateTab(url) {
    chrome.windows.getAll({ populate: true }, function (windows) {
      var existing_tab = null
      for (var i in windows) {
        var tabs = windows[i].tabs
        for (var j in tabs) {
          var tab = tabs[j]
          if (tab.url == url) {
            existing_tab = tab
            break
          }
        }
      }
      if (existing_tab) {
        chrome.tabs.update(existing_tab.id, { selected: true })
      } else {
        chrome.tabs.create({ url: url, selected: true })
      }
    })
  },
}

export function notification(title, message, onClick) {
  chrome.notifications.create(
    '',
    {
      iconUrl: '../images/icon128.png',
      type: 'basic',
      title,
      message,
    },
    (notificationId) => {
      if (typeof onClick === 'function') {
        let cb = (_notificationId) => {
          notificationId === _notificationId && onClick()
          chrome.notifications.onClicked.removeListener(cb)
        }
        chrome.notifications.onClicked.addListener(cb)
      }
    }
  )
}

export function isContentPage(url = '') {
  try {
    return [LIVE_SASS_ORIGIN, '127.0.0.1'].includes(new URL(url).origin)
  } catch (error) {}
}

export const log = {
  info(type, ...msg) {
    console.log(`===${type}===`, ...msg)
  },
  error(type, ...msg) {
    console.log(`ERROR: ===${type}===`, ...msg)
  },
}
