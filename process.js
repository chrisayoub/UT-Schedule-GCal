// Event listener
// This receives the data from the popup and executes the main code
chrome.runtime.onMessage.addListener(processMessage);

function processMessage(data) {
    console.log('here!');

    let start = new Date(data.start);
    let end = new Date(data.end);

    console.log(start);
    console.log(end);

    addScheduleToCal(data.token, data.name, start, end);
    alert('Done adding events to calendar!');
    chrome.runtime.onMessage.removeListener(processMessage);
}

function addScheduleToCal(token, calName, semesterStartDate, semesterEndDate) {
    // First, create calendar
    let calId = 0; // TODO  createNewCal(token, calName);

    // Loop through each course
    let rows = document.getElementsByClassName('tbon');
    for (let i in rows) {
        let cols = rows[i].children;
        if (cols == null) {
            continue;
        }
        // Grab attributes
        let course = cols[1].textContent.trim().replace(/\t/, '');
        let desc = cols[3].textContent.trim();
        let meetingInfo = cols[2].textContent.trim();
        let meetingArr = meetingInfo.split(/[\n\t ]+/);

        // Remove extra spaces from course
        let courseSpl = course.split(' ');
        courseSpl[courseSpl.length - 2] = ' ';
        course = courseSpl.join('');

        // Format common name
        let name = course + ' ' + desc;

        // Loop through class meetings for the course, and add to calendar
        processClassMeetings(name, meetingArr, semesterStartDate, semesterEndDate, calId, token);
    }
}

// Adds each course's class meeting as a new calendar event
function processClassMeetings(name, meetingArr, semesterStartDate, semesterEndDate, calId, token) {
    // Loop through class meetings
    let off = 0;
    const MEETING_OFF = 6; // Static offset for each class meeting
    while (off < meetingArr.length) {
        let dayString = meetingArr[off]; // MWF, TTH, etc.
        dayString = dayString.replace('TH', 'H'); // Replace TH with H, single letter
        let startTimeStr = meetingArr[1 + off];
        let endTimeStr = meetingArr[3 + off];

        // Format full building/location
        let loc = meetingArr[4 + off] + ' ' + meetingArr[5 + off];

        // Get the initial event start and end times
        let classStartDate = getStartDateForClass(semesterStartDate, dayString);
        let startTime = addTimeStrToBase(startTimeStr, classStartDate);
        let endTime = addTimeStrToBase(endTimeStr, classStartDate);

        // Create event object from all of the data
        let event = createEventObj(name, loc, startTime, endTime, dayString, semesterEndDate);
        console.log(event);

        // Push the event to the calendar
        // addEventToCalendar(calId, event, token);

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
    let days = dayString.split('');

    let result = new Date(semesterStartDate); // copy
    console.log(result.toLocaleString());
    // While the day is not a class day...
    while (!(days.includes(DAY_MAP[result.getUTCDay()]))) {
        // Add 1 day
        result.setDate(result.getDate() + 1);
    }
    console.log(result.toLocaleString());
    return result;
}

// Adds a time string to a base date time
// Possible inputs:
// 11 1130 1 130
// 11a 1130a 1p 130p
// Note that this assumes anything from 8 to 11 must be AM, and anything from 12 to 7 must be PM
// Might be incorrect for some courses, but whatever
function addTimeStrToBase(timeStr, baseDateTime) {
    timeStr = timeStr.replace('a', '');
    timeStr = timeStr.replace('p', '');

    let hour = 0;
    let min = 0;
    if (timeStr.length <= 2) {
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

    let toReturn = new Date(baseDateTime);
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

    let days = "";
    for (let i = 0; i < dayString.length; i++) {
        days += DAY_MAP[dayString.charAt(i)] + ',';
    }
    days = days.substring(0, days.length - 1); // Remove trailing comma

    // Get as UTC
    let until = formatUntil(new Date(semesterEndDay));
    // Create final RRULE string
    return "RRULE:FREQ=WEEKLY;UNTIL=" + until + ";BYDAY=" + days;
}

// RRULE requires a specific format for the UNTIL field
// Example: 19971224T000000Z
function formatUntil(date) {
    let month = ("0" + (1 + date.getUTCMonth())).slice(-2);
    let day = ("0" + date.getUTCDate()).slice(-2);
    return '' + date.getUTCFullYear() + month + day + 'T000000Z';
}

// Google Calendar event rep
function createEventObj(name, location, startDateTime, endDateTime, dayString, semesterEndDay) {
    return {
        "summary": name,
        "location": location,
        "start": {
            "dateTime": startDateTime.toISOString(),
            "timeZone": "UTC"
        },
        "end": {
            "dateTime": endDateTime.toISOString(),
            "timeZone": "UTC"
        },
        "recurrence": [
            getRRULEStr(dayString, semesterEndDay)
        ]
    }
}

// Google Calendar object rep
function getNewCalObj(name) {
    return {
        "summary": name,
        "timeZone": Intl.DateTimeFormat().resolvedOptions().timeZone // User browser timezone
    };
}

// XHR functions

// Creates new Google Calendar with given name, return the id
function createNewCal(token, calName) {
    let body = getNewCalObj(calName);
    let xhr = new XMLHttpRequest();
    let url = "https://www.googleapis.com/calendar/v3/calendars?access_token=" + token;
    xhr.open("POST", url, false);
    xhr.setRequestHeader("Content-Type", "application/json");
    xhr.send(JSON.stringify(body));

    let obj = JSON.parse(xhr.responseText);
    return obj.id;
}

// Async to add event to calendar
function addEventToCalendar(id, event, token) {
    let eventUrl = "https://www.googleapis.com/calendar/v3/calendars/" + id + "/events?access_token=" + token;
    let xhr = new XMLHttpRequest();
    xhr.open("POST", eventUrl);
    xhr.setRequestHeader("Content-Type", "application/json");
    xhr.send(JSON.stringify(event));
}
