const defaultState = { balance: 0, income: 0, incomeType: 'income', userName: '', goals: [], charges: [], activities: [] };
const storageKey = 'pocketplan-state-v2';
let state = JSON.parse(localStorage.getItem(storageKey) || 'null') || structuredClone(defaultState);
const $ = (selector) => document.querySelector(selector);
const money = (value) => `$${Number(value).toFixed(2)}`;
const save = () => localStorage.setItem(storageKey, JSON.stringify(state));
const showToast = (message) => { const toast = $('#toast'); toast.textContent = message; toast.classList.add('show'); setTimeout(() => toast.classList.remove('show'), 2200); };
const prettyDate = (value) => value ? new Date(`${value}T12:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : 'Today';

function renderVisuals() {
  const categories = ['Food', 'Games', 'Transport', 'Fun', 'Other'];
  const categoryTotals = categories.map(category => ({ category, total: state.activities.filter(item => item.type === 'expense' && (item.category || 'Other') === category).reduce((sum, item) => sum + Number(item.amount), 0) }));
  const totalSpent = categoryTotals.reduce((sum, item) => sum + item.total, 0);
  const colors = { Food: '#e2a28c', Games: '#a9b8ed', Transport: '#9dcca0', Fun: '#d6b1e5', Other: '#c7cfca' };
  const slices = categoryTotals.filter(item => item.total > 0);
  let angle = 0;
  const gradient = slices.length ? slices.map(item => { const start = angle; angle += (item.total / totalSpent) * 360; return `${colors[item.category]} ${start}deg ${angle}deg`; }).join(', ') : '#edf2ea 0 360deg';
  $('#spending-pie').style.background = `conic-gradient(${gradient})`;
  $('#spending-pie-total').textContent = money(totalSpent).replace('.00', '');
  $('#spending-legend').innerHTML = slices.length ? slices.map(item => `<div><i style="background:${colors[item.category]}"></i><span>${item.category}</span><strong>${money(item.total)}</strong></div>`).join('') : '<div class="chart-empty small"><span>◔</span><p>Log spending to see your split.</p></div>';

  const entries = [...state.activities].reverse();
  let running = 0;
  const points = entries.map((item, index) => { running += item.type === 'income' ? Number(item.amount) : -Number(item.amount); return { value: running, label: item.date.split(' · ')[0] || `Entry ${index + 1}` }; });
  if (!points.length) { $('#balance-line-chart').innerHTML = '<div class="chart-empty"><span>⌁</span><p>Add income or spending to see your money change over time.</p></div>'; return; }
  const values = points.map(point => point.value); const min = Math.min(0, ...values); const max = Math.max(1, ...values); const range = max - min || 1; const width = 520; const height = 124; const coords = points.map((point, index) => `${points.length === 1 ? width / 2 : 18 + (index * (width - 36)) / (points.length - 1)},${height - 18 - ((point.value - min) / range) * (height - 36)}`); const last = coords[coords.length - 1].split(',');
  $('#balance-line-chart').innerHTML = `<svg viewBox="0 0 ${width} ${height}" preserveAspectRatio="none" role="img" aria-label="Balance over time"><line x1="18" y1="${height - 18}" x2="${width - 18}" y2="${height - 18}" class="chart-axis"/><polyline points="${coords.join(' ')}" class="line-graph"/><circle cx="${last[0]}" cy="${last[1]}" r="5" class="line-dot"/></svg><div class="line-labels"><span>${points[0].label}</span><strong>${money(points[points.length - 1].value)}</strong><span>${points[points.length - 1].label}</span></div>`;
}

function render() {
  const userName = state.userName || '';
  $('#greeting-name').textContent = userName || 'there';
  $('#profile-name').value = userName;
  $('#profile-avatar').textContent = userName ? userName.charAt(0).toUpperCase() : '?';
  $('#balance-amount').textContent = money(state.balance);
  $('#month-income').textContent = money(state.income);
  $('#upcoming-total').textContent = money(state.charges.filter(c => !c.paid).reduce((sum, c) => sum + Number(c.amount), 0));
  $('#upcoming-count').textContent = `${state.charges.filter(c => !c.paid).length} ${state.charges.filter(c => !c.paid).length === 1 ? 'charge' : 'charges'}`;
  $('#goal-list').innerHTML = state.goals.length ? state.goals.map((goal, index) => { const percent = Math.min(100, Math.round((goal.saved / goal.target) * 100)); return `<div class="goal-item"><div class="goal-icon ${goal.color}">${goal.icon}</div><div><div class="goal-name">${goal.name}</div><div class="goal-meta">${money(goal.saved)} saved of ${money(goal.target)}</div><div class="progress-track"><div class="progress-value" style="width:${percent}%"></div></div></div><div class="goal-percent">${percent}%</div></div>`; }).join('') : '<div class="empty-state"><span>◎</span><div><strong>No goals yet</strong><p>Create one to start tracking something you care about.</p></div></div>';
  $('#charge-list').innerHTML = state.charges.slice(0, 3).map((charge, index) => `<div class="charge-item"><div class="charge-icon">${charge.icon}</div><div><div class="charge-name">${charge.name}${charge.paid ? '<span class="paid-badge">PAID</span>' : ''}</div><div class="charge-date">${charge.paid ? 'Paid' : charge.date}</div><button class="paid-toggle" data-charge-index="${index}">${charge.paid ? 'Mark unpaid' : 'Mark as paid'}</button></div><div class="charge-amount">${money(charge.amount)}</div></div>`).join('') || '<div class="empty-state"><span>✓</span><div><strong>Nothing due yet</strong><p>Add a bill, subscription, or money you owe.</p></div></div>';
  $('#activity-list').innerHTML = state.activities.length ? state.activities.slice(0, 4).map(item => `<div class="activity-item"><div class="activity-icon ${item.type}">${item.type === 'income' ? '↙' : '↗'}</div><div><div class="activity-name">${item.name}</div><div class="activity-date">${item.date}</div></div><div class="activity-amount ${item.type}">${item.type === 'income' ? '+' : '-'}${money(item.amount)}</div></div>`).join('') : '<div class="empty-state"><span>↕</span><div><strong>No activity yet</strong><p>Add money in or log spending to see it here.</p></div></div>';
  document.querySelectorAll('.paid-toggle').forEach(button => button.addEventListener('click', () => { const charge = state.charges[Number(button.dataset.chargeIndex)]; charge.paid = !charge.paid; save(); render(); showToast(charge.paid ? `${charge.name} marked paid` : `${charge.name} marked unpaid`); }));
  renderVisuals();
}

$('#entry-date').valueAsDate = new Date();
$('#profile-name').addEventListener('input', (event) => { state.userName = event.target.value.trim(); save(); $('#greeting-name').textContent = state.userName || 'there'; $('#profile-avatar').textContent = state.userName ? state.userName.charAt(0).toUpperCase() : '?'; });
document.querySelectorAll('.type-tab').forEach(tab => tab.addEventListener('click', () => { document.querySelectorAll('.type-tab').forEach(t => t.classList.remove('selected')); tab.classList.add('selected'); state.incomeType = tab.dataset.type; }));
$('#entry-form').addEventListener('submit', (event) => { event.preventDefault(); const form = new FormData(event.currentTarget); const amount = Number(form.get('amount')); const type = state.incomeType; const name = form.get('name'); const date = form.get('date'); state.balance += type === 'income' ? amount : -amount; if (type === 'income') state.income += amount; state.activities.unshift({ name, date: `${prettyDate(date)} · ${type === 'income' ? 'Income' : 'Expense'}`, amount, type, category: type === 'expense' ? form.get('category') : 'Other' }); save(); render(); event.currentTarget.reset(); $('#entry-date').valueAsDate = new Date(); showToast(`${type === 'income' ? 'Income' : 'Expense'} added to your activity`); });
$('#new-goal-button').addEventListener('click', () => { const form = $('#goal-form'); form.hidden = !form.hidden; if (!form.hidden) $('#goal-name').focus(); });
$('#cancel-goal').addEventListener('click', () => { $('#goal-form').reset(); $('#goal-form').hidden = true; });
$('#goal-form').addEventListener('submit', (event) => { event.preventDefault(); const name = $('#goal-name').value.trim(); const target = Number($('#goal-target').value); if (!name || !target || target < 1) return; state.goals.push({ name, icon: '✦', saved: 0, target, color: '' }); save(); render(); event.currentTarget.reset(); event.currentTarget.hidden = true; showToast('Goal created'); });
$('#add-charge-button').addEventListener('click', () => { const name = prompt('What bill or money you owe should be tracked?'); if (!name) return; const amount = Number(prompt('How much is it?')); if (!amount || amount < 0) return; const date = prompt('When is it due?', 'Due soon') || 'Due soon'; state.charges.push({ name, date, amount, icon: '◌', paid: false }); save(); render(); showToast('Item added'); });
$('#clear-activity').addEventListener('click', () => { if (!state.activities.length || !confirm('Clear recent activity?')) return; state.activities = []; save(); render(); showToast('Activity cleared'); });
$('#view-all-charges').addEventListener('click', () => showToast('You are viewing all upcoming charges')); $('#toggle-balance').addEventListener('click', (event) => { const amount = $('#balance-amount'); const hidden = amount.textContent === '••••'; amount.textContent = hidden ? money(state.balance) : '••••'; event.currentTarget.textContent = hidden ? '◉' : '○'; });
render();
