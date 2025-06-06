// Configurare backend URL
const BACKEND_URL = 'http://localhost:3000';

// Elemente DOM
const usernameSpan = document.getElementById('username');
const logoutBtn = document.getElementById('logout-btn');
const eventsListDiv = document.getElementById('events-list');
const loadingDiv = document.getElementById('loading');
const noEventsDiv = document.getElementById('no-events');
const messageDiv = document.getElementById('message');

// Elemente pentru evenimente populare
const popularEventsListDiv = document.getElementById('popular-events-list');
const popularLoadingDiv = document.getElementById('popular-loading');

// Elemente pentru filtrare și căutare
const categoryFilterSelect = document.getElementById('category-filter');
const searchFilterInput = document.getElementById('search-filter');

// Elemente pentru statistici categorii
const categoryStatsDiv = document.getElementById('category-stats');

// Date utilizator
let currentUser = {
    id: null,
    username: null,
    role: null
};

// Date evenimente și categorii
let events = [];
let popularEvents = [];
let categories = [];
let userRegistrations = [];
let filteredEvents = [];

// Inițializare pagină
window.addEventListener('load', () => {
    initializePage();
});

// Verificare autentificare și inițializare
async function initializePage() {
    // Verificare autentificare
    const userId = window.localStorage.getItem('id_user');
    const username = window.localStorage.getItem('username');
    const role = window.localStorage.getItem('role');
    
    if (!userId || !username || role !== 'user') {
        window.location.href = 'login.html';
        return;
    }
    
    // Setare date utilizator
    currentUser = {
        id: parseInt(userId),
        username: username,
        role: role
    };
    
    // Afișare nume utilizator
    usernameSpan.textContent = username;
    
    // Încărcare date
    await Promise.all([
        loadCategories(),
        loadEvents(),
        loadPopularEvents()
    ]);
    
    // Setup event listeners pentru filtrare
    setupFilters();
    
    // Încărcare statistici categorii
    await loadCategoryStats();
}

// Încărcare categorii
async function loadCategories() {
    try {
        const response = await fetch(`${BACKEND_URL}/categories`);
        
        if (response.ok) {
            categories = await response.json();
            populateCategoryFilter();
        } else {
            console.error('Eroare la încărcarea categoriilor');
            categories = [];
        }
        
    } catch (error) {
        console.error('Eroare la încărcarea categoriilor:', error);
        categories = [];
    }
}

// Populare filtru categorii
function populateCategoryFilter() {
    // Curățare opțiuni existente (păstrând prima opțiune)
    categoryFilterSelect.innerHTML = '<option value="">Toate categoriile</option>';
    
    categories.forEach(category => {
        const option = document.createElement('option');
        option.value = category.id;
        option.textContent = category.name;
        categoryFilterSelect.appendChild(option);
    });
}

// Încărcare evenimente populare
async function loadPopularEvents() {
    try {
        showPopularLoading(true);
        
        const response = await fetch(`${BACKEND_URL}/events/popular`);
        
        if (response.ok) {
            popularEvents = await response.json();
            displayPopularEvents();
        } else {
            // Dacă nu există endpoint pentru evenimente populare, folosim primele 3 evenimente cu cei mai mulți participanți
            const sortedEvents = events
                .filter(event => event.status === 'published')
                .sort((a, b) => (b.registered_count || 0) - (a.registered_count || 0))
                .slice(0, 3);
            popularEvents = sortedEvents;
            displayPopularEvents();
        }
        
    } catch (error) {
        console.error('Eroare la încărcarea evenimentelor populare:', error);
        popularEventsListDiv.innerHTML = '<p class="error-text">Eroare la încărcarea evenimentelor populare</p>';
    } finally {
        showPopularLoading(false);
    }
}

// Afișare evenimente populare
function displayPopularEvents() {
    if (popularEvents.length === 0) {
        popularEventsListDiv.innerHTML = '<p class="no-events-text">Nu există evenimente populare momentan.</p>';
        return;
    }
    
    popularEventsListDiv.innerHTML = '';
    
    popularEvents.forEach((event, index) => {
        const eventCard = createPopularEventCard(event, index + 1);
        popularEventsListDiv.appendChild(eventCard);
    });
}

// Creare card pentru eveniment popular
function createPopularEventCard(event, rank) {
    const isRegistered = userRegistrations.some(reg => reg.event_id === event.id);
    const availableSpots = event.capacity - (event.registered_count || 0);
    const isFull = availableSpots <= 0;
    
    const eventCard = document.createElement('div');
    eventCard.className = 'event-card popular-event-card';
    
    eventCard.innerHTML = `
        <div class="popular-rank">#${rank}</div>
        <div class="event-title">${escapeHtml(event.title)}</div>
        
        <div class="event-info">
            <div class="event-info-item">
                <strong>📅 Data:</strong> ${formatDate(event.date)}
            </div>
            <div class="event-info-item">
                <strong>📍 Locația:</strong> ${escapeHtml(event.location)}
            </div>
            <div class="event-info-item">
                <strong>👤 Organizator:</strong> ${escapeHtml(event.organizer_name || 'N/A')}
            </div>
            <div class="event-info-item">
                <strong>👥 Participanți:</strong> ${event.registered_count || 0}
            </div>
        </div>
        
        <div class="capacity-info ${isFull ? 'capacity-full' : ''}">
            ${event.registered_count || 0}/${event.capacity} locuri ocupate
            ${isFull ? '(COMPLET)' : `(${availableSpots} locuri disponibile)`}
        </div>
        
        ${event.description ? `<div class="event-description">${escapeHtml(event.description)}</div>` : ''}
        
        <div class="event-actions">
            ${isRegistered ? 
                `<button class="btn btn-danger btn-small" onclick="unregisterFromEvent(${event.id})">
                    Renunță
                </button>` : 
                `<button class="btn btn-success btn-small" 
                    onclick="registerForEvent(${event.id})" 
                    ${isFull ? 'disabled' : ''}>
                    ${isFull ? 'Complet' : 'Înscrie-te'}
                </button>`
            }
        </div>
    `;
    
    return eventCard;
}

// Încărcare evenimente
async function loadEvents() {
    try {
        showLoading(true);
        
        const response = await fetch(`${BACKEND_URL}/events`);
        
        if (response.ok) {
            events = await response.json();
            // Filtrăm doar evenimentele publicate
            events = events.filter(event => event.status === 'published');
            await loadUserRegistrations();
            filteredEvents = [...events];
            displayEvents();
        } else {
            throw new Error('Eroare la încărcarea evenimentelor');
        }
        
    } catch (error) {
        console.error('Eroare la încărcarea evenimentelor:', error);
        showMessage('Eroare la încărcarea evenimentelor!', 'error');
        showNoEvents();
    } finally {
        showLoading(false);
    }
}

// Încărcare înregistrări utilizator
async function loadUserRegistrations() {
    try {
        const response = await fetch(`${BACKEND_URL}/user/registrations?userId=${currentUser.id}`);
        
        if (response.ok) {
            userRegistrations = await response.json();
        } else {
            userRegistrations = [];
        }
        
    } catch (error) {
        console.error('Eroare la încărcarea înregistrărilor:', error);
        userRegistrations = [];
    }
}

// Setup filtre și căutare
function setupFilters() {
    // Event listener pentru filtru categorie
    categoryFilterSelect.addEventListener('change', applyFilters);
    
    // Event listener pentru căutare (cu debounce)
    let searchTimeout;
    searchFilterInput.addEventListener('input', () => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(applyFilters, 300);
    });
}

// Aplicare filtre
function applyFilters() {
    const selectedCategory = categoryFilterSelect.value;
    const searchTerm = searchFilterInput.value.toLowerCase().trim();
    
    filteredEvents = events.filter(event => {
        // Filtru categorie
        const categoryMatch = !selectedCategory || event.category_id == selectedCategory;
        
        // Filtru căutare (titlu sau locație)
        const searchMatch = !searchTerm || 
            event.title.toLowerCase().includes(searchTerm) ||
            event.location.toLowerCase().includes(searchTerm);
        
        return categoryMatch && searchMatch;
    });
    
    displayEvents();
}

// Afișare evenimente
function displayEvents() {
    if (filteredEvents.length === 0) {
        showNoEvents();
        return;
    }
    
    eventsListDiv.innerHTML = '';
    
    filteredEvents.forEach(event => {
        const eventCard = createEventCard(event);
        eventsListDiv.appendChild(eventCard);
    });
    
    // Ascundere mesaj "no events"
    noEventsDiv.style.display = 'none';
}

// Creare card eveniment
function createEventCard(event) {
    const isRegistered = userRegistrations.some(reg => reg.event_id === event.id);
    const availableSpots = event.capacity - (event.registered_count || 0);
    const isFull = availableSpots <= 0;
    
    // Găsire nume categorie
    const category = categories.find(cat => cat.id === event.category_id);
    const categoryName = category ? category.name : 'N/A';
    
    const eventCard = document.createElement('div');
    eventCard.className = 'event-card';
    
    eventCard.innerHTML = `
        <div class="event-title">${escapeHtml(event.title)}</div>
        
        <div class="event-info">
            <div class="event-info-item">
                <strong>📅 Data:</strong> ${formatDate(event.date)}
            </div>
            <div class="event-info-item">
                <strong>📍 Locația:</strong> ${escapeHtml(event.location)}
            </div>
            <div class="event-info-item">
                <strong>🏷️ Categorie:</strong> ${escapeHtml(categoryName)}
            </div>
            <div class="event-info-item">
                <strong>👤 Organizator:</strong> ${escapeHtml(event.organizer_name || 'N/A')}
            </div>
        </div>
        
        <div class="capacity-info ${isFull ? 'capacity-full' : ''}">
            ${event.registered_count || 0}/${event.capacity} locuri ocupate
            ${isFull ? '(COMPLET)' : `(${availableSpots} locuri disponibile)`}
        </div>
        
        ${event.description ? `<div class="event-description">${escapeHtml(event.description)}</div>` : ''}
        
        <div class="event-actions">
            ${isRegistered ? 
                `<button class="btn btn-danger btn-small" onclick="unregisterFromEvent(${event.id})">
                    Renunță
                </button>` : 
                `<button class="btn btn-success btn-small" 
                    onclick="registerForEvent(${event.id})" 
                    ${isFull ? 'disabled' : ''}>
                    ${isFull ? 'Complet' : 'Înscrie-te'}
                </button>`
            }
        </div>
    `;
    
    return eventCard;
}

// Încărcare statistici categorii
async function loadCategoryStats() {
    try {
        const response = await fetch(`${BACKEND_URL}/categories/stats`);
        
        if (response.ok) {
            const stats = await response.json();
            displayCategoryStats(stats);
        } else {
            // Calculare statistici locale dacă nu există endpoint
            const localStats = calculateLocalCategoryStats();
            displayCategoryStats(localStats);
        }
        
    } catch (error) {
        console.error('Eroare la încărcarea statisticilor:', error);
        const localStats = calculateLocalCategoryStats();
        displayCategoryStats(localStats);
    }
}

// Calculare statistici locale pentru categorii
function calculateLocalCategoryStats() {
    const stats = categories.map(category => {
        const categoryEvents = events.filter(event => event.category_id === category.id);
        const totalRegistrations = categoryEvents.reduce((sum, event) => sum + (event.registered_count || 0), 0);
        
        return {
            category_name: category.name,
            total_events: categoryEvents.length,
            total_registrations: totalRegistrations,
            avg_registrations: categoryEvents.length > 0 ? (totalRegistrations / categoryEvents.length).toFixed(1) : 0
        };
    });
    
    return stats.filter(stat => stat.total_events > 0);
}

// Afișare statistici categorii
function displayCategoryStats(stats) {
    if (stats.length === 0) {
        categoryStatsDiv.innerHTML = '<p class="no-stats-text">Nu există statistici disponibile.</p>';
        return;
    }
    
    categoryStatsDiv.innerHTML = '';
    
    stats.forEach(stat => {
        const statCard = document.createElement('div');
        statCard.className = 'category-stat-card';
        
        statCard.innerHTML = `
            <div class="stat-category-name">${escapeHtml(stat.category_name)}</div>
            <div class="stat-details">
                <div class="stat-item">
                    <span class="stat-label">Evenimente:</span>
                    <span class="stat-value">${stat.total_events}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Total înscrieri:</span>
                    <span class="stat-value">${stat.total_registrations}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Medie înscrieri:</span>
                    <span class="stat-value">${stat.avg_registrations}</span>
                </div>
            </div>
        `;
        
        categoryStatsDiv.appendChild(statCard);
    });
}

// Înregistrare la eveniment
async function registerForEvent(eventId) {
    try {
        showMessage('Se procesează înregistrarea...', 'info');
        
        const response = await fetch(`${BACKEND_URL}/register/${eventId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                userId: currentUser.id
            })
        });
        
        const result = await response.json();
        
        if (response.ok) {
            showMessage('Te-ai înregistrat cu succes la eveniment!', 'success');
            
            // Reîncărcare evenimente pentru actualizare
            await Promise.all([
                loadEvents(),
                loadPopularEvents()
            ]);
            
        } else {
            showMessage(result.message || 'Eroare la înregistrare!', 'error');
        }
        
    } catch (error) {
        console.error('Eroare la înregistrare:', error);
        showMessage('Eroare de conexiune la server!', 'error');
    }
}

// Renunțare la eveniment
async function unregisterFromEvent(eventId) {
    if (!confirm('Ești sigur că vrei să renunți la acest eveniment?')) {
        return;
    }
    
    try {
        showMessage('Se procesează renunțarea...', 'info');
        
        const response = await fetch(`${BACKEND_URL}/unregister/${eventId}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                userId: currentUser.id
            })
        });
        
        const result = await response.json();
        
        if (response.ok) {
            showMessage('Ai renunțat cu succes la eveniment!', 'success');
            
            // Reîncărcare evenimente pentru actualizare
            await Promise.all([
                loadEvents(),
                loadPopularEvents()
            ]);
            
        } else {
            showMessage(result.message || 'Eroare la renunțare!', 'error');
        }
        
    } catch (error) {
        console.error('Eroare la renunțare:', error);
        showMessage('Eroare de conexiune la server!', 'error');
    }
}

// Logout
logoutBtn.addEventListener('click', () => {
    if (confirm('Ești sigur că vrei să te deconectezi?')) {
        window.localStorage.removeItem('id_user');
        window.localStorage.removeItem('username');
        window.localStorage.removeItem('role');
        window.location.href = 'login.html';
    }
});

// Funcții utilitare
function showLoading(show) {
    loadingDiv.style.display = show ? 'block' : 'none';
}

function showPopularLoading(show) {
    popularLoadingDiv.style.display = show ? 'block' : 'none';
}

function showNoEvents() {
    eventsListDiv.innerHTML = '';
    noEventsDiv.style.display = 'block';
}

function showMessage(text, type = 'info') {
    messageDiv.textContent = text;
    messageDiv.className = `message ${type}`;
    messageDiv.style.display = 'block';
    
    // Ascundere automată după 5 secunde
    setTimeout(() => {
        hideMessage();
    }, 5000);
}

function hideMessage() {
    messageDiv.style.display = 'none';
    messageDiv.className = 'message';
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleString('ro-RO', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Actualizare automată la fiecare 30 de secunde
setInterval(async () => {
    await Promise.all([
        loadEvents(),
        loadPopularEvents()
    ]);
}, 30000);