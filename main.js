const LOAD_UT_SCHED_MSG = "Click to load UT semester schedule. Re-open this once you are logged in.";
const ADD_TO_CAL_MSG = "Add schedule to Google Calendar";
const INVALID_INPUT = "Please enter a name, a start date, and an end date.";
const SCHED_URL = "https://utdirect.utexas.edu/registration/classlist.WBX";

let tabId;

window.onload = function () {
    // Register request handlers
    chrome.runtime.onMessage.addListener(
        function(request, _, sendResponse) {
            switch (request.contentScriptQuery) {
                case "createNewCal":
                    createNewCal(request.token, request.calName, id => sendResponse(id));
                    return true;
                case "addEventToCalendar":
                    addEventToCalendar(request.id, request.event, request.token);
                    return true;
                default:
                    return false;
            }
        }
    );

    // State based on current tabs
    chrome.tabs.query({'url': SCHED_URL + "*"}, function (tabs) {
        let btn = document.getElementById("btn");
        let inputFields = document.getElementById("in");

        if (tabs.length === 0) {
            // If no schedule tab exists, open one
            btn.textContent = LOAD_UT_SCHED_MSG;
            btn.onclick = function () {
                chrome.tabs.create({'url': SCHED_URL});
            };
        } else if (!tabs[0].active) {
            // Tab is not highlighted, button click will highlight it
            btn.textContent = LOAD_UT_SCHED_MSG;
            btn.onclick = function () {
                chrome.tabs.update(tabs[0].id, {highlighted: true});
            };
        } else {
            // Ready to process schedule
            tabId = tabs[0].id;
            btn.textContent = ADD_TO_CAL_MSG;
            btn.onclick = execScript;
            inputFields.style.display = "inherit";
        }
    });
};

// Execute script
function execScript() {
    // Authenticate to get the token we need for Google Calendar
    chrome.identity.getAuthToken({'interactive': true}, function (token) {
        if (token != null) {
            let name = document.getElementById("cal").value;
            let start = document.getElementById("start").value;
            let end = document.getElementById("end").value;
            if (name == null || name === '' ||
                start == null || start === '' ||
                end == null || end === '') {
                alert(INVALID_INPUT);
                return;
            }
            // Format message data
            let data = {
                token: token,
                name: name,
                start: start,
                end: end
            };

            // Disable button and add loading indicator
            document.getElementById("btn").disabled = true;
            document.getElementById("loader").style.display = "block";

            // Inject script
            chrome.tabs.executeScript({file: 'process.js'}, function () {
                // Send message of data to target tab
                chrome.tabs.sendMessage(tabId, data);
            });
        }
    });
}

// Request handlers

// Google Calendar object rep
function getNewCalObj(name) {
    return {
        "summary": name,
        "timeZone": Intl.DateTimeFormat().resolvedOptions().timeZone
    };
}

// Creates new Google Calendar with given name, return the id
function createNewCal(token, calName, callback) {
    let body = getNewCalObj(calName);
    let xhr = new XMLHttpRequest();
    let url = "https://www.googleapis.com/calendar/v3/calendars?access_token=" + token;
    xhr.open("POST", url);
    xhr.setRequestHeader("Content-Type", "application/json");
    xhr.onload = function () {
        let obj = JSON.parse(xhr.responseText);
        callback(obj.id);
    };
    xhr.send(JSON.stringify(body));
}

// Async to add event to calendar
function addEventToCalendar(id, event, token) {
    let eventUrl = "https://www.googleapis.com/calendar/v3/calendars/" + id + "/events?access_token=" + token;
    let xhr = new XMLHttpRequest();
    xhr.open("POST", eventUrl);
    xhr.setRequestHeader("Content-Type", "application/json");
    xhr.send(JSON.stringify(event));
}
