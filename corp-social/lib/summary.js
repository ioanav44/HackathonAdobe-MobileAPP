// Daily summary extractor for short messages.
// Input: entries = [{ text: string, created_at?: string }]
// Output: { tasks, meetings, calls, others }

function normalize(s) {
  return (s || '').toLowerCase();
}

function isSameDayISO(dateA, dateB) {
  if (!dateA || !dateB) return false;
  try {
    const a = new Date(dateA);
    const b = new Date(dateB);
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  } catch (e) { return false; }
}

export function extractSummary(entries = [], opts = {}) {
  const now = opts.today ? new Date(opts.today) : new Date();
  const todayISO = now.toISOString();

  const taskKeywords = ['task', 'taskul', 'taskuri', 'task-uri', 'sarcin', 'sarcina', 'sarcini', 'făcut', 'facut', 'terminat', 'finalizat', 'finalizate'];
  const meetingKeywords = ['sedinta', 'ședința', 'întâlnire', 'meeting'];
  const callKeywords = ['apel', 'sunat', 'call'];

  let tasks = 0, meetings = 0, calls = 0, others = 0;

  entries.forEach(entry => {
    const text = normalize(entry.text || '');
    // Only consider today's entries when created_at is present
    if (entry.created_at) {
      if (!isSameDayISO(entry.created_at, todayISO)) return; // skip not-today
    }

  let matched = false;
  // Track if explicit numeric counts were detected to avoid double counting
  let numDetected = { tasks: false, meetings: false, calls: false };

  // Digit-based counts like: "3 taskuri", "2 task-uri"
    const numberWordMap = {
      'un': 1, 'unu': 1, 'o': 1, 'una': 1,
      'doi': 2, 'doua': 2, 'două': 2, 'două': 2,
      'trei': 3, 'patru': 4, 'cinci': 5,
      'sase': 6, 'șase': 6, 'șapte': 7, 'sapte': 7,
      'opt': 8, 'noua': 9, 'nouă': 9,
      'zece': 10, 'unsprezece': 11, 'unspezece': 11, 'doisprezece': 12, 'douasprezece': 12, 'douăsprezece': 12,
      'treisprezece': 13, 'paisprezece': 14, 'paisprezece': 14, 'cincisprezece': 15, 'saisprezece': 16, 'șaisprezece': 16,
      'saptesprezece': 17, 'optsprezece': 18, 'nouasprezece': 19, 'nouăsprezece': 19, 'douazeci': 20, 'douăzeci': 20
    };

  // Digit-based counts
    const digitTaskRx = /([0-9]+)\s*(?:task(?:[\s\-]?uri)?|taskuri|task\-uri|sarcin(?:a|i)?)/gi;
    let m;
    while ((m = digitTaskRx.exec(text)) !== null) {
      tasks += parseInt(m[1], 10) || 0;
      matched = true;
      numDetected.tasks = true;
    }

  const digitMeetingRx = /([0-9]+)\s*(?:ședin(?:[aț]?[a]?)|sedin|întâlnire|meeting)/gi;
    while ((m = digitMeetingRx.exec(text)) !== null) {
      meetings += parseInt(m[1], 10) || 0;
      matched = true;
      numDetected.meetings = true;
    }

  // Number-word counts (e.g., "două taskuri")
    Object.keys(numberWordMap).forEach(word => {
      const n = numberWordMap[word];
      // task pattern with a leading word (\bword\b\s*(?:task...))
      const rw = new RegExp('\\b' + word + '\\b\\s*(?:task(?:[\\s\\-]?uri)?|taskuri|task\-uri|sarcin(?:a|i)?)', 'gi');
      while ((m = rw.exec(text)) !== null) {
        tasks += n;
        matched = true;
        numDetected.tasks = true;
      }
      const rm = new RegExp('\\b' + word + '\\b\\s*(?:ședin(?:[aț]?[a]?)|sedin|întâlnire|meeting)', 'gi');
      while ((m = rm.exec(text)) !== null) {
        meetings += n;
        matched = true;
        numDetected.meetings = true;
      }
    });

  // Keyword presence counts (fallback)
    let taskCountHere = 0;
    if (!numDetected.tasks) {
      taskKeywords.forEach(k => {
        const rx = new RegExp(k, 'g');
        const found = (text.match(rx) || []).length;
        if (found) { taskCountHere += found; matched = true; }
      });
      if (taskCountHere > 0) tasks += taskCountHere || 1;
    }

    let meetingCountHere = 0;
    if (!numDetected.meetings) {
      meetingKeywords.forEach(k => {
        const rx = new RegExp(k, 'g');
        const found = (text.match(rx) || []).length;
        if (found) { meetingCountHere += found; matched = true; }
      });
      if (meetingCountHere > 0) meetings += meetingCountHere || 1;
    }

    let callCountHere = 0;
    if (!numDetected.calls) {
      callKeywords.forEach(k => {
        const rx = new RegExp(k, 'g');
        const found = (text.match(rx) || []).length;
        if (found) { callCountHere += found; matched = true; }
      });
      if (callCountHere > 0) calls += callCountHere || 1;
    }

  // Verb-only fallback → count as "others"
    const otherVerbRx = /am\s+(făcut|facut|trimis|participat|lucrat|lucru|realizat|finalizat)/g;
    if (!matched && (text.match(otherVerbRx) || []).length) {
      others += 1;
    }
  });

  return { tasks, meetings, calls, others };
}

export default { extractSummary };

// Classify a single text snippet into simple categories.
export function classifyText(text = '') {
  const t = normalize(text);
  const taskKeywords = ['task', 'taskul', 'taskuri', 'task-uri', 'sarcin', 'sarcina', 'sarcini', 'făcut', 'facut', 'terminat', 'finalizat', 'finalizate','proiect','proiecte'];
  const meetingKeywords = ['sedinta', 'ședința', 'ședin', 'sedin', 'întâlnire', 'meeting'];
  const callKeywords = ['apel', 'sunat', 'call'];

  const isTask = taskKeywords.some(k => t.includes(k));
  const isMeeting = meetingKeywords.some(k => t.includes(k));
  const isCall = callKeywords.some(k => t.includes(k));
  const isOther = !isTask && !isMeeting && !isCall && /am\s+(făcut|facut|trimis|participat|lucrat|realizat|finalizat)/.test(t);

  return { isTask, isMeeting, isCall, isOther };
}
