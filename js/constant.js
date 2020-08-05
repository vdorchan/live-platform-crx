export const env = process.env.NODE_ENV
export const isProd = process.env.NODE_ENV === 'production'
export const isTest = process.env.NODE_ENV === 'test'
export const isDev = process.env.NODE_ENV === 'dev'

export const LIVE_PLATFORM_HOST = 'liveplatform.taobao.com'
export const LIVE_LIST_PAGE = `https://${LIVE_PLATFORM_HOST}/live/liveList.htm`
export const LIVE_ACTION_API = `https://${LIVE_PLATFORM_HOST}/live/action.do`
export const LIVE_API = 'https://databot.taobao.com/tb/tblive'

export const LIVE_SASS_ORIGIN = isProd
  ? 'https://live.baowenonline.com'
  : isTest
  ? 'https://testlive.baowenonline.com'
  : 'http://localhost.baowenonline.com:8081'

export const LIVE_SASS_API = `${LIVE_SASS_ORIGIN}/api`

export const DATA_SAVE_BASE_API = isProd
  ? 'http://9292032322300.molimediagroup.com/tblive'
  : isTest
  ? 'http://molitest-tbtest23.willbe.net.cn/tblive/'
  : 'http://molitest-tbtest23.willbe.net.cn/tblive/'

export const actionType = {
  FETCH_DATA_FROM_TB: 'FETCH_DATA_FROM_TB',
  SAVE_DATA: 'SAVE_DATA',
  INIT_LIVE_LIST: 'INIT_LIVE_LIST',
  STORE_LIVE_LIST: 'STORE_LIVE_LIST',
  GET_LIVE_LIST_FROM_STORE: 'GET_LIVE_LIST_FROM_STORE',
  BLOCK_HEADERS: 'BLOCK_HEADERS',
  START_LIVE_SYNC: 'START_LIVE_SYNC',
  SINGLE_LIVE_SYNC: 'SINGLE_LIVE_SYNC',
  LIVE_PROGRESS: 'LIVE_PROGRESS',
  SYNC_TAB_REMOVED: 'SYNC_TAB_REMOVED',
  RECONNECT_TAB: 'RECONNECT_TAB',
  SYNC_PAUSED: 'SYNC_PAUSED',
}
