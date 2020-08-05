import {
  unescape,
  isLiveListPage,
  setHeader,
  sleep,
  request,
  tabs,
  notification,
  log,
  isContentPage,
} from './utils'

import { postData } from './api'
import { urls, allQueryParams, allQueryParamsObj } from './tbQuery'
import {
  LIVE_PLATFORM_HOST,
  LIVE_LIST_PAGE,
  LIVE_ACTION_API,
  LIVE_API,
  actionType,
} from './constant'

const liveSync = {
  ongoing: false,
  tabId: null,
  status: {},
  urlListState: {},
  liveList: [],
  liveListWithData: [],
  liveToGet: [],
  liveListStatus: {
    hasInit: false,
    isIniting: false,
  },
  isInitingList: false,
  fetching: {
    total: 0,
    totalCompleted: 0,
    livePercent: 0,
    liveInfo: null,
  },
  hasLogin: false,
  dataToSave: [],
  maxTimeout: 1000 * 5,

  isErrorTime(time) {
    // 仅保留近30日开播场次数据
    const curTime = new Date().getTime()
    const diffTime = curTime - time
    const isBefore = diffTime / 864e5 > 30
    const isAfter = diffTime < 0
    if (!isBefore && !isAfter) {
      return false
    }
    return isBefore ? 'isBefore' : 'isAfter'
  },

  setLiveList(liveList) {
    this.liveList = liveList || this.liveList
    this.liveListWithData = this.liveList.filter(
      (live) => !this.isErrorTime(live.startTime)
    )
  },
  isSameLive(live1, live2) {
    return ['id', 'title', 'accountId', 'startTime'].every(
      (key) => live1[key] === live2[key]
    )
  },
  async initLiveList(popup) {
    log.info(actionType.INIT_LIVE_LIST)
    let currentPage = 1
    const _liveList = this.liveList
    let hasMore = true
    let liveList = []
    while (hasMore) {
      try {
        const list = await this.getList(currentPage)
        this.hasLogin = true

        if (
          currentPage++ === 1 &&
          _liveList.length &&
          this.isSameLive(list[0], _liveList[0])
        ) {
          liveList = _liveList
          hasMore = false
        } else {
          liveList.push(...list)
          hasMore = list.length >= 20
        }
      } catch (error) {
        log.error(actionType.INIT_LIVE_LIST, error.message)
        hasMore = false
        if (error.message === 'NOT_LOGIN' && popup) {
          this.hasLogin = false
          if (
            confirm(
              '您暂未登录淘宝直播后台，请先登录后再获取数据，是否马上去登录？'
            )
          ) {
            this.createLoginTab()
          }
        }

        return false
      }
    }
    this.liveListStatus.isIniting = false
    this.liveListStatus.hasInit = true
    this.setLiveList(liveList)
    chrome.storage.local.set({ liveList: JSON.stringify(this.liveList) }, () =>
      log.info(actionType.STORE_LIVE_LIST, this.liveList)
    )

    return true
  },
  async getList(currentPage = 1) {
    this.liveListStatus.isIniting = true
    if (currentPage === 1) {
      this.liveList = []
    }
    const res = await request(
      `${LIVE_ACTION_API}?currentPage=${currentPage}&pagesize=20&api=get_live_list`
    )
    const list = res.model.data.map((live) => ({
      ...live,
      title: unescape(live.title),
    }))

    return list
  },
  getUrlKey(url) {
    return new URL(decodeURIComponent(url).replace(/\\/g, '')).searchParams
      .get('data')
      .replace(/[0-9]|\bundefined\b/g, '')
  },
  async startFetch(requestDetails) {
    const urlKey = this.getUrlKey(requestDetails.url)
    const queryParams = allQueryParamsObj[urlKey]
    if (queryParams) {
      this.urlListState[requestDetails.url] = {
        header: requestDetails.requestHeaders,
        urlKey,
      }
      try {
        const res = await request(requestDetails.url)
        if (res.ret && !res.ret.some((r) => r.includes('SUCCESS'))) {
          throw new Error(res.ret.join('；'))
        }
        if (res.data.errCode !== 0) {
          throw new Error(res.data.errMsg)
        }
        this.dataToSave.push({
          data: {
            liveId: this.fetching.liveInfo.id,
            [queryParams.toSaveDataProp]: JSON.stringify(res.data.data),
          },
          api: queryParams.toSaveApi,
        })
        this.finishSingleQuery(requestDetails)
      } catch (error) {
        this.interceptWithErr(`unable to fetch: ${error.message}`)
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
  finishSingleQuery(requestDetails) {
    const { urlKey } = this.urlListState[requestDetails.url]
    if (urlKey) {
      this.status[urlKey] = true
      this.updateLiveProgress()

      if (
        Object.keys(allQueryParamsObj).every((urlKey) => this.status[urlKey])
      ) {
        clearTimeout(this.runningTimer)
        this.finish()
      }
    }
  },
  isRequestFromBackground(details) {
    return details.tabId === -1 && !details.frameId
  },
  onBeforeSendHeaders(details) {
    if (this.ongoing && this.isQueryApi(details)) {
      if (this.isRequestFromBackground(details)) {
        try {
          const header = this.urlListState[details.url].header
          if (header) {
            details.requestHeaders = header
          }
        } catch (error) {
          log.error(actionType.BLOCK_HEADERS, error.message)
        }
      } else if (details.frameId) {
        this.startFetch(details)
        return this.getCubeId(details.url) === 'tblive_rpt_item_indicator'
          ? {}
          : { cancel: true }
      }
    } else {
      if (
        details.url.includes(LIVE_PLATFORM_HOST) &&
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
        data: `${LIVE_API}?liveId=${liveId}`,
      },
      (response) => {}
    )
  },
  createLoginTab() {
    let onUpdated = (tabId, changeInfo, tab) => {
      if (tabId === tab.id && isLiveListPage(changeInfo.url)) {
        this.hasLogin = true
        notification(
          '通知',
          '成功登陆中控台，回到豹播进行同步吧',
          async () => {}
        )

        tabs.getIndex(this.tabId).then((tabs) => {
          this.initLiveList()
          chrome.tabs.highlight({ tabs })
        })
        chrome.tabs.onUpdated.removeListener(onUpdated)
      }
    }

    chrome.tabs.create({ url: LIVE_LIST_PAGE }, () => {
      chrome.tabs.onUpdated.addListener(onUpdated)
    })
  },
  reConnectTab(tabId) {
    if (this.liveToGet.length && !this.ongoing) {
      log.info(actionType.RECONNECT_TAB)
      this.tabId = tabId
      this.notifyPage('恢复同步', '你回到了豹播，将继续上次未完成的同步')
      liveSync.continute(tabId)
    }
  },
  continute(tabId) {
    if (tabId) {
      this.tabId = tabId
    }

    this.initStatus()
    if (this.fetching.liveInfo) {
      this.run(this.fetching.liveInfo.id)
    }
  },
  async startSync(tabId, liveId) {
    log.info(actionType.START_LIVE_SYNC, {
      tabId,
      liveId,
      liveToGet: this.liveToGet,
    })
    if (this.ongoing) {
      this.notifyPage('提示', '请等待当前同步完成')
      return false
    }

    this.tabId = tabId
    if (!this.liveList.length) {
      this.notifyPage(
        '通知',
        '首次启动，请等待列表初始化，时长取决于你的列表数量'
      )
      if (!(await this.initLiveList(true))) {
        return
      }
    }

    if (liveId) {
      this.liveToGet = [liveId]
    } else if (this.liveToGet && this.liveToGet.length) {
    } else {
      this.liveToGet = this.liveListWithData.map((live) => live.id)
      if (!this.liveToGet.length) {
        return this.notifyPage('通知', '该账号下无任何直播场次')
      }
    }
    const total = this.liveToGet.length

    this.updateTotalPorgress(total)
    this.run(this.liveToGet.shift())

    this.notifyPage(
      '开始同步',
      this.liveToGet.length > 1
        ? `即将开始同步该账号近30天的直播数据，共${total}条`
        : `同步场次：${this.fetching.liveInfo.title}`
    )
  },
  initStatus() {
    this.ongoing = false
    this.status = {}
    this.urlListState = {}
    this.dataToSave = []
  },
  async run(liveId) {
    if (!this.tabId) {
      return
    }
    this.fetching.liveInfo = this.liveList.find(
      (live) => Number(live.id) === Number(liveId)
    )
    log.info(actionType.SINGLE_LIVE_SYNC, this.fetching.liveInfo)

    if (!this.fetching.liveInfo) {
      return this.syncFailed(`该账号下不存在 id 为 ${liveId} 的场次`)
    }

    if (this.fetching.liveInfo.status === 4) {
      return this.syncFailed(`该场次还未开始：${this.fetching.liveInfo.title}`)
    }

    if (this.fetching.liveInfo.status !== 1) {
      return this.syncFailed(
        `该场次状态不正确，为${this.fetching.liveInfo.status}：${this.fetching.liveInfo.title}`
      )
    }

    const errorTimeType = this.isErrorTime(this.fetching.liveInfo.startTime)
    if (errorTimeType === 'isBefore') {
      return this.syncFailed(
        `仅保留近30日开播场次数据，当前场次数据已清除：${this.fetching.liveInfo.title}`
      )
    }

    if (errorTimeType === 'isAfter') {
      return this.syncFailed(
        `当前场次还未开播：${this.fetching.liveInfo.title}`
      )
    }

    this.initStatus()
    this.ongoing = true
    this.loadIframe(liveId)
  },
  updateTotalPorgress(total) {
    if (typeof total === 'number') {
      this.fetching.total = total
    }

    this.fetching.totalCompleted = this.fetching.total - this.liveToGet.length
    this.fetching.livePercent = 0

    chrome.browserAction.setBadgeText({
      text: String(this.liveToGet.length || ''),
    })

    chrome.runtime.sendMessage({
      type: 'progress',
      data: this.fetching,
    })
  },
  updateLiveProgress() {
    const total = allQueryParams.length
    const livePercent = Object.keys(this.status).length / total
    this.fetching.livePercent = livePercent

    chrome.runtime.sendMessage({
      type: 'progress',
      data: this.fetching,
    })

    log.info(actionType.LIVE_PROGRESS, livePercent)
  },
  syncFailed(msg) {
    notification('同步失败', msg)
    this.initStatus()
    this.updateTotalPorgress()
  },
  notifyPage(title, message) {
    chrome.tabs.sendMessage(
      this.tabId,
      {
        type: 'FROM_LIVE_ASSISTANT_NOTIFICATION',
        data: { title, message },
      },
      (response) => {}
    )
  },
  async finish() {
    try {
      await this.save()

      if (this.liveToGet.length) {
        setTimeout(() => {
          this.run(this.liveToGet.shift())
        }, 3000)
      } else {
        this.initStatus()
      }
    } catch (error) {
      this.interceptWithErr(`save failed: ${error.message}`)
    }

    this.updateTotalPorgress()
    this.notifyPage(
      `已同步 ${this.fetching.totalCompleted}/${this.fetching.total}`,
      `场次同步完成：${this.fetching.liveInfo.title}`
    )
  },
  pause(msg = '你退出了豹播，同步将会在下次进入豹播后继续') {
    log.info(actionType.SYNC_PAUSED, msg)
    notification('同步中断', `${msg}`)
    this.initStatus()
    if (this.fetching.liveInfo) {
      this.liveToGet.unshift(this.fetching.liveInfo.id)
    }
  },
  interceptWithErr(err) {
    this.liveToGet = []
    this.updateTotalPorgress(0)
    this.initStatus()
    notification('同步发生了错误', `${err}`)
  },
  async save() {
    const liveData = {
      viewCount: this.fetching.liveInfo.extendsMap.totalPV,
      liveId: this.fetching.liveInfo.id,
      expired: false,
      descInfo: '',
      praiseCount: 0,
      joinCount: 0,
      totalJoinCount: 0,
      totalViewCount: 0,
      ...(({
        accountId,
        appointmentTime,
        approval,
        bizCode,
        coverImg,
        coverImg169,
        coverImg916,
        endTime,
        liveChannelId,
        liveColumnId,
        location,
        nativeFeedDetailUrl,
        publishSource,
        startTime,
        title,
        type,
        userNick,
      }) => ({
        accountId,
        appointmentTime,
        approval,
        bizCode,
        coverImg,
        coverImg169,
        coverImg916,
        endTime,
        liveChannelId,
        liveColumnId,
        location,
        nativeFeedDetailUrl,
        publishSource,
        startTime,
        title,
        type,
        userNick,
      }))(this.fetching.liveInfo),
    }

    log.info(actionType.SAVE_DATA, this.dataToSave, liveData)
    const res = await postData('tbMonitorLiveProfile/save', liveData)

    for (const key in this.dataToSave) {
      const { api, data } = this.dataToSave[key]
      const res = await postData(api, data)
      if (res.status !== 0) {
        throw new Error(res.msg)
      }
    }
  },
  logout() {},
}

export default liveSync
