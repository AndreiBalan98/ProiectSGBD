// Configurare backend URL
const BACKEND_URL = 'http://localhost:3000';

// Elemente DOM
const usernameSpan = document.getElementById('username');
const logoutBtn = document.getElementById('logout-btn');
const eventsListDiv = document.getElementById('events-list');
const loadingDiv = document.getElementById('loading');
const noEventsDiv = document.getElementById('no-events');
const messageDiv = document.getElementById('message');

// Date utilizator
let currentUser = {
    id: null,
    username: null,
    role: null
};

// Date evenimente
let events = [];
let userRegistrations = [];

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
    
    // Încărcare evenimente
    await loadEvents();
}

// Încărcare evenimente
async function loadEvents() {
    try {
        showLoading(true);
        
        const response = await fetch(`${BACKEND_URL}/events`);
        
        if (response.ok) {
            events = await response.json();
            await loadUserRegistrations();
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

// Afișare evenimente
function displayEvents() {
    if (events.length === 0) {
        showNoEvents();
        return;
    }
    
    eventsListDiv.innerHTML = '';
    
    events.forEach(event => {
        const eventCard = createEventCard(event);
        eventsListDiv.appendChild(eventCard);
    });
    
    // Ascundere mesaj "no events"
    noEventsDiv.style.display = 'none';
}

// Creare card eveniment
function createEventCard(event) {
    const isRegistered = userRegistrations.some(reg => reg.event_id === event.id);
    const availableSpots = event.capacity - event.registered_count;
    const isFull = availableSpots <= 0;
    
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
                <strong>👤 Organizator:</strong> ${escapeHtml(event.organizer_name)}
            </div>
        </div>
        
        <div class="capacity-info ${isFull ? 'capacity-full' : ''}">
            ${event.registered_count}/${event.capacity} locuri ocupate
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
            await loadEvents();
            
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
            await loadEvents();
            
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
    await loadEvents();
}, 30000);