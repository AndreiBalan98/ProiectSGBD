// Configurare backend URL
const BACKEND_URL = 'http://localhost:3000';

// Elemente DOM
const usernameSpan = document.getElementById('username');
const logoutBtn = document.getElementById('logout-btn');
const createEventForm = document.getElementById('create-event-form');
const editEventForm = document.getElementById('edit-event-form');
const eventsListDiv = document.getElementById('events-list');
const loadingDiv = document.getElementById('loading');
const noEventsDiv = document.getElementById('no-events');
const messageDiv = document.getElementById('message');
const editModal = document.getElementById('edit-modal');
const closeModalBtn = document.querySelector('.close');
const cancelEditBtn = document.getElementById('cancel-edit');

// Date utilizator
let currentAdmin = {
    id: null,
    username: null,
    role: null
};

// Date evenimente
let adminEvents = [];

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
    
    if (!userId || !username || role !== 'admin') {
        window.location.href = 'login.html';
        return;
    }
    
    // Setare date admin
    currentAdmin = {
        id: parseInt(userId),
        username: username,
        role: role
    };
    
    // Afișare nume admin
    usernameSpan.textContent = username;
    
    // Setare data minimă pentru formulare (astăzi)
    const today = new Date();
    const todayString = today.toISOString().slice(0, 16);
    document.getElementById('event-date').min = todayString;
    document.getElementById('edit-event-date').min = todayString;
    
    // Încărcare evenimente admin
    await loadAdminEvents();
}

// Încărcare evenimente admin
async function loadAdminEvents() {
    try {
        showLoading(true);
        
        const response = await fetch(`${BACKEND_URL}/admin/events?adminId=${currentAdmin.id}`);
        
        if (response.ok) {
            adminEvents = await response.json();
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

// Afișare evenimente
function displayEvents() {
    if (adminEvents.length === 0) {
        showNoEvents();
        return;
    }
    
    eventsListDiv.innerHTML = '';
    
    adminEvents.forEach(event => {
        const eventCard = createEventCard(event);
        eventsListDiv.appendChild(eventCard);
    });
    
    // Ascundere mesaj "no events"
    noEventsDiv.style.display = 'none';
}

// Creare card eveniment
function createEventCard(event) {
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
                <strong>⏰ Creat:</strong> ${formatDate(event.created_at)}
            </div>
        </div>
        
        <div class="capacity-info ${isFull ? 'capacity-full' : ''}">
            ${event.registered_count}/${event.capacity} locuri ocupate
            ${isFull ? '(COMPLET)' : `(${availableSpots} locuri disponibile)`}
        </div>
        
        ${event.description ? `<div class="event-description">${escapeHtml(event.description)}</div>` : ''}
        
        <div class="event-actions">
            <button class="btn btn-primary btn-small" onclick="editEvent(${event.id})">
                Editează
            </button>
            <button class="btn btn-danger btn-small" onclick="deleteEvent(${event.id})">
                Șterge
            </button>
        </div>
    `;
    
    return eventCard;
}

// Creare eveniment nou
createEventForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const formData = new FormData(createEventForm);
    const eventData = {
        title: formData.get('title'),
        description: formData.get('description'),
        date: formData.get('date'),
        location: formData.get('location'),
        capacity: parseInt(formData.get('capacity')),
        organizerId: currentAdmin.id
    };
    
    try {
        showMessage('Se creează evenimentul...', 'info');
        
        const response = await fetch(`${BACKEND_URL}/admin/events`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(eventData)
        });
        
        const result = await response.json();
        
        if (response.ok) {
            showMessage('Eveniment creat cu succes!', 'success');
            createEventForm.reset();
            
            // Reîncărcare evenimente
            await loadAdminEvents();
            
        } else {
            showMessage(result.message || 'Eroare la crearea evenimentului!', 'error');
        }
        
    } catch (error) {
        console.error('Eroare la crearea evenimentului:', error);
        showMessage('Eroare de conexiune la server!', 'error');
    }
});

// Editare eveniment  
async function editEvent(eventId) {
    const event = adminEvents.find(e => e.id === eventId);
    if (!event) return;
    
    // Populare formular cu datele existente
    document.getElementById('edit-event-id').value = event.id;
    document.getElementById('edit-event-title').value = event.title;
    document.getElementById('edit-event-description').value = event.description || '';
    document.getElementById('edit-event-location').value = event.location;
    document.getElementById('edit-event-capacity').value = event.capacity;
    
    // Formatare dată pentru input datetime-local
    const eventDate = new Date(event.date);
    document.getElementById('edit-event-date').value = eventDate.toISOString().slice(0, 16);
    
    // Afișare modal
    editModal.style.display = 'block';
}

// Salvare modificări eveniment
editEventForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const formData = new FormData(editEventForm);
    const eventId = parseInt(formData.get('id') || document.getElementById('edit-event-id').value);
    const eventData = {
        title: formData.get('title'),
        description: formData.get('description'),
        date: formData.get('date'),
        location: formData.get('location'),
        capacity: parseInt(formData.get('capacity'))
    };
    
    try {
        showMessage('Se salvează modificările...', 'info');
        
        const response = await fetch(`${BACKEND_URL}/admin/events/${eventId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(eventData)
        });
        
        const result = await response.json();
        
        if (response.ok) {
            showMessage('Eveniment actualizat cu succes!', 'success');
            closeModal();
            
            // Reîncărcare evenimente
            await loadAdminEvents();
            
        } else {
            showMessage(result.message || 'Eroare la actualizarea evenimentului!', 'error');
        }
        
    } catch (error) {
        console.error('Eroare la actualizarea evenimentului:', error);
        showMessage('Eroare de conexiune la server!', 'error');
    }
});

// Ștergere eveniment
async function deleteEvent(eventId) {
    const event = adminEvents.find(e => e.id === eventId);
    if (!event) return;
    
    const confirmMessage = `Ești sigur că vrei să ștergi evenimentul "${event.title}"?\n\nAceastă acțiune nu poate fi anulată și va șterge și toate înregistrările participanților.`;
    
    if (!confirm(confirmMessage)) {
        return;
    }
    
    try {
        showMessage('Se șterge evenimentul...', 'info');
        
        const response = await fetch(`${BACKEND_URL}/admin/events/${eventId}`, {
            method: 'DELETE'
        });
        
        const result = await response.json();
        
        if (response.ok) {
            showMessage('Eveniment șters cu succes!', 'success');
            
            // Reîncărcare evenimente
            await loadAdminEvents();
            
        } else {
            showMessage(result.message || 'Eroare la ștergerea evenimentului!', 'error');
        }
        
    } catch (error) {
        console.error('Eroare la ștergerea evenimentului:', error);
        showMessage('Eroare de conexiune la server!', 'error');
    }
}

// Gestionare modal
function closeModal() {
    editModal.style.display = 'none';
    editEventForm.reset();
}

closeModalBtn.addEventListener('click', closeModal);
cancelEditBtn.addEventListener('click', closeModal);

// Închidere modal la click pe background
window.addEventListener('click', (e) => {
    if (e.target === editModal) {
        closeModal();
    }
});

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
    await loadAdminEvents();
}, 30000);