const LOAD_UT_SCHED_MSG = "Click here to load your UT semester schedule.";
const ADD_TO_CAL_MSG = "Click here to add your schedule to Google Calendar.";

const SCHED_URL = "https://utdirect.utexas.edu/registrar/waitlist/wl_see_my_waitlists.WBX";
const CREATE_CAL_URL = "https://www.googleapis.com/calendar/v3/calendars";

window.onload = function() {
    var btn = document.getElementById("btn");
    var inputFields = document.getElementById("id");

    const loc = window.location.href.toString();
    if (loc !== SCHED_URL) {
        // If not on schedule page, redirect
        btn.textContent = LOAD_UT_SCHED_MSG;
        btn.onclick = loadSchedulePage;
    } else {
        // Ready to process schedule
        btn.textContent = ADD_TO_CAL_MSG;
        btn.onclick = addScheduleToCal;
        inputFields.style.visibility = "visible";
    }
};

function loadSchedulePage() {
    window.location.assign(SCHED_URL);
}

function addScheduleToCal() {
    // First, create calendar
    const calId = createNewCal(name);

    const semesterStateDate = document.getElementById("start").valueAsDate;
    const semesterEndDate = document.getElementById("end").valueAsDate;

    // Loop through each course
    var rows = document.getElementsByClassName('tbon');
    for (var i in rows) {
        var cols = rows[i].children;
        if (cols == null) {
            continue;
        }
        // Grab attributes
        var course = cols[1].textContent.trim().replace(/\t/, '');
        var desc = cols[3].textContent.trim();
        var meetingInfo = cols[2].textContent.trim();
        var meetingArr = meetingInfo.split(/[\n\t ]+/);

        // Remove extra spaces from course
        var courseSpl = course.split(' ');
        courseSpl[courseSpl.length - 2] = ' ';
        course = courseSpl.join('');

        // Format common name
        var name = course + ' ' + desc;

        // Loop through class meetings, and add to calendar
        processClassMeetings(name, meetingArr, semesterStateDate, semesterEndDate);
    }
}

function processClassMeetings(name, meetingArr, semesterStartDate, semesterEndDate) {
    // Loop through class meetings
    var off = 0;
    const MEETING_OFF = 6;
    while (off < meetingArr.length) {
        var dayString = meetingArr[off];
        var startTimeStr = meetingArr[1 + off];
        var endTimeStr = meetingArr[3 + off];

        // Format location
        var loc = meetingArr[4 + off] + ' ' + meetingArr[5 + off];

        // Get the initial event start and end times
        var classStartDate = getStartDateForClass(semesterStateDate, dayString);
        var startTime = addTimeStrToBase(startTimeStr, classStartDate);
        var endTime = addTimeStrToBase(endTimeStr, classStartDate);

        // Create event object from all of the data
        var event = createEventObj(name, loc, startTime, endTime, dayString, semesterEndDate);
        console.log(event);

        // Push the event to the calendar
        addEventToCalendar(calId, event);

        off += MEETING_OFF;
    }
}

// Gets the correct start date for a class, based on the days it occurs
// For example, if we start sem. on Wed Jan 21, and the class meets T Th,
//     this should return Thur Jan 22
function getStartDateForClass(semesterStartDate, dayString) {
    const DAY_MAP = {
        0: 'X', // invalid
        1: 'M',
        2: 'T',
        3: 'W',
        4: 'H',
        5: 'F',
        6: 'X'  // invalid
    };
    dayString = dayString.replace('TH', 'H');
    var days = dayString.split('');

    var result = new Date(semesterStartDate);
    // While the day is not a class day...
    while (!(days.includes(DAY_MAP[result.getDay()]))) {
        // Add 1 day
        result.setDate(result.getDate() + 1);
    }
    return result;
}

// Adds a time string to a base date time
// Possible inputs:
// 11 1130 1 130
// 11a 1130a 1p 130p
// Note that this assumes anything from 8 to 11 must be AM, and anything from 12 to 7 must be PM
function addTimeStrToBase(timeStr, baseDateTime) {
    timeStr = timeStr.replace('a', '');
    timeStr = timeStr.replace('p', '');

    var hour = 0;
    var min = 0;
    if (timeStr.length === 1 || timeStr.length === 2) {
        // 1 as in 1:00 pm
        // 11 as in 11:00 am
        hour = parseInt(timeStr);
    } else if (timeStr.length === 3) {
        // 130 as in 1:30 pm
        hour = parseInt(timeStr.substring(0, 1));
        min = parseInt(timeStr.substring(1));
    } else { // 4
        // 1130 as in 11:30 am
        hour = parseInt(timeStr.substring(0, 2));
        min = parseInt(timeStr.substring(2));
    }

    if (hour < 8) {
        // PM
        hour += 12;
    }

    var toReturn = new Date(baseDateTime);
    toReturn.setHours(hour, min, 0);
    return toReturn;
}

// Create string for recurring event
function getRRULEStr(dayString, semesterEndDay) {
    // M T W TH F
    // MO TU WE TH FR
    const DAY_MAP = {
        'M': 'MO',
        'T': 'TU',
        'W': 'WE',
        'H': 'TH',
        'F': 'FR'
    };
    dayString = dayString.replace('TH', 'H');

    let days = "";
    for (let i = 0; i < dayString.length; i++) {
        let ch = dayString.charAt(i);
        days += DAY_MAP[ch] + ',';
    }
    days = days.substring(0, days.length - 1);

    // Get as UTC
    const until = new Date(semesterEndDay).toISOString();
    // Create final RRULE string
    return "RRULE:FREQ=WEEKLY;UNTIL=" + until + ";BYDAY=" + days;
}

// Google Calendar event rep
function createEventObj(name, location, startDateTime, endDateTime, dayString, semesterEndDay) {
    return {
        "summary": name,
        "location": location,
        "start": {
            "dateTime": startDateTime.toISOString()
        },
        "end": {
            "dateTime": endDateTime.toISOString()
        },
        "recurrence": [
            getRRULEStr(dayString, semesterEndDay)
        ]
    }
}

// Google Calendar object rep
function getNewCalObj(name) {
    return {
        "kind": "calendar#calendar",
        "summary": name
    };
}

// XHR functions

// Creates new Google Calendar with given name, return the id
function createNewCal() {
    var name = document.getElementById("cal").value;

    var body = getNewCalObj(name);
    var xhr = new XMLHttpRequest();
    xhr.open("POST", CREATE_CAL_URL, false);
    xhr.send(JSON.stringify(body));

    var obj = JSON.parse(xhr.responseText);
    return obj.id;
}


// Async to add event to calendar
function addEventToCalendar(id, event) {
    const eventUrl = "https://www.googleapis.com/calendar/v3/calendars/" + id + "/events";
    var xhr = new XMLHttpRequest();
    xhr.open("POST", eventUrl);
    xhr.send(JSON.stringify(event));
}
// Authenticate with Google Account
function doGoogleAuth(interactive, callbackFunc) {
    chrome.identity.getAuthToken({ 'interactive': interactive }, callbackFunc);
}
