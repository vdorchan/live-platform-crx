const $ = (s) =>
  /^#\S+/.test(s)
    ? document.getElementById(s.replace(/^#/, ''))
    : document.querySelector(s)
const btnCheckUpdate = $('#J-checkUpdate')
const btnLiveSass = $('#J-liveSass')

btnLiveSass.onclick = () => {
  window.open('https://live.baowenonline.com')
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
    $('#J-canSyncLiveListCount').previousElementSibling.style.display = text2 ? 'block' : 'none'
  })

getLiveList()

/* const totalProgress = $('#J-totalProgress')
const liveTitle = $('#J-liveTitle')
const livePercent = $('#J-livePercent')

const domUpdateFn = {
  totalProgress(fetching) {
    totalProgress.innerHtml = `${fetching.totalCompleted}/${fetching.total}`
  },
  liveInfo(fetching) {
    liveTitle.innerText = fetching.liveInfo.title
  },
  livePercent(fetching) {
    livePercent.innerText = Math.ceil(fetching.livePercent * 100)
  },
}

const fetching = new Proxy(
  {},
  {
    set: function (obj, prop, value) {
      if (obj[prop] === value) {
        return true
      }
      onFetchUpdate(prop, value)
      obj[prop] = value
      return true
    },
    get: function (target, prop, receiver) {
      return 'world'
    },
  }
)

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('popup received progress', request)
  if (request.type === 'progress') {
    Object.entries(request.data).forEach(
      (entries) => (fetching[entries[0]] = entries[1])
    )
  }
  sendResponse('')
})

function onFetchUpdate(prop, value) {
  if (['total', 'totalComplete'].includes(prop)) {
    domUpdateFn.totalProgress(fetching)
  } else {
    const updateFn = domUpdateFn[prop]
    updateFn && updateFn()
  }
  console.log('onFetchUpdate', prop, value)
} */
