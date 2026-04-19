/* ============================================================
   SkillSphere Lite - Application Logic
   ============================================================ */

// --- SUPABASE CONFIG ---
const SUPABASE_URL = 'https://izzfbzuhcglvcqiolrea.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml6emZienVoY2dsdmNxaW9scmVhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY1ODUxNzQsImV4cCI6MjA5MjE2MTE3NH0.PB9B47280MatjIiGhOIFvmrT6P_iEpA7tEgZAx2WK_s';

// Initialize the Supabase client
var db;
try {
  db = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
  console.log('Supabase client created successfully');
} catch (err) {
  console.error('Failed to create Supabase client:', err);
}

// --- TOAST NOTIFICATION ---
function showToast(message, type) {
  type = type || 'info';
  var container = document.getElementById('toast-container');
  if (!container) return;
  var toast = document.createElement('div');
  toast.className = 'toast toast--' + type;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(function () {
    toast.classList.add('toast--fade-out');
    setTimeout(function () {
      if (toast.parentNode) toast.parentNode.removeChild(toast);
    }, 400);
  }, 3000);
}

// --- ADD USER ---
async function addUser(name, skillsOffered, skillsWanted) {
  try {
    var result = await db
      .from('users')
      .insert([
        {
          name: name.trim(),
          skills_offered: skillsOffered.trim(),
          skills_wanted: skillsWanted.trim()
        }
      ])
      .select();

    if (result.error) {
      console.error('Insert error:', result.error);
      showToast('Failed to add user: ' + result.error.message, 'error');
      return null;
    }

    showToast(name + ' added successfully!', 'success');
    return result.data;
  } catch (err) {
    console.error('addUser exception:', err);
    showToast('Error adding user. Check console.', 'error');
    return null;
  }
}

// --- GET ALL USERS ---
async function getUsers() {
  try {
    var result = await db
      .from('users')
      .select('*')
      .order('id', { ascending: false });

    if (result.error) {
      console.error('Fetch error:', result.error);
      showToast('Failed to fetch users: ' + result.error.message, 'error');
      return [];
    }

    return result.data || [];
  } catch (err) {
    console.error('getUsers exception:', err);
    return [];
  }
}

// --- PARSE SKILLS ---
function parseSkills(str) {
  if (!str) return [];
  return str
    .split(',')
    .map(function (s) { return s.trim().toLowerCase(); })
    .filter(function (s) { return s.length > 0; });
}

// --- FIND MATCHES ---
function findMatches(users) {
  var matches = [];
  for (var i = 0; i < users.length; i++) {
    for (var j = 0; j < users.length; j++) {
      if (i === j) continue;
      var userA = users[i];
      var userB = users[j];
      var aOffered = parseSkills(userA.skills_offered);
      var bWanted = parseSkills(userB.skills_wanted);
      var overlapping = aOffered.filter(function (skill) {
        return bWanted.indexOf(skill) >= 0;
      });
      if (overlapping.length > 0) {
        matches.push({
          teacher: userA,
          learner: userB,
          matchedSkills: overlapping
        });
      }
    }
  }
  return matches;
}

// --- GET INITIALS ---
function getInitials(name) {
  return name
    .split(' ')
    .map(function (w) { return w[0]; })
    .join('')
    .toUpperCase()
    .substring(0, 2);
}

// --- CREATE USER CARD ---
function createUserCard(user) {
  var card = document.createElement('div');
  card.className = 'glass-card user-card';

  var offeredTags = parseSkills(user.skills_offered)
    .map(function (s) { return '<span class="tag tag--offered">' + s + '</span>'; })
    .join('');

  var wantedTags = parseSkills(user.skills_wanted)
    .map(function (s) { return '<span class="tag tag--wanted">' + s + '</span>'; })
    .join('');

  card.innerHTML =
    '<div class="card-name">' +
      '<span class="avatar">' + getInitials(user.name) + '</span>' +
      user.name +
    '</div>' +
    '<div class="skill-section">' +
      '<div class="skill-label">Can Teach</div>' +
      '<div class="skill-tags">' + (offeredTags || '<span class="tag" style="opacity:0.4">None</span>') + '</div>' +
    '</div>' +
    '<div class="skill-section">' +
      '<div class="skill-label">Wants to Learn</div>' +
      '<div class="skill-tags">' + (wantedTags || '<span class="tag" style="opacity:0.4">None</span>') + '</div>' +
    '</div>';

  return card;
}

// --- CREATE MATCH CARD ---
function createMatchCard(match) {
  var card = document.createElement('div');
  card.className = 'glass-card match-card';

  var skillTags = match.matchedSkills
    .map(function (s) { return '<span class="tag tag--match">' + s + '</span>'; })
    .join('');

  card.innerHTML =
    '<div class="match-header">' +
      '<div class="match-person">' +
        '<span class="avatar">' + getInitials(match.teacher.name) + '</span>' +
        match.teacher.name +
      '</div>' +
      '<span class="match-arrow">&rarr;</span>' +
      '<div class="match-person">' +
        '<span class="avatar">' + getInitials(match.learner.name) + '</span>' +
        match.learner.name +
      '</div>' +
      '<span class="match-badge">Match</span>' +
    '</div>' +
    '<p class="match-skills-line">' +
      '<strong>' + match.teacher.name + '</strong> can teach' +
    '</p>' +
    '<div class="skill-tags" style="margin-top:8px;">' +
      skillTags +
    '</div>' +
    '<p class="match-skills-line" style="margin-top:8px;">' +
      'to <strong>' + match.learner.name + '</strong>' +
    '</p>';

  return card;
}

// --- RENDER ALL USERS AND MATCHES ---
async function renderAll() {
  try {
    var usersGrid = document.getElementById('users-grid');
    var matchesGrid = document.getElementById('matches-grid');

    // Fetch users
    var users = await getUsers();
    console.log('Fetched ' + users.length + ' users');

    // Render user cards
    usersGrid.innerHTML = '';
    if (users.length === 0) {
      usersGrid.innerHTML = '<p class="empty-state">No members yet. Be the first to join!</p>';
    } else {
      users.forEach(function (user) {
        usersGrid.appendChild(createUserCard(user));
      });
    }

    // Compute matches
    var matches = findMatches(users);
    console.log('Found ' + matches.length + ' matches');

    // Render match cards
    matchesGrid.innerHTML = '';
    if (matches.length === 0) {
      matchesGrid.innerHTML = '<p class="empty-state">No matches found yet. Add more members to see matches!</p>';
    } else {
      matches.forEach(function (match) {
        matchesGrid.appendChild(createMatchCard(match));
      });
    }
  } catch (err) {
    console.error('renderAll error:', err);
  }
}

// --- INITIALIZE APP ---
// Wait for the DOM to be fully ready before attaching event listeners
document.addEventListener('DOMContentLoaded', function () {
  console.log('DOM loaded, initializing SkillSphere...');

  var userForm = document.getElementById('user-form');
  var inputName = document.getElementById('input-name');
  var inputOffered = document.getElementById('input-offered');
  var inputWanted = document.getElementById('input-wanted');
  var btnSubmit = document.getElementById('btn-submit');
  var btnRefresh = document.getElementById('btn-refresh');

  if (!userForm) {
    console.error('user-form element not found!');
    return;
  }

  // Handle form submission
  userForm.addEventListener('submit', async function (e) {
    e.preventDefault();
    console.log('Form submitted');

    var name = inputName.value;
    var offered = inputOffered.value;
    var wanted = inputWanted.value;

    if (!name.trim() || !offered.trim() || !wanted.trim()) {
      showToast('Please fill in all fields.', 'error');
      return;
    }

    // Show loading state
    var btnText = btnSubmit.querySelector('.btn-text');
    var btnLoader = btnSubmit.querySelector('.btn-loader');
    if (btnText) btnText.hidden = true;
    if (btnLoader) btnLoader.hidden = false;
    btnSubmit.disabled = true;

    // Insert user
    var result = await addUser(name, offered, wanted);

    // Reset loading state
    if (btnText) btnText.hidden = false;
    if (btnLoader) btnLoader.hidden = true;
    btnSubmit.disabled = false;

    if (result) {
      userForm.reset();
      await renderAll();
    }
  });

  // Refresh button
  if (btnRefresh) {
    btnRefresh.addEventListener('click', async function () {
      btnRefresh.textContent = 'Loading...';
      btnRefresh.disabled = true;
      await renderAll();
      btnRefresh.textContent = 'Refresh';
      btnRefresh.disabled = false;
      showToast('User list refreshed!', 'info');
    });
  }

  // Initial load
  renderAll();

  console.log('SkillSphere initialized successfully');
});
