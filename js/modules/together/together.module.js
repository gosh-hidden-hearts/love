/**
 * GOSH TOGETHER MODULE (PHASE 9)
 * Shared Calendar & Countdowns, Collaborative To-Do Checklist, and Expense Split Tracker.
 */

import { Icons } from '../../components/icons.js';
import { DB } from '../../services/db.service.js';
import { Auth } from '../../services/auth.service.js';
import { Toast } from '../../components/toast.js';
import { Modal } from '../../components/modal.js';

export const TogetherModule = {
  activeTab: 'calendar', // 'calendar', 'tasks', 'expenses'
  unsubscribeCalendar: null,
  unsubscribeTasks: null,
  unsubscribeExpenses: null,

  async render() {
    const events = await DB.query('calendar_events', null, (a, b) => new Date(a.start_time) - new Date(b.start_time)).catch(() => []);
    const tasks = await DB.query('shared_tasks', null, (a, b) => (a.completed === b.completed ? 0 : a.completed ? 1 : -1)).catch(() => []);
    const expenses = await DB.query('shared_expenses', null, (a, b) => new Date(b.expense_date) - new Date(a.expense_date)).catch(() => []);

    return `
      <div class="view-container">
        <!-- Top Action & Title Header -->
        <div class="card flex justify-between items-center" style="margin-bottom: var(--space-4);">
          <div>
            <div class="badge badge-champagne" style="margin-bottom: var(--space-2);">
              Shared Life & Productivity
            </div>
            <h1 class="card-title" style="font-size: var(--text-xl);">GOSH Together</h1>
            <p class="text-muted">Coordinate upcoming dates, shared to-do lists, and joint expenses in sync.</p>
          </div>
          <div class="flex gap-2">
            ${this.activeTab === 'calendar' ? `
              <button class="btn btn-primary" id="new-event-btn">
                ${Icons.together}
                <span>+ Add Event</span>
              </button>
            ` : this.activeTab === 'tasks' ? `
              <button class="btn btn-primary" id="new-task-btn">
                <span>+ Add Task</span>
              </button>
            ` : `
              <button class="btn btn-primary" id="new-expense-btn">
                <span>+ Add Expense</span>
              </button>
            `}
          </div>
        </div>

        <!-- Navigation Tabs Ribbon -->
        <div class="card flex gap-2 items-center" style="margin-bottom: var(--space-6); padding: var(--space-3) var(--space-4);">
          <button class="btn btn-sm ${this.activeTab === 'calendar' ? 'btn-primary' : 'btn-secondary'} tog-tab-btn" data-tab="calendar">
            Shared Calendar & Dates (${events.length})
          </button>
          <button class="btn btn-sm ${this.activeTab === 'tasks' ? 'btn-primary' : 'btn-secondary'} tog-tab-btn" data-tab="tasks">
            Checklist (${tasks.filter(t => !t.completed).length} Pending)
          </button>
          <button class="btn btn-sm ${this.activeTab === 'expenses' ? 'btn-primary' : 'btn-secondary'} tog-tab-btn" data-tab="expenses">
            Shared Expenses (${expenses.length})
          </button>
        </div>

        <!-- Tab Body Content -->
        ${this.activeTab === 'calendar' ? this.renderCalendarTab(events) :
          this.activeTab === 'tasks' ? this.renderTasksTab(tasks) :
          this.renderExpensesTab(expenses)}
      </div>
    `;
  },

  // 1. SHARED CALENDAR & COUNTDOWNS
  renderCalendarTab(events) {
    if (events.length === 0) {
      return `
        <div class="card">
          <div class="empty-state">
            <div class="empty-state-icon">${Icons.together}</div>
            <h3 class="card-title">No Upcoming Events</h3>
            <p class="text-muted" style="max-width: 400px; margin-top: 6px;">
              Plan your trips, anniversaries, birthdays, and reminders together.
            </p>
          </div>
        </div>
      `;
    }

    const now = new Date();

    return `
      <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: var(--space-4);">
        ${events.map(ev => {
          const startDate = new Date(ev.start_time);
          const diffMs = startDate.getTime() - now.getTime();
          const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

          let countdownBadge = '';
          if (diffDays === 0) {
            countdownBadge = `<span class="badge badge-danger text-xs">Today</span>`;
          } else if (diffDays === 1) {
            countdownBadge = `<span class="badge badge-champagne text-xs">Tomorrow</span>`;
          } else if (diffDays > 1) {
            countdownBadge = `<span class="badge badge-violet text-xs">In ${diffDays} days</span>`;
          } else {
            countdownBadge = `<span class="badge text-xs" style="background: rgba(255,255,255,0.06); color: var(--text-muted);">${Math.abs(diffDays)} days ago</span>`;
          }

          const categoryColors = {
            birthday: '#ec4899',
            anniversary: '#f59e0b',
            travel: '#38bdf8',
            reminder: '#10b981',
            event: '#8b5cf6'
          };
          const catColor = categoryColors[ev.category] || '#8b5cf6';

          return `
            <div class="card" style="padding: var(--space-4); border-top: 3px solid ${catColor}; display: flex; flex-direction: column; justify-content: space-between;">
              <div>
                <div class="flex justify-between items-start" style="margin-bottom: var(--space-2);">
                  <span class="badge" style="background: ${catColor}22; color: ${catColor}; border: 1px solid ${catColor}44; text-transform: uppercase; font-size: 10px;">
                    ${ev.category}
                  </span>
                  ${countdownBadge}
                </div>
                <h3 class="card-title" style="font-size: var(--text-md); margin-bottom: var(--space-2); color: var(--text-primary);">
                  ${this.escapeHtml(ev.title)}
                </h3>
                ${ev.description ? `
                  <p class="text-xs text-muted" style="line-height: 1.5; margin-bottom: var(--space-3);">${this.escapeHtml(ev.description)}</p>
                ` : ''}
              </div>

              <div class="flex justify-between items-center" style="margin-top: var(--space-3); padding-top: var(--space-2); border-top: 1px solid var(--border-subtle);">
                <span class="text-xs font-mono text-muted">
                  ${startDate.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                </span>
                <button class="btn btn-sm btn-icon delete-event-btn" data-id="${ev.id}" title="Delete Event" style="color: var(--color-danger); opacity: 0.7;">
                  ${Icons.close}
                </button>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  },

  // 2. COLLABORATIVE CHECKLIST
  renderTasksTab(tasks) {
    return `
      <div class="card">
        <div class="card-header">
          <h2 class="card-title">Shared To-Do Checklist</h2>
          <span class="text-xs text-muted">${tasks.filter(t => t.completed).length} / ${tasks.length} Completed</span>
        </div>

        ${tasks.length === 0 ? `
          <div class="empty-state" style="padding: var(--space-6);">
            <div class="empty-state-icon">${Icons.together}</div>
            <p class="text-sm font-semibold">Checklist is empty</p>
            <p class="text-xs text-muted">Add packing lists, chores, or reminders to coordinate together.</p>
          </div>
        ` : `
          <div class="flex flex-col gap-2">
            ${tasks.map(task => {
              const priorityBadges = {
                high: '<span class="badge badge-danger text-xs" style="padding: 2px 6px;">High</span>',
                medium: '<span class="badge badge-champagne text-xs" style="padding: 2px 6px;">Med</span>',
                low: '<span class="badge text-xs" style="background: rgba(255,255,255,0.06); padding: 2px 6px;">Low</span>'
              };

              return `
                <div class="flex justify-between items-center" style="padding: 10px 14px; background: var(--bg-surface-hover); border-radius: var(--radius-md); border: 1px solid var(--border-subtle); ${task.completed ? 'opacity: 0.6;' : ''}">
                  <div class="flex items-center gap-3" style="flex: 1;">
                    <input type="checkbox" class="toggle-task-checkbox" data-id="${task.id}" ${task.completed ? 'checked' : ''} style="width: 18px; height: 18px; cursor: pointer; accent-color: var(--accent-primary);" />
                    <div>
                      <div class="text-sm font-semibold" style="${task.completed ? 'text-decoration: line-through; color: var(--text-muted);' : 'color: var(--text-primary);'}">
                        ${this.escapeHtml(task.title)}
                      </div>
                      ${task.due_date ? `
                        <div class="text-xs text-muted">Due: ${new Date(task.due_date).toLocaleDateString()}</div>
                      ` : ''}
                    </div>
                  </div>

                  <div class="flex items-center gap-2">
                    ${priorityBadges[task.priority] || ''}
                    <button class="btn btn-sm btn-icon delete-task-btn" data-id="${task.id}" title="Delete Task" style="color: var(--color-danger); opacity: 0.7;">
                      ${Icons.close}
                    </button>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        `}
      </div>
    `;
  },

  // 3. SHARED EXPENSES
  renderExpensesTab(expenses) {
    let totalSpent = 0;
    let u1Spent = 0;
    let u2Spent = 0;

    expenses.forEach(e => {
      const amt = parseFloat(e.amount) || 0;
      totalSpent += amt;
      if (e.paid_by === 'u1-auth-0000-0000-000000000001') {
        u1Spent += amt;
      } else {
        u2Spent += amt;
      }
    });

    const half = totalSpent / 2;
    const diff = u1Spent - half; // If > 0, Sharanya owes Gokul diff; if < 0, Gokul owes Sharanya |diff|

    return `
      <div>
        <!-- Balance Summary Cards -->
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: var(--space-4); margin-bottom: var(--space-6);">
          <div class="card" style="padding: var(--space-4);">
            <div class="text-xs text-muted uppercase font-semibold">Total Shared Spend</div>
            <div style="font-size: var(--text-2xl); font-weight: 700; color: var(--text-primary); margin-top: 4px;">
              $${totalSpent.toFixed(2)}
            </div>
            <div class="text-xs text-muted" style="margin-top: 4px;">Across ${expenses.length} recorded items</div>
          </div>

          <div class="card" style="padding: var(--space-4);">
            <div class="text-xs text-muted uppercase font-semibold">Gokul Paid</div>
            <div style="font-size: var(--text-xl); font-weight: 700; color: var(--accent-primary); margin-top: 4px;">
              $${u1Spent.toFixed(2)}
            </div>
            <div class="text-xs text-muted" style="margin-top: 4px;">50/50 Share: $${half.toFixed(2)}</div>
          </div>

          <div class="card" style="padding: var(--space-4);">
            <div class="text-xs text-muted uppercase font-semibold">Sharanya Paid</div>
            <div style="font-size: var(--text-xl); font-weight: 700; color: #38bdf8; margin-top: 4px;">
              $${u2Spent.toFixed(2)}
            </div>
            <div class="text-xs text-muted" style="margin-top: 4px;">50/50 Share: $${half.toFixed(2)}</div>
          </div>

          <div class="card" style="padding: var(--space-4); border-color: var(--accent-primary);">
            <div class="text-xs text-muted uppercase font-semibold">Net Settlement</div>
            <div style="font-size: var(--text-lg); font-weight: 700; color: var(--color-success); margin-top: 4px;">
              ${diff === 0 ? 'All Settled Up!' : diff > 0 ? `Sharanya owes Gokul $${diff.toFixed(2)}` : `Gokul owes Sharanya $${Math.abs(diff).toFixed(2)}`}
            </div>
            <div class="text-xs text-muted" style="margin-top: 4px;">Calculated automatically</div>
          </div>
        </div>

        <!-- Expenses List -->
        <div class="card">
          <div class="card-header">
            <h2 class="card-title">Expense History</h2>
            <span class="text-xs text-muted">Real-time Joint Ledger</span>
          </div>

          ${expenses.length === 0 ? `
            <div class="empty-state" style="padding: var(--space-6);">
              <div class="empty-state-icon">${Icons.together}</div>
              <p class="text-sm font-semibold">No expenses recorded yet</p>
              <p class="text-xs text-muted">Log flights, groceries, dinners, and joint purchases.</p>
            </div>
          ` : `
            <div class="flex flex-col gap-3">
              ${expenses.map(exp => `
                <div class="flex justify-between items-center" style="padding: 12px 16px; background: var(--bg-surface-hover); border-radius: var(--radius-md); border: 1px solid var(--border-subtle);">
                  <div>
                    <div class="text-sm font-semibold" style="color: var(--text-primary);">${this.escapeHtml(exp.title)}</div>
                    <div class="text-xs text-muted">
                      Paid by <strong>${exp.paid_by === 'u1-auth-0000-0000-000000000001' ? 'Gokul' : 'Sharanya'}</strong> • ${new Date(exp.expense_date).toLocaleDateString()} • <span class="badge badge-champagne text-xs">${exp.category}</span>
                    </div>
                  </div>

                  <div class="flex items-center gap-3">
                    <span style="font-size: var(--text-md); font-weight: 700; color: var(--text-primary);">
                      $${parseFloat(exp.amount).toFixed(2)}
                    </span>
                    <button class="btn btn-sm btn-icon delete-expense-btn" data-id="${exp.id}" title="Delete Expense" style="color: var(--color-danger); opacity: 0.7;">
                      ${Icons.close}
                    </button>
                  </div>
                </div>
              `).join('')}
            </div>
          `}
        </div>
      </div>
    `;
  },

  mount() {
    // Tab switching
    document.querySelectorAll('.tog-tab-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        this.activeTab = e.currentTarget.dataset.tab;
        this.refreshView();
      });
    });

    // Toggle Task Complete
    document.querySelectorAll('.toggle-task-checkbox').forEach(cb => {
      cb.addEventListener('change', async (e) => {
        const id = e.currentTarget.dataset.id;
        const checked = e.currentTarget.checked;
        const currentUser = Auth.getCurrentUser();
        await DB.update('shared_tasks', id, {
          completed: checked,
          completed_by: checked ? (currentUser ? currentUser.id : null) : null
        });
        Toast.success(checked ? 'Task Completed' : 'Task Marked Pending');
        this.refreshView();
      });
    });

    // Delete Event
    document.querySelectorAll('.delete-event-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.dataset.id;
        Modal.confirm('Delete Event', 'Are you sure you want to remove this event from the shared calendar?', async () => {
          await DB.delete('calendar_events', id);
          Toast.info('Event Deleted', 'Removed from shared calendar.');
          this.refreshView();
        });
      });
    });

    // Delete Task
    document.querySelectorAll('.delete-task-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.dataset.id;
        Modal.confirm('Delete Task', 'Remove this task from the checklist?', async () => {
          await DB.delete('shared_tasks', id);
          Toast.info('Task Removed', 'Removed from shared checklist.');
          this.refreshView();
        });
      });
    });

    // Delete Expense
    document.querySelectorAll('.delete-expense-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.dataset.id;
        Modal.confirm('Delete Expense', 'Remove this transaction from the joint ledger?', async () => {
          await DB.delete('shared_expenses', id);
          Toast.info('Expense Removed', 'Ledger balances recalculated.');
          this.refreshView();
        });
      });
    });

    // Add Event Modal
    const newEventBtn = document.getElementById('new-event-btn');
    if (newEventBtn) {
      newEventBtn.addEventListener('click', () => {
        const modalHtml = `
          <div class="flex flex-col gap-4">
            <div>
              <label class="form-label">Event Title</label>
              <input type="text" id="event-title" class="input-field" placeholder="e.g. Flight to Rome / Anniversary Dinner" />
            </div>
            <div class="flex gap-3">
              <div style="flex: 1;">
                <label class="form-label">Event Date</label>
                <input type="date" id="event-date" class="input-field" value="${new Date().toISOString().split('T')[0]}" />
              </div>
              <div style="flex: 1;">
                <label class="form-label">Category</label>
                <select id="event-category" class="input-field">
                  <option value="event">General Event</option>
                  <option value="travel">Travel & Flight</option>
                  <option value="anniversary">Anniversary</option>
                  <option value="birthday">Birthday</option>
                  <option value="reminder">Important Reminder</option>
                </select>
              </div>
            </div>
            <div>
              <label class="form-label">Description (Optional)</label>
              <textarea id="event-desc" class="input-field" rows="2" placeholder="Flight details, reservation numbers, notes..."></textarea>
            </div>
            <div class="flex justify-end gap-2">
              <button class="btn btn-secondary" onclick="window.Modal.close()">Cancel</button>
              <button class="btn btn-primary" id="save-event-btn">Save Event</button>
            </div>
          </div>
        `;
        Modal.show('Add Shared Event', modalHtml);

        setTimeout(() => {
          const saveBtn = document.getElementById('save-event-btn');
          if (saveBtn) {
            saveBtn.addEventListener('click', async () => {
              const title = document.getElementById('event-title').value.trim();
              const dateVal = document.getElementById('event-date').value;
              const category = document.getElementById('event-category').value;
              const desc = document.getElementById('event-desc').value.trim();

              if (!title) {
                Toast.error('Title Required', 'Please enter a title for the event.');
                return;
              }

              const currentUser = Auth.getCurrentUser();
              await DB.insert('calendar_events', {
                title,
                description: desc || '',
                start_time: new Date(dateVal).toISOString(),
                end_time: new Date(dateVal).toISOString(),
                is_all_day: true,
                category,
                created_by: currentUser ? currentUser.id : 'u1-auth-0000-0000-000000000001'
              });

              Modal.close();
              Toast.success('Event Added', 'Synchronized to our shared calendar.');
              this.refreshView();
            });
          }
        }, 50);
      });
    }

    // Add Task Modal
    const newTaskBtn = document.getElementById('new-task-btn');
    if (newTaskBtn) {
      newTaskBtn.addEventListener('click', () => {
        const modalHtml = `
          <div class="flex flex-col gap-4">
            <div>
              <label class="form-label">Task Title</label>
              <input type="text" id="task-title" class="input-field" placeholder="e.g. Renew passports / Buy travel adaptors" />
            </div>
            <div class="flex gap-3">
              <div style="flex: 1;">
                <label class="form-label">Due Date (Optional)</label>
                <input type="date" id="task-due-date" class="input-field" />
              </div>
              <div style="flex: 1;">
                <label class="form-label">Priority</label>
                <select id="task-priority" class="input-field">
                  <option value="medium">Medium Priority</option>
                  <option value="high">High Priority</option>
                  <option value="low">Low Priority</option>
                </select>
              </div>
            </div>
            <div class="flex justify-end gap-2">
              <button class="btn btn-secondary" onclick="window.Modal.close()">Cancel</button>
              <button class="btn btn-primary" id="save-task-btn">Add Task</button>
            </div>
          </div>
        `;
        Modal.show('Add Shared Task', modalHtml);

        setTimeout(() => {
          const saveBtn = document.getElementById('save-task-btn');
          if (saveBtn) {
            saveBtn.addEventListener('click', async () => {
              const title = document.getElementById('task-title').value.trim();
              const dueDate = document.getElementById('task-due-date').value;
              const priority = document.getElementById('task-priority').value;

              if (!title) {
                Toast.error('Title Required', 'Please enter a task title.');
                return;
              }

              const currentUser = Auth.getCurrentUser();
              await DB.insert('shared_tasks', {
                title,
                due_date: dueDate || null,
                priority,
                completed: false,
                created_by: currentUser ? currentUser.id : 'u1-auth-0000-0000-000000000001'
              });

              Modal.close();
              Toast.success('Task Added', 'Synced to shared checklist.');
              this.refreshView();
            });
          }
        }, 50);
      });
    }

    // Add Expense Modal
    const newExpenseBtn = document.getElementById('new-expense-btn');
    if (newExpenseBtn) {
      newExpenseBtn.addEventListener('click', () => {
        const currentUser = Auth.getCurrentUser();
        const currentUserId = currentUser ? currentUser.id : 'u1-auth-0000-0000-000000000001';

        const modalHtml = `
          <div class="flex flex-col gap-4">
            <div>
              <label class="form-label">Description / Item</label>
              <input type="text" id="expense-title" class="input-field" placeholder="e.g. Grocery run, Hotel booking, Dinner" />
            </div>
            <div class="flex gap-3">
              <div style="flex: 1;">
                <label class="form-label">Amount ($)</label>
                <input type="number" step="0.01" id="expense-amount" class="input-field" placeholder="0.00" />
              </div>
              <div style="flex: 1;">
                <label class="form-label">Paid By</label>
                <select id="expense-paid-by" class="input-field">
                  <option value="u1-auth-0000-0000-000000000001" ${currentUserId === 'u1-auth-0000-0000-000000000001' ? 'selected' : ''}>Gokul</option>
                  <option value="u2-auth-0000-0000-000000000002" ${currentUserId === 'u2-auth-0000-0000-000000000002' ? 'selected' : ''}>Sharanya</option>
                </select>
              </div>
            </div>
            <div class="flex gap-3">
              <div style="flex: 1;">
                <label class="form-label">Date</label>
                <input type="date" id="expense-date" class="input-field" value="${new Date().toISOString().split('T')[0]}" />
              </div>
              <div style="flex: 1;">
                <label class="form-label">Category</label>
                <select id="expense-category" class="input-field">
                  <option value="general">General</option>
                  <option value="food">Groceries & Food</option>
                  <option value="travel">Travel & Transit</option>
                  <option value="utilities">Utilities & Home</option>
                  <option value="entertainment">Entertainment</option>
                </select>
              </div>
            </div>
            <div class="flex justify-end gap-2">
              <button class="btn btn-secondary" onclick="window.Modal.close()">Cancel</button>
              <button class="btn btn-primary" id="save-expense-btn">Record Expense</button>
            </div>
          </div>
        `;
        Modal.show('Log Shared Expense', modalHtml);

        setTimeout(() => {
          const saveBtn = document.getElementById('save-expense-btn');
          if (saveBtn) {
            saveBtn.addEventListener('click', async () => {
              const title = document.getElementById('expense-title').value.trim();
              const amount = parseFloat(document.getElementById('expense-amount').value);
              const paidBy = document.getElementById('expense-paid-by').value;
              const dateVal = document.getElementById('expense-date').value;
              const category = document.getElementById('expense-category').value;

              if (!title || isNaN(amount) || amount <= 0) {
                Toast.error('Invalid Expense', 'Please enter a description and valid positive amount.');
                return;
              }

              await DB.insert('shared_expenses', {
                title,
                amount,
                currency: 'USD',
                category,
                paid_by: paidBy,
                expense_date: dateVal || new Date().toISOString().split('T')[0],
                split_ratio: '50/50'
              });

              Modal.close();
              Toast.success('Expense Logged', 'Balance updated automatically.');
              this.refreshView();
            });
          }
        }, 50);
      });
    }

    // Subscriptions
    if (!this.unsubscribeCalendar) {
      this.unsubscribeCalendar = DB.subscribe('calendar_events', () => this.refreshView());
    }
  },

  async refreshView() {
    if (typeof document === 'undefined') return;
    const main = document.getElementById('main-content');
    if (main && window.location.hash === '#together') {
      main.innerHTML = await this.render();
      this.mount();
    }
  },

  escapeHtml(text) {
    if (!text) return '';
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  },

  unmount() {
    if (this.unsubscribeCalendar) { this.unsubscribeCalendar(); this.unsubscribeCalendar = null; }
    if (this.unsubscribeTasks) { this.unsubscribeTasks(); this.unsubscribeTasks = null; }
    if (this.unsubscribeExpenses) { this.unsubscribeExpenses(); this.unsubscribeExpenses = null; }
  }
};
