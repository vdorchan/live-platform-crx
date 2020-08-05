console.log('this message is from contentScript')

const crxId = document.createElement('div')
crxId.id = 'crxLiveAssisant'
document.body.appendChild(crxId)

let iframe

window.addEventListener('message', (event) => {
  try {
    const type = event.data.type.match(/^LIVE_ASSISTANT_(\S+)/)[1]
    const { data } = event.data
    if (type) {
      chrome.runtime.sendMessage({ type, data }, (response) => {
        console.log('received crx message in contentScript', response)
        window.postMessage(response)
      })
    }
  } catch (error) {}
})

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log(
    sender.tab
      ? 'from a content script:' + sender.tab.url
      : 'from the extension',
    request,
    sender
  )
  try {
    const type = request.type.match(/^FROM_LIVE_ASSISTANT_(\S+)/)[1]
    if (type === 'LOAD_IFRAME') {
      if (!iframe) {
        iframe = document.createElement('iframe')
        iframe.style.width = '0'
        iframe.style.height = '0'
        document.body.appendChild(iframe)
      }
      iframe.src = request.data
    } else if (type === 'NOTIFICATION') {
      window.postMessage({ type: request.type, data: request.data })
    }
  } catch (error) {}

  sendResponse('response from content script')
})
