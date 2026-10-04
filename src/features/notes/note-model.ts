import type { Note, NotesModel } from './note-types.ts';
import { todayIsoDate } from "../../core/formatting/dates.ts";
import { hasValue } from "../../core/records/record-values.ts";

export function populatedNotes(dataModel: NotesModel): Note[] {
  return (dataModel.notes || []).filter((note) => hasValue(note.title) || hasValue(note.body));
}

export function countNested(notes: Note[], key: string) {
  return notes.reduce((total, note) => total + (Array.isArray(note[key]) ? note[key].length : 0), 0);
}

export function today() {
  return todayIsoDate();
}

export function newNote(id: number = 1): Note {
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

export function dateTimeLabel(timestamp: unknown, fallbackDate: unknown) {
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

export function timestampLabel(note: Note) {
  return dateTimeLabel(note.createdAt, note.createdDate);
}
