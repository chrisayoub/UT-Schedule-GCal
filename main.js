const LOAD_UT_SCHED_MSG = "Click to load UT semester schedule. Re-open this once you are logged in.";
const ADD_TO_CAL_MSG = "Add schedule to Google Calendar";
const INVALID_INPUT = "Please enter a name, a start date, and an end date.";
const SCHED_URL = "https://utdirect.utexas.edu/registrar/waitlist/wl_see_my_waitlists.WBX";

let tabId;

window.onload = function () {
    chrome.tabs.query({'url': SCHED_URL}, function (tabs) {
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
            inputFields.style.visibility = "visible";
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
