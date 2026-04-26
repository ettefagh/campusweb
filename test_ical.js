const ICAL = require('ical.js');
const icalContent = `BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
SUMMARY:Algorithms and Data Structures - Group 1
LOCATION:1.01 HALL\\, Sonnenallee 221B\\, 12059 Berlin
DESCRIPTION:Course ID: k_BCS_011\\nOriginal Location: HALL 1.01 Design Think
UID:83476@simovative.com
END:VEVENT
END:VCALENDAR`;
const jcalData = ICAL.parse(icalContent);
const comp = new ICAL.Component(jcalData);
const vevents = comp.getAllSubcomponents('vevent');
vevents.forEach(v => {
    const event = new ICAL.Event(v);
    console.log("DESC:", event.description);
    console.log("LOC:", event.location);
});
