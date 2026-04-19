/* ============================================================
   SkillSphere Lite — Application Logic
   ============================================================
   This file handles:
     1. Supabase connection
     2. addUser()    — insert a new user into the database
     3. getUsers()   — fetch all users
     4. findMatches() — match users by skills
     5. UI rendering & toast notifications
   ============================================================ */

// ─────────────────────────────────────────────
// 🔑 SUPABASE CONFIG
// Replace the values below with your own Supabase project credentials.
// You can find them at: https://app.supabase.com → Settings → API
// ─────────────────────────────────────────────
const SUPABASE_URL = 'https://izzfbzuhcglvcqiolrea.supabase.co';       // e.g. https://xyzabc.supabase.co
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml6emZienVoY2dsdmNxaW9scmVhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY1ODUxNzQsImV4cCI6MjA5MjE2MTE3NH0.PB9B47280MatjIiGhOIFvmrT6P_iEpA7tEgZAx2WK_s';  // e.g. eyJhbGci...

// Initialize the Supabase client
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// ─────────────────────────────────────────────
// DOM Element References
// ─────────────────────────────────────────────
const userForm = document.getElementById('user-form');
const inputName = document.getElementById('input-name');
const inputOffered = document.getElementById('input-offered');
const inputWanted = document.getElementById('input-wanted');
const btnSubmit = document.getElementById('btn-submit');
const btnRefresh = document.getElementById('btn-refresh');
const usersGrid = document.getElementById('users-grid');
const matchesGrid = document.getElementById('matches-grid');
const usersEmpty = document.getElementById('users-empty');
const matchesEmpty = document.getElementById('matches-empty');

// ─────────────────────────────────────────────
// 🔔 TOAST NOTIFICATION
// ─────────────────────────────────────────────

/**
 * Show a small toast notification at the bottom-right of the screen.
 * @param {string} message - The message to display
 * @param {'success'|'error'|'info'} type - The visual type
 */
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast toast--${type}`;
  toast.textContent = message;
  container.appendChild(toast);

  // Auto-remove after 3 seconds
  setTimeout(() => {
    toast.classList.add('toast--fade-out');
    toast.addEventListener('animationend', () => toast.remove());
  }, 3000);
}

// ─────────────────────────────────────────────
// 📝 ADD USER
// Inserts a new user into the Supabase `users` table.
// ─────────────────────────────────────────────

async function addUser(name, skillsOffered, skillsWanted) {
  const { data, error } = await supabase
    .from('users')
    .insert([
      {
        name: name.trim(),
        skills_offered: skillsOffered.trim(),
        skills_wanted: skillsWanted.trim(),
      }
    ])
    .select();           // return the inserted row

  if (error) {
    console.error('Supabase insert error:', error);
    showToast('Failed to add user. Check console for details.', 'error');
    return null;
  }

  showToast(`${name} added successfully!`, 'success');
  return data;
}

// ─────────────────────────────────────────────
// 📥 GET ALL USERS
// Fetches every row from the `users` table.
// ─────────────────────────────────────────────

async function getUsers() {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .order('id', { ascending: false });

  if (error) {
    console.error('Supabase fetch error:', error);
    showToast('Failed to fetch users.', 'error');
    return [];
  }

  return data || [];
}

// ─────────────────────────────────────────────
// 🤝 FIND MATCHES
// For each pair of users, check if user A's offered skills
// include any of user B's wanted skills (and vice versa).
// Returns an array of match objects.
// ─────────────────────────────────────────────

/**
 * Parse a comma-separated string into a cleaned array of lowercase skill strings.
 */
function parseSkills(str) {
  if (!str) return [];
  return str
    .split(',')
    .map(s => s.trim().toLowerCase())
    .filter(s => s.length > 0);
}

/**
 * Find all skill matches among a list of users.
 * A "match" means: user A offers a skill that user B wants.
 * We avoid duplicate pairs (A→B and B→A are listed separately only if both directions match).
 */
function findMatches(users) {
  const matches = [];

  for (let i = 0; i < users.length; i++) {
    for (let j = 0; j < users.length; j++) {
      // Skip comparing a user with themselves
      if (i === j) continue;

      const userA = users[i];
      const userB = users[j];

      const aOffered = parseSkills(userA.skills_offered);
      const bWanted = parseSkills(userB.skills_wanted);

      // Find overlapping skills: what A offers that B wants
      const overlapping = aOffered.filter(skill => bWanted.includes(skill));

      if (overlapping.length > 0) {
        matches.push({
          teacher: userA,
          learner: userB,
          matchedSkills: overlapping,
        });
      }
    }
  }

  return matches;
}

// ─────────────────────────────────────────────
// 🎨 RENDERING HELPERS
// ─────────────────────────────────────────────

/**
 * Get initials from a name for the avatar circle.
 */
function getInitials(name) {
  return name
    .split(' ')
    .map(w => w[0])
    .join('')
    .toUpperCase()
    .substring(0, 2);
}

/**
 * Create a single user card element.
 */
function createUserCard(user) {
  const card = document.createElement('div');
  card.className = 'glass-card user-card';

  const offeredTags = parseSkills(user.skills_offered)
    .map(s => `<span class="tag tag--offered">${s}</span>`)
    .join('');

  const wantedTags = parseSkills(user.skills_wanted)
    .map(s => `<span class="tag tag--wanted">${s}</span>`)
    .join('');

  card.innerHTML = `
    <div class="card-name">
      <span class="avatar">${getInitials(user.name)}</span>
      ${user.name}
    </div>
    <div class="skill-section">
      <div class="skill-label">Can Teach</div>
      <div class="skill-tags">${offeredTags || '<span class="tag" style="opacity:0.4">None</span>'}</div>
    </div>
    <div class="skill-section">
      <div class="skill-label">Wants to Learn</div>
      <div class="skill-tags">${wantedTags || '<span class="tag" style="opacity:0.4">None</span>'}</div>
    </div>
  `;

  return card;
}

/**
 * Create a match card showing teacher → learner with matched skills.
 */
function createMatchCard(match) {
  const card = document.createElement('div');
  card.className = 'glass-card match-card';

  const skillTags = match.matchedSkills
    .map(s => `<span class="tag tag--match">${s}</span>`)
    .join('');

  card.innerHTML = `
    <div class="match-header">
      <div class="match-person">
        <span class="avatar">${getInitials(match.teacher.name)}</span>
        ${match.teacher.name}
      </div>
      <span class="match-arrow">→</span>
      <div class="match-person">
        <span class="avatar">${getInitials(match.learner.name)}</span>
        ${match.learner.name}
      </div>
      <span class="match-badge">Match</span>
    </div>
    <p class="match-skills-line">
      <strong>${match.teacher.name}</strong> can teach
    </p>
    <div class="skill-tags" style="margin-top:8px;">
      ${skillTags}
    </div>
    <p class="match-skills-line" style="margin-top:8px;">
      to <strong>${match.learner.name}</strong>
    </p>
  `;

  return card;
}

// ─────────────────────────────────────────────
// 🔄 RENDER ALL USERS & MATCHES
// ─────────────────────────────────────────────

async function renderAll() {
  // 1. Fetch users
  const users = await getUsers();

  // 2. Render user cards
  usersGrid.innerHTML = '';
  if (users.length === 0) {
    usersGrid.appendChild(usersEmpty.cloneNode(true));
  } else {
    users.forEach(user => {
      usersGrid.appendChild(createUserCard(user));
    });
  }

  // 3. Compute matches
  const matches = findMatches(users);

  // 4. Render match cards
  matchesGrid.innerHTML = '';
  if (matches.length === 0) {
    matchesGrid.appendChild(matchesEmpty.cloneNode(true));
  } else {
    matches.forEach(match => {
      matchesGrid.appendChild(createMatchCard(match));
    });
  }
}

// ─────────────────────────────────────────────
// 📡 EVENT LISTENERS
// ─────────────────────────────────────────────

// Handle form submission
userForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const name = inputName.value;
  const offered = inputOffered.value;
  const wanted = inputWanted.value;

  // Basic validation
  if (!name.trim() || !offered.trim() || !wanted.trim()) {
    showToast('Please fill in all fields.', 'error');
    return;
  }

  // Show loading state
  btnSubmit.querySelector('.btn-text').hidden = true;
  btnSubmit.querySelector('.btn-loader').hidden = false;
  btnSubmit.disabled = true;

  // Insert user
  const result = await addUser(name, offered, wanted);

  // Reset loading state
  btnSubmit.querySelector('.btn-text').hidden = false;
  btnSubmit.querySelector('.btn-loader').hidden = true;
  btnSubmit.disabled = false;

  if (result) {
    // Clear the form
    userForm.reset();
    // Refresh the lists
    await renderAll();
  }
});

// Refresh button
btnRefresh.addEventListener('click', async () => {
  btnRefresh.textContent = '⟳ Loading…';
  btnRefresh.disabled = true;
  await renderAll();
  btnRefresh.textContent = '⟳ Refresh';
  btnRefresh.disabled = false;
  showToast('User list refreshed!', 'info');
});

// ─────────────────────────────────────────────
// 🚀 INITIAL LOAD
// ─────────────────────────────────────────────

// Load users and matches when the page first loads
renderAll();
