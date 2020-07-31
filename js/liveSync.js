import {
  unescape,
  isLiveListPage,
  setHeader,
  sleep,
  fetchTaobao,
  tabs,
} from './utils'

import { urls, allQueryParams, allQueryParamsObj, LIVE_LIST_PAGE, LIVE_ACTION_API, LIVE_API } from './constant'

const liveSync = {
  ongoing: false,
  fetchingLiveInfo: null,
  completed: false,
  tabId: null,
  status: {},
  urlListState: {},
  liveList: [],
  liveToGet: [],
  isOverTime(time) {
    // 仅保留近30日开播场次数据
    return (new Date().getTime() - time) / 864e5 >= 30
  },
  async getList(currentPage = 1) {
    if (currentPage === 1) {
      this.liveList = []
    }
    const res = await fetchTaobao(
      `${LIVE_ACTION_API}?currentPage=${currentPage}&pagesize=20&api=get_live_list`
    )
    const list = res.model.data.map((live) => ({
      ...live,
      title: unescape(live.title),
    }))
    this.liveList.push(...list)
    if (list.length >= 20) {
      await this.getList(++currentPage)
    } else {
      chrome.storage.local.set(
        { liveList: JSON.stringify(this.liveList) },
        () => console.log('store live list', this.liveList)
      )
    }
  },
  getUrlKey(url) {
    return new URL(decodeURIComponent(url).replace(/\\/g, '')).searchParams
      .get('data')
      .replace(/[0-9undefined]/g, '')
  },
  async startFetch(requestDetails) {
    const urlKey = this.getUrlKey(requestDetails.url)
    if (allQueryParamsObj[urlKey]) {
      this.urlListState[requestDetails.url] = {
        header: requestDetails.requestHeaders,
        urlKey,
      }
      try {
        const res = await fetchTaobao(requestDetails.url)
        if (res.ret && !res.ret.some((r) => r.includes('SUCCESS'))) {
          throw new Error(res.ret.join('；'))
        }
        if (res.data.errCode !== 0) {
          throw new Error(res.data.errMsg)
        }
        this.fnishSingleQuery(requestDetails)
      } catch (error) {
        this.interceptWithErr(error.message)
      }
    }
  },
  isQueryApi(requestDetails) {
    return (
      requestDetails.method === 'GET' &&
      requestDetails.url.includes('mtop.alibaba.iic.xinsightshop.olap.query')
    )
  },
  getCubeId(url) {
    const live = allQueryParams.find(({ cubeId }) => url.includes(cubeId))
    return live ? live.cubeId : ''
  },
  fnishSingleQuery(requestDetails) {
    const { urlKey } = this.urlListState[requestDetails.url]
    if (urlKey) {
      this.status[urlKey] = true

      if (
        Object.keys(allQueryParamsObj).every((urlKey) => this.status[urlKey])
      ) {
        this.finish()
      }
    }
  },
  isRequestFromBackground(details) {
    return details.tabId === -1 && !details.frameId
  },
  onBeforeSendHeaders(details) {
    if (this.isQueryApi(details)) {
      if (this.isRequestFromBackground(details)) {
        try {
          const header = this.urlListState[details.url].header
          if (header) {
            details.requestHeaders = header
          }
        } catch (error) {
          console.log('error header')
        }
      } else if (details.frameId) {
        this.startFetch(details)
        return this.getCubeId(details.url) === 'tblive_rpt_item_indicator'
          ? {}
          : { cancel: true }
      }
    } else {
      if (
        details.url.includes('LIVE.taobao.com') &&
        this.isRequestFromBackground(details)
      ) {
        setHeader(details.requestHeaders, {
          name: 'referer',
          value: LIVE_LIST_PAGE,
        })
      }
    }

    return { requestHeaders: details.requestHeaders }
  },
  loadIframe(liveId) {
    chrome.tabs.sendMessage(
      this.tabId,
      {
        type: 'FROM_LIVE_ASSISTANT_LOAD_IFRAME',
        data: `${LIVE_API}?spm=a1z9u.8142865.0.0.7e7434edpErHmP&liveId=${liveId}`,
      },
      (response) => {
        console.log(response)
      }
    )
  },
  notification(title, message, onClick) {
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
  },
  getAllLive(tabId) {
    this.liveToGet = this.liveList
      .filter((live) => live.status === 1 || this.isOverTime(live.startTime))
      .map((live) => live.id)
    this.run(this.liveToGet.shift())
  },
  createLoginTab() {
    let onUpdated = (tabId, changeInfo, tab) => {
      if (tabId === tab.id && isLiveListPage(changeInfo.url)) {
        this.notification(
          '通知',
          '成功登陆中控台，回到豹播进行同步吧',
          async () => {
            chrome.tabs.highlight({ tabs: await tabs.getIndex(this.tabId) })
          }
        )
        chrome.tabs.onUpdated.removeListener(onUpdated)
      }
    }

    chrome.tabs.create({ url: LIVE_LIST_PAGE }, () => {
      chrome.tabs.onUpdated.addListener(onUpdated)
    })
  },
  async startSync(tabId, liveId) {
    if (this.ongoing) {
      this.notification('提示', '请等待当前同步完成')
      return false
    }

    this.tabId = tabId
    if (!this.liveList.length) {
      this.notification('通知', '首次启动，请等待列表初始化')
      try {
        await this.getList()
      } catch (error) {
        console.log(error);
        if (error.message === 'NOT_LOGIN') {
          if (confirm('未登录中控台，是否马上去登录？')) {
            this.createLoginTab()
          }
        }
        return
      }
    }

    if (liveId) {
      this.liveToGet = [liveId]
    } else {
      this.liveToGet = this.liveList
        .filter((live) => live.status === 1 && !this.isOverTime(live.startTime))
        .map((live) => live.id)
      this.notification(
        '通知',
        `即将开始同步该账号近30天的直播数据，共${this.liveToGet.length}条`
      )
    }

    chrome.browserAction.setBadgeText({
      text: String(this.liveToGet ? this.liveToGet.length : 1),
    })
    this.run(this.liveToGet.shift())
  },
  initStatus() {
    this.ongoing = false
    this.status = {}
    this.urlListState = {}
  },
  async run(liveId) {
    this.fetchingLiveInfo = this.liveList.find(
      (live) => Number(live.id) === Number(liveId)
    )
    console.log('run', this.fetchingLiveInfo)

    if (!this.fetchingLiveInfo) {
      return this.notification(
        '同步失败',
        `该账号下未找 id 为 ${liveId} 的场次`
      )
    }

    if (this.fetchingLiveInfo.status === 4) {
      return this.notification(
        '同步失败',
        `该场次还未开始：${this.fetchingLiveInfo.title}`
      )
    }

    if (this.fetchingLiveInfo.status !== 1) {
      return this.notification(
        '同步失败',
        `该场次状态不正确，为${this.fetchingLiveInfo.status}：${this.fetchingLiveInfo.title}`
      )
    }

    if (this.isOverTime(this.fetchingLiveInfo.startTime)) {
      return this.notification(
        '同步失败',
        `仅保留近30日开播场次数据，当前场次数据已清除：${this.fetchingLiveInfo.title}`
      )
    }

    this.notification('同步中', `当前同步场次： ${this.fetchingLiveInfo.title}`)
    this.initStatus()
    this.ongoing = true
    this.loadIframe(liveId)
  },
  async finish() {
    this.notification('同步结束', `已同步 ${this.fetchingLiveInfo.title}`)
    this.initStatus()

    chrome.browserAction.setBadgeText({
      text: String((this.liveToGet ? this.liveToGet.length : '') || ''),
    })

    if (this.liveToGet.length) {
      await sleep(3000)
      this.run(this.liveToGet.shift())
    }
  },
  interceptWithErr(err) {
    this.initStatus()
    this.notification(
      '同步中断，请记录下列报错并暂停同步',
      `同步发生了一些问题：${err}`
    )
  },
}

chrome.webRequest.onBeforeSendHeaders.addListener(
  liveSync.onBeforeSendHeaders.bind(liveSync),
  { urls: ['https://*/*', 'http://*/*'] }, // filters
  ['blocking', 'requestHeaders', 'extraHeaders'] // extraInfoSpec
)

chrome.storage.local.get(['liveList'], function (result) {
  console.log('get live list from store', result)
  try {
    liveSync.liveList = JSON.parse(result.liveList)
  } catch (error) {
    liveSync.liveList = []
  }
})

export default liveSync
