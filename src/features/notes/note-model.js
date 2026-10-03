import { todayIsoDate } from "../../core/formatting/dates.js";
import { hasValue } from "../../core/records/record-values.js";

export function populatedNotes(dataModel) {
  return (dataModel.notes || []).filter((note) => hasValue(note.title) || hasValue(note.body));
}

export function countNested(notes, key) {
  return notes.reduce((total, note) => total + (Array.isArray(note[key]) ? note[key].length : 0), 0);
}

export function today() {
  return todayIsoDate();
}

export function newNote(id = 1) {
  return {
    id,
    title: "",
    category: "Observation",
    status: "Active",
    createdDate: today(),
    createdAt: "",
    updatedDate: "",
    updatedAt: "",
    author: "",
    body: "",
    tags: "",
    relatedIds: "",
    references: [],
    editHistory: []
  };
}

export function dateTimeLabel(timestamp, fallbackDate) {
  if (timestamp) {
    const date = new Date(timestamp);
    if (!Number.isNaN(date.getTime())) {
      const parts = new Intl.DateTimeFormat("en-US", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
        timeZoneName: "short"
      }).formatToParts(date).reduce((result, part) => {
        result[part.type] = part.value;
        return result;
      }, {});
      return `${parts.year}-${parts.month}-${parts.day} at ${parts.hour}:${parts.minute} ${parts.dayPeriod} ${parts.timeZoneName}`;
    }
  }

  return fallbackDate || "Date unavailable";
}

export function timestampLabel(note) {
  return dateTimeLabel(note.createdAt, note.createdDate);
}
