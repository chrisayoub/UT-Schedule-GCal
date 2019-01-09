const LOAD_UT_SCHED_MSG = "Click here to load your UT semester schedule.";
const ADD_TO_CAL_MSG = "Click here to add your schedule to Google Calendar.";

const SCHED_URL = "https://utdirect.utexas.edu/registrar/waitlist/wl_see_my_waitlists.WBX";

const CREATE_CAL_URL = "https://www.googleapis.com/calendar/v3/calendars";

window.onload = function() {
    var btn = document.getElementById("btn");
    var inputFields = document.getElementById("id");

    // var start = document.getElementById("start");
    // var end = document.getElementById("end");

    const loc = window.location.href.toString();
    if (loc !== SCHED_URL) {
        btn.textContent = LOAD_UT_SCHED_MSG;
        btn.onclick = loadSchedulePage;
    } else {
        btn.textContent = ADD_TO_CAL_MSG;
        btn.onclick = addToCal;
        inputFields.style.visibility = "visible";
    }


    addToCal();
};

function loadSchedulePage() {
    window.location.assign(SCHED_URL);
}

function addToCal() {
    // First, create calendar
    // const id = createNewCal(name);
    // const eventUrl = "https://www.googleapis.com/calendar/v3/calendars/" + id + "/events";

    var rows = document.getElementsByClassName('tbon');
    for (var i in rows) {
        var cols = rows[i].children;
        if (cols == null) {
            continue;
        }
        var course = cols[1].textContent.trim().replace(/\t/, '');
        var meetingInfo = cols[2].textContent.trim();
        var meetingArr = meetingInfo.split(/[\n\t ]+/);
        var desc = cols[3].textContent.trim();

        var courseSpl = course.split(' ');
        courseSpl[courseSpl.length - 2] = ' ';
        course = courseSpl.join('');

        var name = course + ' ' + desc;
        var loc = meetingArr[4] + ' ' + meetingArr[5];

        var dayString = meetingArr[0];
        var startTime = meetingArr[1];
        var endTime = meetingArr[3];

        console.log(name);
        console.log(loc);
        console.log(dayString);
        console.log(startTime);
        console.log(endTime);
        console.log('   ');
    }
}



function getStartDateForClass() {

}

function getStartTimeForClass(semesterStartDate) {

}

function getEndTimeForClass() {

}

function createEventObj(name, location, startTime, endTime, dayString, semesterEndDay) {
    return {
        "summary": name,
        "location": location,
        // todo: start and end
        "recurrence": [
            getRRULEStr(dayString, semesterEndDay)
        ]
    }
}

function getRRULEStr(dayString, semesterEndDay) {
    // M T W TH F
    // MO TU WE TH FR
    const DAY_MAP = {
        'M': 'MO',
        'T': 'TU',
        'W': 'WE',
        'TH': 'TH',
        'F': 'FR'
    };
    let days = "";
    for (let i = 0; i < dayString.length; i++) {
        let ch = dayString.charAt(i);
        if (ch === 'T' && i + 1 < dayString.length) {
            // special case: Thursday
            days += DAY_MAP['TH'] + ',';
            i++;
        } else {
            days += DAY_MAP[ch] + ',';
        }
    }
    days = days.substring(0, days.length - 1);

    const until = new Date(semesterEndDay).toUTCString();

    return "RRULE:FREQ=WEEKLY;UNTIL=" + until + ";BYDAY=" + days;
}

function doGoogleAuth(interactive, callbackFunc) {
    chrome.identity.getAuthToken({ 'interactive': interactive }, callbackFunc);
}

function createNewCal() {
    var name = document.getElementById("cal").value;

    var body = getNewCalObj(name);
    var xhr = new XMLHttpRequest();
    xhr.open("POST", CREATE_CAL_URL, false);
    xhr.send(body);

    var obj = JSON.parse(xhr.responseText);
    return obj.id;
}

function getNewCalObj(name) {
    return {
        "kind": "calendar#calendar",
        "summary": name
    };
}