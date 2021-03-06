import { checkLatestVersion } from './api'
import { LIVE_SASS_API, LIVE_SASS_ORIGIN, isTest, isDev } from './constant'
const $ = (s) => document.querySelector(s)
const btnCheckUpdate = $('#J-checkUpdate')
const btnLiveSass = $('#J-liveSass')
const versionMsg = $('#J-version')

$('#update').onclick = () => {
  chrome.tabs.create({
    url: `${LIVE_SASS_API}/plugin/download`,
  })
}

async function setVersionMsg() {
  $('#version').innerHTML = `${isTest ? 'test ' : isDev ? 'dev ' : ''}version ${
    chrome.app.getDetails().version
  }`
  const latestVersion = await checkLatestVersion()
  $('#update').parentNode.style.display = latestVersion ? 'inline' : 'none'
  return latestVersion
}

setVersionMsg()

btnCheckUpdate.onclick = async () => {
  if (!(await setVersionMsg())) alert('你安装的已是最新版本')
}

btnLiveSass.onclick = () => {
  window.open(LIVE_SASS_ORIGIN)
}

const getLiveList = () =>
  chrome.runtime.sendMessage({ type: 'GET_LIVE_LIST' }, (response) => {
    console.log('GET_LIVE_LIST', { response })

    let text = '',
      text2 = ''
    if (!response.hasLogin) {
      text = '<p>中控台账号未登录</p>'
    } else if (response.isIniting) {
      text = '<p>账号正初始化列表...</p>'
      setTimeout(() => {
        getLiveList()
      }, 1000)
    } else if (response.hasInit) {
      text = `<p>账号场次数量</p><span>${response.liveList.length}</span>`
      text2 = `<p>可同步场次数量（已开播并在30天内）</p><span>${response.liveListWithData.length}</span>`
    } else {
      text = '账号未初始化'
    }

    $('#J-liveListCount').innerHTML = text
    $('#J-canSyncLiveListCount').innerHTML = text2
    $('#J-canSyncLiveListCount').previousElementSibling.style.display = text2
      ? 'flex'
      : 'none'
  })

getLiveList()

const totalProgress = $('#totalProgress')
const liveProgress = $('#liveProgress')
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.data && request.type === 'progress') {
    const { totalCompleted, total, liveInfo } = request.data
    if (!liveInfo) {
      totalProgress.innerHTML = '0'
      liveProgress.innerHTML = '无同步任务'
      return
    }

    totalProgress.innerHTML = `${totalCompleted + 1}/${total}`
    liveProgress.innerHTML = `正在同步场次：${liveInfo.title}`
  }
  sendResponse('')
})
