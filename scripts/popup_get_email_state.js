let profile, linkedinProfiles, i, searchData;
let company, positionP, position, firstname, lastname, emailElts, alum, button, lastP, linkedinTabId, spreadsheetId;
let windowId = undefined;
let linkedinWindowOpened = false
const API_KEY = "AIzaSyDEFx6xTnwffRcQSDTq79FH7ztSBBxGkcs"
let TOKEN

// sets up the initial state of the popup (requesting the user to input search queries)
function setup() {
  company = select("#company")
  positionP = document.getElementById("positionP")
  position = select("#position")
  firstname = select("#firstname")
  lastname = select("#lastname")
  emailElts = []
  emailElts.push(select("#email1"))
  emailElts.push(select("#email2"))
  emailElts.push(select("#email3"))
  emailElts.push(select("#email4"))
  alum = select("#alum")
  lastP = document.getElementById("lastP")
  button = document.getElementById("button")
  button.onclick = function() {saveAndNextProfile()}
  skip = document.getElementById("skip")
  skip.onclick = function() {
    if (i < linkedinProfiles.length) {
      sourcing()
    }
  }
  infoP = document.getElementById("infoP")

  i = 0;
  chrome.storage.local.get(["profiles", "spreadsheetId", "token", "searchData"]).then((result) => {
    console.log("got result")
    console.log(result);
    linkedinProfiles = result.profiles
    spreadsheetId = result.spreadsheetId
    TOKEN = result.token
    setupInfoP(result.searchData)
    sourcing();
  })
}

function sourcing() {
  profile = linkedinProfiles[i]

  company.value("")
  positionP.innerHTML = "Position"
  position.value(profile.position)
  firstname.value(profile.firstname)
  lastname.value(profile.lastname)
  for (j = 0; j < emailElts.length; j++) {
    emailElts[j].value("")
  }
  alum.value("")
  lastP.innerHTML = 'This is profile ' + (i + 1) + ', found for the query "' + profile.query + '", out of ' + linkedinProfiles.length + ' total profiles found.'

  console.log(windowId)
  if (windowId != undefined) {
    console.log("new tab")
    /*chrome.tabs.update(linkedinTabId, {
      url: profile.linkedinURL
    }).then(readyToInject)*/
    const windowSettings = {index: 0, windowId: windowId, url: profile.linkedinURL}
    chrome.tabs.create(windowSettings).then(readyToInject).catch((error) => {
      console.log("Could not find the window!");
      windowId = undefined
      sourcing()
    })
  } else {
    console.log("create window")
    const windowSettings = {top: 0, left: 700, url: profile.linkedinURL}
    chrome.windows.create(windowSettings, (window) => {readyToInject(window.tabs[0])})
  }
}

function saveAndNextProfile() {
  profile.company = company.value()
  profile.position = position.value()
  profile.firstname = firstname.value()
  profile.lastname = lastname.value()
  profile.calAlum = alum.value()
  profile.emails = []
  for (j = 0; j < emailElts.length; j++) {
    const email = emailElts[j].value()
    if (email != "") {
      profile.emails.push(email)
    }
  }
  console.log(profile)
  storeProfileToSheet(profile)
  chrome.storage.local.set({ company: profile.company })
  if (i < linkedinProfiles.length) {
    sourcing()
  } else {

  }
}

async function storeProfileToSheet(profile) {
  const token = "" + TOKEN; // Please set your access token.
  const spreadsheetID = "" + spreadsheetId; // Please set your spreadsheet ID.
  const sheetId = 0; // Please set your sheet ID.

  let profileData =  [
    { userEnteredValue: { stringValue: "DT Sourcing Tool" } },
    { userEnteredValue: { stringValue: profile.company } },
    { userEnteredValue: { stringValue: profile.position } },
    { userEnteredValue: { stringValue: profile.firstname } },
    { userEnteredValue: { stringValue: profile.lastname } },
    { userEnteredValue: { stringValue: profile.calAlum } },
    { userEnteredValue: { stringValue: profile.linkedinURL } }
  ]
  for (j = 0; j < profile.emails.length; j++) {
    profileData.push({ userEnteredValue: { stringValue: profile.emails[j] } })
  }

  const firstEmptyRowIndex = await getFirstEmptyRow(spreadsheetID, sheetId)
  console.log("row " + firstEmptyRowIndex)

  const data = {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer " + TOKEN
    },
    body: JSON.stringify({
      requests: [{
        "updateCells": {
          "start": {
            "sheetId": sheetId,
            "rowIndex": firstEmptyRowIndex,
            "columnIndex": 0
          },
          "rows": [{
            "values": profileData,
          }],
          fields: "*"
        }
      }]
    })
  };
  fetch("https://sheets.googleapis.com/v4/spreadsheets/" + spreadsheetID + ":batchUpdate", data);
}

async function getFirstEmptyRow(spreadsheetID, sheetId) {
  console.log("getFirstEmpty")
  const token = "" + TOKEN;
  
  const requestData = {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer " + TOKEN
    },
    body: JSON.stringify({
      requests: [{
        findReplace: {
          "find": "DT Sourcing Tool",
          "replacement": "DT Sourcing Tool",
          "matchCase": false,
          "matchEntireCell": false,
          "searchByRegex": false,
          "includeFormulas": true,
          "range": {
            "sheetId": sheetId,
            "startRowIndex": 0,
            "startColumnIndex": 0,
            "endColumnIndex": 1
          }
        }
      }],
    })
  };
  return await fetch("https://sheets.googleapis.com/v4/spreadsheets/" + spreadsheetID + ":batchUpdate", requestData).then((response) => {
    return response.json()
  }).then((response) => {
    console.log(response)
    console.log(response.replies[0])
    console.log(response.replies[0].findReplace.rowsChanged)
    return response.replies[0].findReplace.rowsChanged
  })
  //return i-1
}

function readyToInject(tab) {
  console.log("injecting to " + tab.id)
  scriptToInject = {
    target: { tabId: tab.id },
    files: [ "scripts/content.js" ]
  }
  chrome.scripting.executeScript(scriptToInject).then(injectedScript);
}

function injectedScript() {
  i++
}


chrome.runtime.onMessage.addListener(receiveProfileData);

function receiveProfileData(request, sender, sendResponse) {
  console.log(sender)
  linkedinTabId = sender.tab.id
  windowId = sender.tab.windowId

  const emails = request.emails
  profile.emails = emails
  for (j = 0; j < emails.length && j < emailElts.length; j++) {
    emailElts[j].value(emails[j])
  }

  profile.company = request.company
  company.value(request.company)

  const basedInBay = request.basedInBay
  profile.basedInBay = basedInBay
  if (basedInBay) {
    positionP.innerHTML = "Position - Based in the Bay!"
  } else {
    positionP.innerHTML = "Position"
  }

  const calAlum = request.calAlum
  profile.calAlum = calAlum
  if (calAlum) {
    alum.value("Go bears!")
  } else {
    alum.value("")
  }
}

function setupInfoP(searchData) {
  pText = ""
  for (j = 0; j < searchData.length; j++) {
    pText += searchData[j].results + ' results for query "' + searchData[j].query + '"; '
  }
  infoP.innerHTML = pText;
}

/*function successfulStore(profile) {
  const token = "" + TOKEN; // Please set your access token.
  const spreadsheetID = "" + spreadsheetId; // Please set your spreadsheet ID.
  const sheetId = "0"; // Please set your sheet ID.

  const data = {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer " + TOKEN
    },
    body: JSON.stringify({
      requests: [{
        repeatCell: {
          range: {
            startColumnIndex: 0,
            endColumnIndex: 1,
            startRowIndex: 0,
            endRowIndex: 1,
            sheetId: sheetId
          },
          cell: { userEnteredValue: { numberValue: 10 } },
          fields: "*"
        }
      }]
    })
  };
  fetch("https://sheets.googleapis.com/v4/spreadsheets/" + spreadsheetID + ":batchUpdate", data);
}

function store(profile) {
    fetch("https://sheets.googleapis.com/v4/spreadsheets/" + spreadsheetId + "/batchUpdate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        //update this token with yours. 
        Authorization: "Bearer " + TOKEN
      },
      body: JSON.stringify({
        requests: [{
          repeatCell: {
            range: {
              startColumnIndex: 0,
              endColumnIndex: 1,
              startRowIndex: 0,
              endRowIndex: 1,
              sheetId: spreadsheetId
            },
            cell: {
              userEnteredValue: {
                "numberValue": 10
              },
            },
            fields: "*"
          }
        }]
      })
    }).catch((error) => {
      console.log("error");
  })
}

function store2(profile) {
  console.log(TOKEN)
  console.log(spreadsheetId)
  const range = "R1C1:R2C2"
  const url = "https://sheets.googleapis.com/v4/spreadsheets" + "/" + spreadsheetId + "/values/" + range
  const data = {
    //"title": "SheetsTitle"
    /*requests: [{
      repeatCell: {
        range: {
          startColumnIndex: 0,
          endColumnIndex: 1,
          startRowIndex: 0,
          endRowIndex: 1,
          sheetId: 0
        },
        cell: {
          userEnteredValue: {
            "numberValue": 10
          },
        },
        fields: "*"
      }
    }]* /
  }
  fetch(url, {
  method: 'POST',
  headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer " + TOKEN
  },
  body: JSON.stringify(data)
}).then((result) => {
  return result.json();
}).then((result) => {
  console.log("Values retrieved", result);
}).catch((error) => {
  console.log("error");
})
}*/

//chrome.runtime.onMessage.addListener(receivedMessage);

/*function receivedMessage(request, sender, sendResponse) {
  console.log(request)
  if (request.message === "profiles") {
    sourcing(request)
  } else if (request.message === "profile_data") {
    receiveEmails(request)
  }
}*/