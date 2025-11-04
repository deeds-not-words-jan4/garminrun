// Register Service Worker for PWA
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/service-worker.js')
            .then((registration) => {
                console.log('Service Worker registered:', registration);
            })
            .catch((error) => {
                console.log('Service Worker registration failed:', error);
            });
    });
}

// DOM Elements
const loginSection = document.getElementById('login-section');
const calendarSection = document.getElementById('calendar-section');
const loginForm = document.getElementById('login-form');
const loginError = document.getElementById('login-error');
const loading = document.getElementById('loading');
const calendarGrid = document.getElementById('calendar-grid');
const calendarMonthYear = document.getElementById('calendar-month-year');
const prevMonthBtn = document.getElementById('prev-month-btn');
const nextMonthBtn = document.getElementById('next-month-btn');
const activityDetailModal = document.getElementById('activity-detail-modal');
const activityDetail = document.getElementById('activity-detail');
const modalClose = document.querySelector('.modal-close');

let tokens = null; // Store OAuth tokens
let allActivities = []; // Store all activities
let currentDate = new Date(); // Current calendar month

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
            tokens = data.tokens; // Store OAuth tokens
            localStorage.setItem('garminTokens', JSON.stringify(tokens)); // Persist tokens
            showCalendarSection();
            loadCalendarData();
        } else {
            loginError.textContent = data.error || 'ログインに失敗しました';
        }
    } catch (error) {
        loginError.textContent = 'ログインエラーが発生しました';
        console.error('Login error:', error);
    }
});

// Calendar navigation
prevMonthBtn.addEventListener('click', () => {
    currentDate.setMonth(currentDate.getMonth() - 1);
    renderCalendar();
});

nextMonthBtn.addEventListener('click', () => {
    currentDate.setMonth(currentDate.getMonth() + 1);
    renderCalendar();
});

// Modal close
modalClose.addEventListener('click', () => {
    activityDetailModal.style.display = 'none';
});

// Close modal when clicking outside
window.addEventListener('click', (e) => {
    if (e.target === activityDetailModal) {
        activityDetailModal.style.display = 'none';
    }
});

// Check session
async function checkSession() {
    // Check if we have stored tokens in localStorage
    const storedTokens = localStorage.getItem('garminTokens');
    if (storedTokens) {
        try {
            tokens = JSON.parse(storedTokens);
            // Verify the tokens are still valid by trying to load activities
            const response = await fetch(`/api/activities?start=0&limit=1&tokens=${encodeURIComponent(JSON.stringify(tokens))}`);
            const data = await response.json();
            if (data.success) {
                showCalendarSection();
                loadCalendarData();
                return;
            }
        } catch (error) {
            console.error('Session validation error:', error);
        }
    }
    // If no valid session, show login
    showLoginSection();
}

// Load calendar data (fetch last 90 days of activities)
async function loadCalendarData() {
    loading.style.display = 'block';

    try {
        // Fetch last 90 days of activities (about 3 months)
        const response = await fetch(`/api/activities?start=0&limit=100&tokens=${encodeURIComponent(JSON.stringify(tokens))}`);
        const data = await response.json();

        if (data.success) {
            allActivities = data.activities;
            renderCalendar();
        } else {
            console.error('Failed to fetch activities:', data.error);
        }
    } catch (error) {
        console.error('Error loading activities:', error);
    } finally {
        loading.style.display = 'none';
    }
}

// Render calendar
function renderCalendar() {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    // Update header
    calendarMonthYear.textContent = `${year}年 ${month + 1}月`;

    // Clear grid
    calendarGrid.innerHTML = '';

    // Add day headers
    const dayHeaders = ['日', '月', '火', '水', '木', '金', '土'];
    dayHeaders.forEach(day => {
        const header = document.createElement('div');
        header.className = 'calendar-day-header';
        header.textContent = day;
        calendarGrid.appendChild(header);
    });

    // Get first day of month and total days
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    // Group activities by date
    const activitiesByDate = {};
    allActivities.forEach(activity => {
        const date = new Date(activity.startTimeLocal);
        const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
        if (!activitiesByDate[dateStr]) {
            activitiesByDate[dateStr] = [];
        }
        activitiesByDate[dateStr].push(activity);
    });

    // Add previous month's trailing days
    for (let i = firstDay - 1; i >= 0; i--) {
        const day = daysInPrevMonth - i;
        const dayEl = createCalendarDay(day, year, month - 1, true, activitiesByDate);
        calendarGrid.appendChild(dayEl);
    }

    // Add current month's days
    for (let day = 1; day <= daysInMonth; day++) {
        const dayEl = createCalendarDay(day, year, month, false, activitiesByDate);
        calendarGrid.appendChild(dayEl);
    }

    // Add next month's leading days
    const totalCells = calendarGrid.children.length - 7; // Subtract day headers
    const remainingCells = 42 - totalCells; // 6 rows * 7 days
    for (let day = 1; day <= remainingCells; day++) {
        const dayEl = createCalendarDay(day, year, month + 1, true, activitiesByDate);
        calendarGrid.appendChild(dayEl);
    }
}

// Create calendar day cell
function createCalendarDay(day, year, month, isOtherMonth, activitiesByDate) {
    const dayEl = document.createElement('div');
    dayEl.className = 'calendar-day';
    if (isOtherMonth) {
        dayEl.classList.add('other-month');
    }

    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    if (dateStr === todayStr) {
        dayEl.classList.add('today');
    }

    // Check if there are activities on this day
    const dayActivities = activitiesByDate[dateStr] || [];
    let totalDistance = 0;
    let activityIcon = '';

    dayActivities.forEach(activity => {
        if (activity.distance) {
            totalDistance += activity.distance / 1000; // Convert to km
            // Get icon for first activity with distance
            if (!activityIcon && activity.activityType) {
                activityIcon = getActivityIcon(activity.activityType.typeKey);
            }
        }
    });

    dayEl.innerHTML = `
        <div class="calendar-day-number">${day}</div>
        ${totalDistance > 0 ? `<div class="calendar-day-distance">${activityIcon} ${totalDistance.toFixed(1)}km</div>` : ''}
    `;

    if (totalDistance > 0) {
        dayEl.classList.add('has-activity');
        dayEl.addEventListener('click', () => showActivityDetail(dateStr, dayActivities));
    }

    return dayEl;
}

// Get activity icon based on type
function getActivityIcon(typeKey) {
    if (!typeKey) return '🏃';

    const type = typeKey.toLowerCase();
    if (type.includes('running') || type.includes('run')) return '🏃';
    if (type.includes('walking') || type.includes('walk')) return '🚶';
    if (type.includes('cycling') || type.includes('bike')) return '🚴';
    if (type.includes('swimming') || type.includes('swim')) return '🏊';
    if (type.includes('hiking')) return '🥾';

    return '🏃'; // Default
}

// Show activity detail in modal
function showActivityDetail(dateStr, activities) {
    if (activities.length === 0) return;

    const date = new Date(dateStr);
    const dateDisplay = date.toLocaleDateString('ja-JP', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    let detailHTML = `<h2>${dateDisplay}</h2>`;

    activities.forEach(activity => {
        const distance = activity.distance ? (activity.distance / 1000).toFixed(2) : '0';
        const duration = formatDuration(activity.duration);
        const avgPace = calculatePace(activity.distance, activity.duration);
        const avgHR = activity.averageHR || 'N/A';
        const calories = activity.calories || '0';

        const startTime = new Date(activity.startTimeLocal);
        const timeStr = startTime.toLocaleTimeString('ja-JP', {
            hour: '2-digit',
            minute: '2-digit'
        });

        const effortLevel = calculateEffortLevel(activity);

        detailHTML += `
            <div class="activity-card">
                <div class="activity-header">
                    <div class="activity-title">${activity.activityName || 'アクティビティ'}</div>
                    <div class="activity-type">${activity.activityType?.typeKey || 'その他'}</div>
                </div>
                <div class="effort-badge" style="background: ${effortLevel.color};">
                    <span class="effort-emoji">${effortLevel.emoji}</span>
                    <span class="effort-message">${effortLevel.message}</span>
                </div>
                <div class="activity-date">${timeStr}</div>
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
            </div>
        `;
    });

    activityDetail.innerHTML = detailHTML;
    activityDetailModal.style.display = 'block';
}

// Format duration
function formatDuration(seconds) {
    if (!seconds) return '0:00';

    // Convert to integer to remove decimal places
    seconds = Math.floor(seconds);

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

// Calculate effort level (がんばり具合)
function calculateEffortLevel(activity) {
    let score = 0;

    // Distance score (0-30 points)
    const distanceKm = (activity.distance || 0) / 1000;
    if (distanceKm >= 15) score += 30;
    else if (distanceKm >= 10) score += 25;
    else if (distanceKm >= 5) score += 20;
    else if (distanceKm >= 3) score += 15;
    else if (distanceKm >= 1) score += 10;
    else score += 5;

    // Duration score (0-25 points)
    const durationMin = (activity.duration || 0) / 60;
    if (durationMin >= 90) score += 25;
    else if (durationMin >= 60) score += 20;
    else if (durationMin >= 45) score += 15;
    else if (durationMin >= 30) score += 10;
    else score += 5;

    // Heart rate score (0-25 points)
    const avgHR = activity.averageHR || 0;
    if (avgHR >= 170) score += 25;
    else if (avgHR >= 150) score += 20;
    else if (avgHR >= 130) score += 15;
    else if (avgHR >= 110) score += 10;
    else if (avgHR > 0) score += 5;

    // Pace score (0-20 points) - faster is better
    if (distanceKm > 0 && durationMin > 0) {
        const pace = durationMin / distanceKm; // min/km
        if (pace <= 4.5) score += 20;
        else if (pace <= 5.5) score += 15;
        else if (pace <= 6.5) score += 10;
        else if (pace <= 7.5) score += 5;
    }

    // Return emoji and message based on score
    if (score >= 80) return { emoji: '🔥🔥🔥', message: '超頑張った！', color: '#FF3333' };
    if (score >= 60) return { emoji: '🔥🔥', message: '頑張った！', color: '#FF6B6B' };
    if (score >= 40) return { emoji: '💪', message: '良い感じ！', color: '#FF8E53' };
    if (score >= 20) return { emoji: '😊', message: 'いい運動！', color: '#FFA500' };
    return { emoji: '🙂', message: '軽め', color: '#FFD93D' };
}

// Show login section
function showLoginSection() {
    loginSection.style.display = 'block';
    calendarSection.style.display = 'none';
}

// Show calendar section
function showCalendarSection() {
    loginSection.style.display = 'none';
    calendarSection.style.display = 'block';
}
