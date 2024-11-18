const API_KEY = "AIzaSyDEFx6xTnwffRcQSDTq79FH7ztSBBxGkcs"
let TOKEN

//const script = document.createElement('script');
//script.onload = function () {
    //do stuff with the script
    //onGAPILoad()
//};
//script.src = "https://apis.google.com/js/client.js?onload=onGAPILoad";
//document.head.appendChild(script)

chrome.action.onClicked.addListener(async (tab) => {
  /*window.getRunningScript = () => {
    return () => {      
      return new Error().stack.match(/([^ \n])*([a-z]*:\/\/\/?)*?[a-z0-9\/\\]*\.js/ig)[0]
    }
  }
  console.log(getRunningScript()());*/
  
  const windowSettings = {left: 0, top: 0, width: 650, height: 900, type: "popup", url: chrome.runtime.getURL('/scripts/popup_initial_state.html')}
  chrome.windows.create(windowSettings)

  // chrome.runtime.getURL('/scripts/popup.html') !!!!
  // "file:///D:/University/University%20of%20California/DiversaTech/Sourcing/Chrome%20Extension/DT%20Sourcing%20Tool/scripts/popup.html"

  /*chrome.scripting.executeScript({
    target: { tabId: tab.id },
    files: ['scripts/content.js']
  });*/
});

chrome.identity.getAuthToken({interactive: true}, function(token) {
  TOKEN = token
  console.log('got the token', token);
  chrome.storage.local.set({ token: TOKEN }).then(() => {console.log("token is stored")});
})

chrome.runtime.onMessage.addListener(
  function(request, sender, sendResponse) {
    console.log(sender.tab ?
                "from a content script:" + sender.tab.url :
                "from the extension");
    if (request.message === "logout")
      logout();
    }
)

function logout() {
  chrome.identity.removeCachedAuthToken({token: TOKEN}, function(){});
}

/*
function createSheet() {
  console.log(TOKEN)
  const data = {
    //"title": "SheetsTitle"
  }
  fetch('https://sheets.googleapis.com/v4/spreadsheets', {
  method: 'POST',
  headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + TOKEN
  },
  body: JSON.stringify(data)
}).then((document) => {
  return document.json();
}).then((document) => {
  console.log("Document Created......", document);
  docId = document.documentId;
  console.log(docId);
}).catch((error) => {
  console.log("error");
})
}
*/

/*chrome.runtime.onMessage.addListener(
  function(request, sender, sendResponse) {
    console.log(sender.tab ?
                "from a content script:" + sender.tab.url :
                "from the extension");
    if (request.greeting === "hello")
      sendResponse({farewell: "goodbye"});
  }
);*/