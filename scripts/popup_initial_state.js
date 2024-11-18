/*<link rel="stylesheet" href="styling_initial.css">*/

let input, searchQueries, firstP, button, quantity, i, profile, searchData;
let linkedinProfiles = [];
let searchQueryText = "Here are your search queries: ";
const searchApiURL = "https://www.googleapis.com/customsearch/v1?key=AIzaSyBym4BPxlNBjs9GkITW6jDhGzsvc2piu4Q&cx=4588ff0a2321a4cf4"
let defaultSpreadsheetId = ""//"1_hBN2GARLwAXdole1rOtRYDUJ2XR6jjzcViulGIKY5c"
let numberOfSearchesPerQuery = 1 // this is the default value, but it can be changed by the user

// sets up the initial state of the popup (requesting the user to input search queries)
async function setup() {
  searchQueries = []
  searchData = []
  firstP = document.getElementById("search_queries_p")
  firstP.innerHTML = searchQueryText
  i = 0;

  input = select("#userinput")
  input.changed(saveSearchQuery)

  quantity = document.getElementById("quantity")
  quantity.value = "" + numberOfSearchesPerQuery

  const button = document.getElementById("button")
  button.onclick = function() {
    numberOfSearchesPerQuery = quantity.valueAsNumber
    console.log("quant " + numberOfSearchesPerQuery)
    if (searchQueries.length > 0) {
      search()
    } else {
      alert("You haven't entered a search query! Use the first text box to enter a query, then hit enter.")
    }
  }

  const logoutButton = document.getElementById("logout")
  logoutButton.onclick = function() {chrome.runtime.sendMessage({message: "logout"})}

  spreadsheetId = select("#spreadsheet")
  chrome.storage.local.get(["spreadsheetId"]).then((result) => {
    console.log("spreadsheetId " + result.key);
    if (result.spreadsheetId != undefined) {
      defaultSpreadsheetId = result.spreadsheetId
    }
    spreadsheetId.value(defaultSpreadsheetId)
  })
}

function sourceProfiles() {
  chrome.storage.local.set({ profiles: linkedinProfiles, spreadsheetId: spreadsheetId.value(), company: "", searchData: searchData }).then(() => {
    console.log("profiles is set");
    console.log(linkedinProfiles)
    chrome.tabs.update({
      url: chrome.runtime.getURL('/scripts/popup_get_email_state.html')
    })
  });
}

function saveSearchQuery() {
  searchQueries.push(input.value())
  searchData.push({query: input.value(), results: 0})
  input.value("")
  firstP.innerHTML = searchQueryText + searchQueries.toString()
}

async function search() {
  //const url = "https://www.googleapis.com/customsearch/v1?key=AIzaSyBym4BPxlNBjs9GkITW6jDhGzsvc2piu4Q&cx=4588ff0a2321a4cf4&q=apple%20product%20manager%20linkedin"
  console.log(numberOfSearchesPerQuery)
  for (k = 0; k < numberOfSearchesPerQuery; k++) {
    firstP.innerHTML = "Searching! " + (100 * (((numberOfSearchesPerQuery  * i) + k) / (numberOfSearchesPerQuery * searchQueries.length))) + "%"
    const url = searchApiURL + "&q=" + searchQueries[i] + "&start=" + (10 * k + 1)
    //console.log(url)
    await fetch(url).then(function(response) {
      return response.json()
    }).then(processSearchResults).catch(function(err) {
      console.log('Fetch Error :-S', err);
    })
  }
  if (i < searchQueries.length - 1) {
    i++
    search()
  } else if (linkedinProfiles.length > 0) {
    //console.log(linkedinProfiles)
    sourceProfiles()
  } else {
    i = 0;
    searchQueries = []
    firstP.innerHTML = searchQueryText
    alert("No profiles found! Try another search query.")
  }
}

function processSearchResults(data) {
  console.log("searching for query" + searchQueries[i] + " with data")
  console.log(data)
  if (data.error != undefined) {//.code === 429) {
    alert("The search quota of the day was exceeded! You have to wait till past midnight to continue sourcing.")
    return;
  }
  const searchResults = data.items
  //const searchQuery = data.

  for (j = 0; j < searchResults.length; j++) {
    const result = searchResults[j]

    if (result.displayLink != "www.linkedin.com") {
      continue
    }

    const title = result.title
    const endOfNamePos = title.search("-.*-")
    if (endOfNamePos < 0) {
      continue
    }

    //console.log(title)
    const fullName = title.substring(0, endOfNamePos - 1)
    const nameElements = fullName.split(" ")
    const firstname = nameElements[0]
    for (m = 0; m < nameElements.length; m++) {
      const nameElement = nameElements[m]
      if (nameElement[nameElement.length - 1] === ",") {
         nameElement = nameElement.substring(0, nameElement.length - 1)
         m++
         break;
      }
    }
    const lastname = nameElements[m-1]
    //console.log(nameElements)

    const remainingTitle = title.substring(endOfNamePos + 2, title.length - 1)
    const endOfPositionPos = remainingTitle.search("-")
    let position
    if (endOfPositionPos >= 0) {
      position = remainingTitle.substring(0, endOfPositionPos - 1)
    } else {
      position = remainingTitle
    }

    let profile = {
      linkedinURL: result.link,
      company: "",
      position: position,
      firstname: firstname,
      lastname: lastname,
      emails: null,
      basedInBay: null,
      calAlum: null,
      query: searchQueries[i]
    }
    //console.log(profile)
    linkedinProfiles.push(profile)
    searchData[i].results++
  }
  //console.log(linkedinProfiles)
}
