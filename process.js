// Event listener
// This receives the data from the popup and executes the main code
chrome.runtime.onMessage.addListener(processMessage);

function processMessage(data) {
    let start = parseDate(data.start);
    let end = parseDate(data.end);
    createCalendarAndAddEvents(data.token, data.name, start, end);
}

function finishExecution() {
    alert('Done adding events to calendar! Open Google Calendar to see the result.');
    chrome.runtime.onMessage.removeListener(processMessage); // Prevent duplicate executions
}

// Fixes calendar issue with date picker
function parseDate(dateStr) {
    let result = new Date(dateStr);
    let min = result.getTimezoneOffset();
    result.setMinutes(result.getMinutes() + min);
    return result;
}

// Starts by creating a calendar (async) and then adds events to the calendar
function createCalendarAndAddEvents(token, calName, semesterStartDate, semesterEndDate) {
    createNewCal(token, calName, function (calId) {
        addScheduleToCal(token, calId, semesterStartDate, semesterEndDate);
        finishExecution();
    });
}

// Split multi-line text content strings into arrays
function splitMulti(content) {
    return content.trim().split(/\s+/g);
}

// https://stackoverflow.com/questions/4878756/how-to-capitalize-first-letter-of-each-word-like-a-2-word-city
function toTitleCase(str) {
    return str.replace(/\w\S*/g, function(txt){
        return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
    });
}

// Adds the events from the schedule to the calendar with the given id
function addScheduleToCal(token, calId, semesterStartDate, semesterEndDate) {
    // Loop through each course
    let rows = document.getElementsByTagName("TR");
    for (let i in rows) {
        let cols = rows[i].children;
        if (cols === undefined || cols == null || cols[0].textContent === 'Unique') {
            // Skip header, bad rows
            continue;
        }

        // Grab attributes
        let course = cols[1].textContent.trim();
        let desc = toTitleCase(cols[2].textContent.trim());

        // For these, there could be multiple, distinct class meetings
        let buildingArr = splitMulti(cols[3].textContent);
        let roomArr = splitMulti(cols[4].textContent);
        let daysArr = splitMulti(cols[5].textContent);
        let timeArr = splitMulti(cols[6].textContent);

        if (daysArr.length === 0) {
            // Empty meeting, online course? Ignore.
            continue;
        }

        // Format common name
        let name = course + ' ' + desc;

        // For each class meeting...
        for (let j = 0; j < buildingArr.length; j++) {
            // Formulate location
            let building = buildingArr[j];
            let room = roomArr[j];
            let loc = building + ' ' + room;

            // Extract days
            let dayString = daysArr[j]; // MWF, TTH, etc.
            dayString = dayString.replace('TH', 'H'); // Replace TH with H, single letter

            // Get the initial event start and end times
            let classStartDate = getStartDateForClass(semesterStartDate, dayString);

            // Parse time
            let startTimeStr = timeArr[2 * j];
            let endTimeStr = timeArr[2 * j + 1];
            let startTime = addTimeStrToBase(startTimeStr, classStartDate);
            let endTime = addTimeStrToBase(endTimeStr, classStartDate);

            // Create event object from all of the data
            let event = createEventObj(name, loc, startTime, endTime, dayString, semesterEndDate);

            // Push the event to the calendar
            addEventToCalendar(calId, event, token);
        }
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
    // While the day is not a class day...
    while (!(days.includes(DAY_MAP[result.getDay()]))) {
        // Add 1 day
        result.setDate(result.getDate() + 1);
    }
    return result;
}

// Adds a time string to a base date time
// Accepts input such as '2:00pm' or '11:30am'
function addTimeStrToBase(timeStr, baseDateTime) {
    let isPm = timeStr.includes('pm');
    timeStr = timeStr.replace('am', '');
    timeStr = timeStr.replace('pm', '');
    timeStr = timeStr.replace('-', '');

    let colonSplit = timeStr.split(':');
    let hour = parseInt(colonSplit[0]);
    let min = parseInt(colonSplit[1]);

    if (isPm && hour !== 12) {
        // PM offset
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

// Return user browser timezone string
function getTimeZone() {
    return Intl.DateTimeFormat().resolvedOptions().timeZone
}

// RRULE requires a specific format for the UNTIL field
// Example: 19971224T000000Z
function formatUntil(date) {
    let month = ("0" + (1 + date.getUTCMonth())).slice(-2);
    let day = ("0" + date.getUTCDate()).slice(-2);
    let hour = ("0" + date.getUTCHours()).slice(-2);
    return '' + date.getUTCFullYear() + month + day + 'T' + hour + '0000Z';
}

// Google Calendar event rep
function createEventObj(name, location, startDateTime, endDateTime, dayString, semesterEndDay) {
    return {
        "summary": name,
        "location": location,
        "start": {
            "dateTime": startDateTime.toISOString(),
            "timeZone": getTimeZone()
        },
        "end": {
            "dateTime": endDateTime.toISOString(),
            "timeZone": getTimeZone()
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
        "timeZone": getTimeZone()
    };
}

// XHR functions

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
