import { request } from './utils'
import { LIVE_SASS_ORIGIN, DATA_SAVE_BASE_API } from './constant'
import compareVersions from 'compare-versions'

export function getLatestVersion() {
  return request(`${LIVE_SASS_ORIGIN}/api/plugin/version`)
}

export function getUserInfo() {
  return request(`${LIVE_SASS_ORIGIN}/api/user/getUserInfo?liveType=1`)
}

export function getToken(params) {
  return request(`${LIVE_SASS_ORIGIN}/api/sl-schedule-lives/token/get`)
}

export async function checkLatestVersion() {
  const latestVersion = (await getLatestVersion()).data
  const currentVersion = chrome.app.getDetails().version

  return compareVersions(latestVersion, currentVersion) > 0
    ? latestVersion
    : false
}

let mmgsToken
let refreshTokenTimes = 0
let accountId
export async function refreshToken() {
  if (refreshTokenTimes > 3) {
    throw new Error('refresh token too many times')
  }
  ++refreshTokenTimes
  const data = await getToken()
  mmgsToken = data.data
}

export async function postData(url, data, headers) {
  if (!mmgsToken) {
    await refreshToken()
  }
  if (!accountId) {
    accountId = (await getUserInfo()).data.id
  }
  const res = await request(`${DATA_SAVE_BASE_API}${url}`, {
    body: JSON.stringify(data),
    method: 'POST',
    headers: {
      accountId, // getUserInfo id
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
