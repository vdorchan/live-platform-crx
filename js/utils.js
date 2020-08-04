import {
  LIVE_LIST_PAGE,
  LIVE_SASS_HOSTNAME,
  TEST_LIVE_SASS_HOSTNAME,
  DATA_SAVE_BASE_API,
} from './constant'
import compareVersions from 'compare-versions'

let mmgsToken
let refreshTokenTimes = 0

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

export async function refreshToken() {
  if (refreshTokenTimes > 3) {
    throw new Error('refresh token too many times')
  }
  ++refreshTokenTimes
  const data = await request(
    'https://testlive.baowenonline.com/api/sl-schedule-lives/token/get'
  )
  mmgsToken = data.data
  console.log('refreshToken', mmgsToken)
}

export async function postData(url, data, headers) {
  if (!mmgsToken) {
    await refreshToken()
  }
  const res = await request(`${DATA_SAVE_BASE_API}${url}`, {
    body: JSON.stringify(data),
    method: 'POST',
    headers: {
      accountId: 350, // getUserInfo id
      sessionId: mmgsToken,
      'content-type': 'application/json',
    },
    referrer: 'no-referrer',
  })

  if (res.status === -1 && res.msg === '身份无效！') {
    await refreshToken()
    return postData(url, data, headers)
  }
  refreshTokenTimes = 0
  return res
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
    return [LIVE_SASS_HOSTNAME, TEST_LIVE_SASS_HOSTNAME, '127.0.0.1'].includes(
      new URL(url).hostname
    )
  } catch (error) {}
}

export async function checkLatestVersion() {
  const latestVersion = (
    await request('https://livedev.baowenonline.com/api/plugin/version')
  ).data
  const currentVersion = chrome.app.getDetails().version

  return compareVersions(latestVersion, currentVersion) > 0
    ? latestVersion
    : false
}

export const log = {
  info(type, ...msg) {
    console.log(`===${type}===`, ...msg)
  },
  error(type, ...msg) {
    console.log(`ERROR: ===${type}===`, ...msg)
  },
}
