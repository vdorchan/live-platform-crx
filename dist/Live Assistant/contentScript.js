!function(e){"function"==typeof define&&define.amd?define(e):e()}((function(){"use strict";console.log("this message is from contentScript");const e=document.createElement("div");let t;e.id="crxLiveAssisant",document.body.appendChild(e),window.addEventListener("message",e=>{try{const t=e.data.type.match(/^LIVEPLATFORM_ASSISTANT_(\S+)/)[1],{data:n}=e.data;t&&chrome.runtime.sendMessage({type:t,data:n},e=>{console.log("received crx message in contentScript",e),window.postMessage(e)})}catch(e){}}),chrome.runtime.onMessage.addListener((e,n,o)=>{console.log(n.tab?"from a content script:"+n.tab.url:"from the extension",e,n);try{"LOAD_IFRAME"===e.type.match(/^FROM_LIVEPLATFORM_ASSISTANT_(\S+)/)[1]&&(t||(t=document.createElement("iframe"),t.style.width="0",t.style.height="0",document.body.appendChild(t)),t.src=e.data)}catch(e){}o("response from content script")})}));