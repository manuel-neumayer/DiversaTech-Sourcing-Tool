//console.log("Helloooo")
//window.onload = function() {run()}
document.onkeydown = findWebContents
addEventListener('click', (event) => {console.log("Mouse clicked!")});
//chrome.runtime.onMessage.addListener(test);
//document.addEventListener("DOMContentLoaded", run);
//document.addEventListener('readystatechange', (event) => {console.log("Hiiiii new state") });

/*function test(request, sender, sendResponse) {
  console.log("got the message!")
}*/

/*async function run() {
  console.log('The DOM is loaded');

  //let body = document.getElementById("app-body")
  //console.log(body)
  // ... logic that needs DOM
}*/

function findWebContents() {
  // find company
  /* We first search the linkedin.com website this js file is injected into (and it really should be a linkedin profile page with a contactOut widget open)
  for the company the profile is working at. The reason to first search for the company is that we can later distinguish between work and personal emails. */
  let company = ""
  // getElementsByTagName("span") allows us to retrieve essentially all text elements on the profile page; hopefully, one of them includes the company
  
  /*

  The below code allows to find the name of the company, but it is only semi-reliable. For now, I decided to comment it out.
  
  let spans = document.body.getElementsByTagName("span")
  //console.log(spans)
  for (let span of spans) {
    const spanText = span.innerText
    //console.log(spanText)
    // the trick is that in 50% of cases, the experience of the profile that is displayed at the top has the text "{Comapny} · Full-time" under it.
    const positionPos = spanText.search(" · Full-time")
    if (positionPos >= 0) {
      //console.log(spanText)
      //console.log(positionPos)
      company = spanText.substring(0, positionPos)
      break;
    }
  }

  */

  if (company === "") {
    // if we couldn't find the profile's company with that trick, we simply use the same company as the last profile we stored (in most cases it will be the same company, and otherwise the user has to mnually change it)
    chrome.storage.local.get(["company"]).then((result) => {
      console.log("retrieved company from storage")
      console.log(result);
      company = result.company
      // since getting something from local storage takes time and is asynchronous, we need to use a callback function
      continueFinding(company)
    })
  } else {
    continueFinding(company)
  }
}

function continueFinding(company) {
  console.log("Company:")
  console.log(company)

  // find emails
  let emails = []
  // the contactOut widget lives in one of the iframes, so we have to retrieve those and find the right one
  let iframes = document.body.getElementsByTagName("iframe")
  //console.log(iframes)
  for (i = 0; i < iframes.length; i++) {
    //console.log(iframes[i])
    //console.log(iframes[i].allow)
    // turns out that the property "allow" distinguishes the contactOut iframe almost always
    if (iframes[i].allow === "clipboard-read *; clipboard-write *") {
      //console.log(iframes[i].contentWindow.document.getElementById("root"))
      let spans = iframes[i].contentWindow.document.getElementsByTagName("span")
      //console.log(spans)
      // now we simply search through all spans again
      for (let span of spans) {
        const spanText = span.innerText
        console.log(spanText)
        if (spanText.search("@") >= 0) {
          //console.log(span.parentElement)
          //console.log(span.parentElement.nextElementSibling)
          //console.log(span.parentElement.nextElementSibling.data-tip)
          try {
            /* this code is to determine wheather the emails has been verified by contactOut.
            If so, span.parentElement.nextElementSibling.attributes exists (otherwise, an error will be thrown), and one of the attributes contains the string "Verified" */
            const attributes = span.parentElement.nextElementSibling.attributes
            //console.log(attributes)
            for (k = 0; k < attributes.length; k++) {
              //console.log(attributes[k])
              let foundCompanyEmail = false
              if (attributes[k].nodeValue.search("Verified") >= 0) {
                //console.log("This is a verified email!")
                if (spanText.search(company.toLowerCase()) >= 0) {
                  // if it is a work email, we give it higher priority, i.e., put it at the beginning of the emails array
                  emails.unshift(spanText)
                  foundCompanyEmail = true
                } else if (spanText.search("gmail") >= 0 && !foundCompanyEmail) {
                  // if we haven't found a work email yet, we give gmail-adresses higher priority, i.e., put them at the beginning of the emails array
                  emails.unshift(spanText)
                } else {
                  emails.push(spanText)
                }
                break;
              }
            }
          } catch {
            console.log("I guess this is not a verified email!")
          }
        }
      }
    }
  }
  console.log(emails)

  // determine whether based in bay area
  let basedInBay = false
  let calAlum = false
  let spans = document.body.getElementsByTagName("span")
  //console.log(spans)
  for (let span of spans) {
    const spanText = span.innerText
    //console.log(spanText)
    // the trick is that in 50% of cases, the experience of the profile that is displayed at the top has the text "{Comapny} · Full-time" under it.
    for (k = 0; k < bay_area_locations.length; k++) {
      const location = bay_area_locations[k]
      const positionPos = spanText.search(location)
      if (positionPos >= 0) {
        console.log(spanText)
        //console.log(positionPos)
        basedInBay = true
        break;
      }
    }
    for (k = 0; k < alum_phrases.length; k++) {
      const phrase = alum_phrases[k]
      const positionPos = spanText.search(phrase)
      if (positionPos >= 0) {
        console.log(spanText)
        //console.log(positionPos)
        calAlum = true
        break;
      }
    }
    if (basedInBay && calAlum) {
      break;
    }
  }

  chrome.runtime.sendMessage({message: "profile_data", emails: emails, company: company, basedInBay: basedInBay, calAlum: calAlum})
}

const bay_area_locations = ["Bay Area", "bay area", "Bay area",  "San Francisco",  "San Jose",  "Oakland",  "Palo Alto",  "Mountain View",  "Sunnyvale",  "Redwood City",  "San Mateo",  "Fremont",  "Santa Clara",  "Dublin",  "San Ramon",  "Hayward",  "Concord",  "Santa Rosa",  "Livermore",  "Milpitas",  "Menlo Park",  "Walnut Creek",  "Pleasanton",  "San Rafael",  "San Bruno",  "San Leandro",  "Burlingame",  "South San Francisco",  "Danville",  "Petaluma",  "Orinda",  "Los Gatos",  "Woodside"]

const alum_phrases = ["University of California, Berkeley", "Haas"]

/*let input, searchQueries, searchQueriesP, button, i;
let linkedinProfiles = [];
let searchQueryText = "Here are your search queries: ";
const searchApiURL = "https://www.googleapis.com/customsearch/v1?key=AIzaSyBym4BPxlNBjs9GkITW6jDhGzsvc2piu4Q&cx=4588ff0a2321a4cf4&q=salesforce product manager linkedin"

function setup() {
  createCanvas(400, 600);

  searchQueries = []
  searchQueriesP = document.getElementById("search_queries_p")
  searchQueriesP.innerHTML = searchQueryText
  i = 0;

  input = select("#userinput")
  input.changed(saveSearchQuery)
  
}

function sourceProfiles() {
  console.log(linkedinProfiles)
  console.log(linkedinProfiles[0].linkedinURL)
  const windowSettings = {tabId: "sourcing"} //{tabId: "sourcing", url: linkedinProfiles[0].linkedinURL}
  chrome.windows.create(windowSettings)
}

function saveSearchQuery() {
  searchQueries.push(input.value())
  input.value("")
  searchQueriesP.innerHTML = searchQueryText + searchQueries.toString()
}

function search() {
  const url = "https://www.googleapis.com/customsearch/v1?key=AIzaSyBym4BPxlNBjs9GkITW6jDhGzsvc2piu4Q&cx=4588ff0a2321a4cf4&q=apple%20product%20manager%20linkedin"
  //const url = searchApiURL + searchQueries[i]
  i++
  fetch(url).then(function(response) {
    return response.json()
  }).then(processSearchResults).catch(function(err) {
    console.log('Fetch Error :-S', err);
  })
}

function processSearchResults(data) {
  console.log(data)
  const searchResults = data.items

  for (i = 0; i < searchResults.length; i++) {
    const result = searchResults[i]

    if (result.displayLink != "www.linkedin.com") {
      continue
    }

    const title = result.title
    const endOfNamePos = title.search("-.*-")
    if (endOfNamePos < 0) {
      continue
    }

    console.log(title)
    const fullName = title.substring(0, endOfNamePos - 1)
    const nameElements = fullName.split(" ")
    console.log(nameElements)
    let profile = {linkedinURL: result.link, firstname: nameElements[0], lastname: nameElements[nameElements.length-1]}
    linkedinProfiles.push(profile)
  }
  if (i < searchQueries.length) {
    search()
  } else {
    sourceProfiles()
  }
}*/
