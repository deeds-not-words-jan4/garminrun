// DOM Elements
const loginSection = document.getElementById('login-section');
const activitiesSection = document.getElementById('activities-section');
const loginForm = document.getElementById('login-form');
const loginError = document.getElementById('login-error');
const activitiesList = document.getElementById('activities-list');
const loading = document.getElementById('loading');
const userInfo = document.getElementById('user-info');
const logoutBtn = document.getElementById('logout-btn');
const refreshBtn = document.getElementById('refresh-btn');
const loadMoreBtn = document.getElementById('load-more-btn');

let currentStart = 0;
const limit = 10;

// Check session status on load
checkSession();

// Login form submit
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    loginError.textContent = '';

    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    try {
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (data.success) {
            showActivitiesSection();
            loadActivities();
        } else {
            loginError.textContent = data.error || 'ログインに失敗しました';
        }
    } catch (error) {
        loginError.textContent = 'ログインエラーが発生しました';
        console.error('Login error:', error);
    }
});

// Logout
logoutBtn.addEventListener('click', async () => {
    try {
        await fetch('/api/logout', { method: 'POST' });
        showLoginSection();
        currentStart = 0;
        activitiesList.innerHTML = '';
    } catch (error) {
        console.error('Logout error:', error);
    }
});

// Refresh activities
refreshBtn.addEventListener('click', () => {
    currentStart = 0;
    activitiesList.innerHTML = '';
    loadActivities();
});

// Load more activities
loadMoreBtn.addEventListener('click', () => {
    currentStart += limit;
    loadActivities(true);
});

// Check session
async function checkSession() {
    try {
        const response = await fetch('/api/status');
        const data = await response.json();

        if (data.loggedIn) {
            showActivitiesSection();
            loadActivities();
        } else {
            showLoginSection();
        }
    } catch (error) {
        console.error('Session check error:', error);
        showLoginSection();
    }
}

// Load activities
async function loadActivities(append = false) {
    loading.style.display = 'block';

    try {
        const response = await fetch(`/api/activities?start=${currentStart}&limit=${limit}`);
        const data = await response.json();

        if (data.success) {
            displayActivities(data.activities, append);
        } else {
            console.error('Failed to fetch activities:', data.error);
        }
    } catch (error) {
        console.error('Error loading activities:', error);
    } finally {
        loading.style.display = 'none';
    }
}

// Display activities
function displayActivities(activities, append = false) {
    if (!append) {
        activitiesList.innerHTML = '';
    }

    activities.forEach(activity => {
        const card = createActivityCard(activity);
        activitiesList.appendChild(card);
    });
}

// Create activity card
function createActivityCard(activity) {
    const card = document.createElement('div');
    card.className = 'activity-card';

    const distance = activity.distance ? (activity.distance / 1000).toFixed(2) : '0';
    const duration = formatDuration(activity.duration);
    const avgPace = calculatePace(activity.distance, activity.duration);
    const avgHR = activity.averageHR || 'N/A';
    const calories = activity.calories || '0';

    const date = new Date(activity.startTimeLocal);
    const dateStr = date.toLocaleDateString('ja-JP', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });

    card.innerHTML = `
        <div class="activity-header">
            <div class="activity-title">${activity.activityName || 'アクティビティ'}</div>
            <div class="activity-type">${activity.activityType?.typeKey || 'その他'}</div>
        </div>
        <div class="activity-date">${dateStr}</div>
        <div class="activity-stats">
            <div class="stat">
                <span class="stat-value">${distance}</span>
                <span class="stat-label">距離 (km)</span>
            </div>
            <div class="stat">
                <span class="stat-value">${duration}</span>
                <span class="stat-label">時間</span>
            </div>
            <div class="stat">
                <span class="stat-value">${avgPace}</span>
                <span class="stat-label">平均ペース</span>
            </div>
            <div class="stat">
                <span class="stat-value">${avgHR}</span>
                <span class="stat-label">平均心拍数</span>
            </div>
            <div class="stat">
                <span class="stat-value">${calories}</span>
                <span class="stat-label">カロリー</span>
            </div>
        </div>
    `;

    return card;
}

// Format duration
function formatDuration(seconds) {
    if (!seconds) return '0:00';

    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
        return `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }
    return `${minutes}:${String(secs).padStart(2, '0')}`;
}

// Calculate pace (min/km)
function calculatePace(distance, duration) {
    if (!distance || !duration) return 'N/A';

    const distanceKm = distance / 1000;
    const durationMin = duration / 60;
    const pace = durationMin / distanceKm;

    const paceMin = Math.floor(pace);
    const paceSec = Math.floor((pace - paceMin) * 60);

    return `${paceMin}:${String(paceSec).padStart(2, '0')}`;
}

// Show login section
function showLoginSection() {
    loginSection.style.display = 'block';
    activitiesSection.style.display = 'none';
    userInfo.style.display = 'none';
}

// Show activities section
function showActivitiesSection() {
    loginSection.style.display = 'none';
    activitiesSection.style.display = 'block';
    userInfo.style.display = 'block';
}
