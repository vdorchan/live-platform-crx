export const LIVE_PLATFORM_HOST = 'liveplatform.taobao.com'
export const LIVE_LIST_PAGE = `https://${LIVE_PLATFORM_HOST}/live/liveList.htm`
export const LIVE_ACTION_API = `https://${LIVE_PLATFORM_HOST}/live/action.do`
export const LIVE_API = 'https://databot.taobao.com/tb/tblive'
export const LIVE_SASS_HOSTNAME = 'https://live.baowenonline.com'
export const TEST_LIVE_SASS_HOSTNAME = 'https://testlive.baowenonline.com'
export const DATA_SAVE_BASE_API =
  'http://molitest-tbtest23.willbe.net.cn/tblive/'

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
}

export { urls, allQueryParams, allQueryParamsObj } from './tbUrls'

/* console.log(
  urls.map((url) => ({
    param: new URL(decodeURIComponent(url).replace(/\\/g, '')).searchParams.get(
      'data'
    ),
  }))
) */
