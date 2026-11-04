'use strict';
// Decides whether a device gets a notification right now, and what it says.
// Pure functions only, so they can be tested without Firebase or the network.

const WINDOW_MIN = 180; // a notification may go out up to 3 hours after its set time

function localParts(date, tz) {
  const f = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
  });
  const p = {};
  f.formatToParts(date).forEach(x => { p[x.type] = x.value; });
  return { date: p.year + '-' + p.month + '-' + p.day, minutes: (+p.hour) * 60 + (+p.minute) };
}
function addDays(s, n) {
  const d = new Date(s + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
function diff(a, b) {
  return Math.round((Date.parse(b + 'T00:00:00Z') - Date.parse(a + 'T00:00:00Z')) / 86400000);
}
function toMin(t) {
  const p = String(t || '00:00').split(':');
  return (+p[0]) * 60 + (+p[1]);
}
function plural(n, a, b) { return n === 1 ? a : b; }
function names(goals, max) {
  max = max || 3;
  const shown = goals.slice(0, max).map(g => g.title);
  const rest = goals.length - shown.length;
  if (!rest) return shown.length > 1 ? shown.slice(0, -1).join(', ') + ' and ' + shown[shown.length - 1] : shown[0];
  return shown.join(', ') + ' and ' + rest + ' more';
}
function byDue(a, b) { return a.due < b.due ? -1 : a.due > b.due ? 1 : 0; }

// Same rule the app uses for "waiting for a check-in".
function pending(goals, today, tz) {
  return goals.filter(g => {
    const l = g.checkins && g.checkins.length ? g.checkins[g.checkins.length - 1] : null;
    const lastDay = l ? localParts(new Date(l.ts), tz).date : null;
    if (lastDay === today) return false;
    if (g.created === today && g.due > today) return false;
    const until = diff(today, g.due);
    const since = lastDay ? diff(lastDay, today) : diff(g.created, today);
    return until <= 7 || since >= 7;
  }).sort(byDue);
}

// Returns { kind, title, body, open, date } or null. At most one morning and one evening per local day.
function decide({ state, now, tz, lastSent }) {
  tz = tz || 'UTC';
  lastSent = lastSent || {};
  const lp = localParts(now, tz);
  const today = lp.date;
  const tomorrow = addDays(today, 1);
  const s = Object.assign({ plan: '08:00', check: '20:00' }, state.settings || {});
  const active = (state.goals || []).filter(g => !g.done && !g.example && g.due);

  // Stop nudging people who have gone quiet: no open goals and nothing changed for a week.
  const idleDays = state.updated ? (now.getTime() - state.updated) / 86400000 : 999;
  if (!active.length && idleDays > 7) return null;

  const planAt = toMin(s.plan), checkAt = toMin(s.check);

  if (s.notifMorning !== false && lp.minutes >= planAt && lp.minutes < planAt + WINDOW_MIN && lastSent.morning !== today) {
    const due = active.filter(g => g.due <= today).sort(byDue);
    if (due.length) {
      const overdue = due.filter(g => g.due < today).length;
      return {
        kind: 'morning', date: today, open: '',
        title: due.length + ' ' + plural(due.length, 'goal', 'goals') + ' today',
        body: names(due) + (overdue ? '. ' + overdue + ' ' + plural(overdue, 'is', 'are') + ' overdue.' : '.')
      };
    }
    return {
      kind: 'morning', date: today, open: 'add-today',
      title: 'Plan your day',
      body: 'Nothing set for today yet. Add one to three goals.'
    };
  }

  if (s.notifEvening !== false && lp.minutes >= checkAt && lp.minutes < checkAt + WINDOW_MIN && lastSent.evening !== today) {
    const pend = pending(active, today, tz);
    const tmr = active.filter(g => g.due === tomorrow).sort(byDue);
    const lines = [];
    if (pend.length) lines.push(pend.length + ' ' + plural(pend.length, 'goal is', 'goals are') + ' waiting for a check-in: ' + names(pend, 2) + '.');
    if (tmr.length) lines.push('Tomorrow: ' + names(tmr, 2) + '.');
    if (!lines.length) {
      return { kind: 'evening', date: today, open: 'add-tomorrow', title: 'Plan tomorrow', body: 'Set tomorrow’s goals tonight so the morning is easier.' };
    }
    return {
      kind: 'evening', date: today,
      open: pend.length ? 'flow' : '',
      title: pend.length ? 'Evening check-in' : 'Tomorrow’s goals',
      body: lines.join('\n')
    };
  }
  return null;
}

module.exports = { decide, pending, localParts, addDays };
