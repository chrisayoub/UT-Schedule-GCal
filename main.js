const LOAD_UT_SCHED_MSG = "Load UT semester schedule.";
const ADD_TO_CAL_MSG = "Add schedule to Calendar.";

const SCHED_URL = "https://utdirect.utexas.edu/registrar/waitlist/wl_see_my_waitlists.WBX";

var tabId;

window.onload = function() {
    chrome.tabs.query({ 'url': SCHED_URL }, function(tabs) {
        var btn = document.getElementById("btn");
        var inputFields = document.getElementById("in");

        if (tabs.length === 0) {
            // If not on schedule page, redirect
            btn.textContent = LOAD_UT_SCHED_MSG;
            btn.onclick = loadSchedulePage;
        } else {
            // Ready to process schedule
            chrome.tabs.update(tabs[0].id, {highlighted: true});
            tabId = tabs[0].id;
            btn.textContent = ADD_TO_CAL_MSG;
            btn.onclick = execScript;
            inputFields.style.visibility = "visible";
        }
    });
};

// Load schedule page in new tab
function loadSchedulePage() {
    chrome.tabs.create({ 'url': SCHED_URL }, null)
}

// Execute script
function execScript() {
    // Authenticate to get the token we need for Google Calendar
    chrome.identity.getAuthToken({ 'interactive': true }, function(token) {
        if (token != null) {
            const name = document.getElementById("cal").value;
            const start = document.getElementById("start").value;
            const end = document.getElementById("end").value;
            if (start == null || end == null) {
                return;
            }
            // Inject script
            chrome.tabs.executeScript({file: 'process.js'});
            // Format message data
            var data = {
                token: token,
                name: name,
                start: start,
                end: end
            };
            // Send message of data to target tab
            chrome.tabs.sendMessage(tabId, data);
        }
    });
}
