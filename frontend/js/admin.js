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
const reportModal = document.getElementById('report-modal');
const closeModalBtn = document.querySelector('.close');
const closeReportBtn = document.getElementById('close-report');
const cancelEditBtn = document.getElementById('cancel-edit');

// Elemente pentru statistici
const totalEventsSpan = document.getElementById('total-events');
const publishedEventsSpan = document.getElementById('published-events');
const draftEventsSpan = document.getElementById('draft-events');
const categoriesListDiv = document.getElementById('categories-list');

// Date utilizator
let currentAdmin = {
    id: null,
    username: null,
    role: null
};

// Date evenimente și categorii
let adminEvents = [];
let categories = [];
let venues = [];

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
    
    // Încărcare date inițiale
    await Promise.all([
        loadCategories(),
        loadVenues(),
        loadAdminEvents()
    ]);
    
    // Actualizare statistici
    updateStatistics();
}

// Încărcare categorii
async function loadCategories() {
    try {
        const response = await fetch(`${BACKEND_URL}/categories`);
        if (response.ok) {
            categories = await response.json();
            populateCategorySelects();
        }
    } catch (error) {
        console.error('Eroare la încărcarea categoriilor:', error);
    }
}

// Încărcare venue-uri
async function loadVenues() {
    try {
        const response = await fetch(`${BACKEND_URL}/venues`);
        if (response.ok) {
            venues = await response.json();
            populateVenueSelects();
        }
    } catch (error) {
        console.error('Eroare la încărcarea venue-urilor:', error);
    }
}

// Populare select-uri categorii
function populateCategorySelects() {
    const categorySelects = [
        document.getElementById('event-category'),
        document.getElementById('edit-event-category')
    ];
    
    categorySelects.forEach(select => {
        if (select) {
            // Păstrare opțiune selectată
            const selectedValue = select.value;
            
            // Ștergere opțiuni existente (păstrând prima)
            while (select.children.length > 1) {
                select.removeChild(select.lastChild);
            }
            
            // Adăugare categorii
            categories.forEach(category => {
                const option = document.createElement('option');
                option.value = category.id;
                option.textContent = category.name;
                select.appendChild(option);
            });
            
            // Restabilire valoare selectată
            if (selectedValue) {
                select.value = selectedValue;
            }
        }
    });
}

// Populare select-uri venue-uri
function populateVenueSelects() {
    const venueSelects = [
        document.getElementById('event-venue'),
        document.getElementById('edit-event-venue')
    ];
    
    venueSelects.forEach(select => {
        if (select) {
            // Păstrare opțiune selectată
            const selectedValue = select.value;
            
            // Ștergere opțiuni existente (păstrând prima)
            while (select.children.length > 1) {
                select.removeChild(select.lastChild);
            }
            
            // Adăugare venue-uri
            venues.forEach(venue => {
                const option = document.createElement('option');
                option.value = venue.id;
                option.textContent = venue.name;
                select.appendChild(option);
            });
            
            // Restabilire valoare selectată
            if (selectedValue) {
                select.value = selectedValue;
            }
        }
    });
}

// Încărcare evenimente admin
async function loadAdminEvents() {
    try {
        showLoading(true);
        
        const response = await fetch(`${BACKEND_URL}/admin/events?adminId=${currentAdmin.id}`);
        
        if (response.ok) {
            adminEvents = await response.json();
            displayEvents();
            updateStatistics();
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

// Actualizare statistici
function updateStatistics() {
    const totalEvents = adminEvents.length;
    const publishedEvents = adminEvents.filter(e => e.status === 'published').length;
    const draftEvents = adminEvents.filter(e => e.status === 'draft').length;
    
    totalEventsSpan.textContent = totalEvents;
    publishedEventsSpan.textContent = publishedEvents;
    draftEventsSpan.textContent = draftEvents;
    
    // Actualizare top categorii
    updateTopCategories();
}

// Actualizare top categorii
function updateTopCategories() {
    const categoryStats = {};
    
    adminEvents.forEach(event => {
        if (event.category_name) {
            categoryStats[event.category_name] = (categoryStats[event.category_name] || 0) + 1;
        }
    });
    
    // Sortare categorii după numărul de evenimente
    const sortedCategories = Object.entries(categoryStats)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5); // Top 5 categorii
    
    categoriesListDiv.innerHTML = '';
    
    if (sortedCategories.length === 0) {
        categoriesListDiv.innerHTML = '<p>Nu există evenimente încă.</p>';
        return;
    }
    
    sortedCategories.forEach(([categoryName, count]) => {
        const categoryItem = document.createElement('div');
        categoryItem.className = 'category-stat-item';
        categoryItem.innerHTML = `
            <span class="category-name">${escapeHtml(categoryName)}</span>
            <span class="category-count">${count}</span>
        `;
        categoriesListDiv.appendChild(categoryItem);
    });
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
    const isPublished = event.status === 'published';
    
    const eventCard = document.createElement('div');
    eventCard.className = `event-card ${!isPublished ? 'draft-event' : ''}`;
    
    eventCard.innerHTML = `
        <div class="event-header">
            <div class="event-title">${escapeHtml(event.title)}</div>
            <div class="event-status ${event.status}">
                ${event.status === 'published' ? 'Publicat' : 'Draft'}
            </div>
        </div>
        
        <div class="event-info">
            <div class="event-info-item">
                <strong>📅 Data:</strong> ${formatDate(event.date)}
            </div>
            <div class="event-info-item">
                <strong>📍 Locația:</strong> ${escapeHtml(event.location)}
            </div>
            <div class="event-info-item">
                <strong>🏷️ Categorie:</strong> ${escapeHtml(event.category_name || 'Necategorisit')}
            </div>
            ${event.venue_name ? `
                <div class="event-info-item">
                    <strong>🏢 Venue:</strong> ${escapeHtml(event.venue_name)}
                </div>
            ` : ''}
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
            <button class="btn btn-info btn-small" onclick="showParticipationReport(${event.id})">
                Raport
            </button>
            <button class="btn btn-danger btn-small" onclick="deleteEvent(${event.id})">
                Șterge
            </button>
        </div>
    `;
    
    return eventCard;
}

// Afișare raport participare
async function showParticipationReport(eventId) {
    try {
        const response = await fetch(`${BACKEND_URL}/admin/events/${eventId}/participants`);
        
        if (response.ok) {
            const participants = await response.json();
            const event = adminEvents.find(e => e.id === eventId);
            
            displayParticipationReport(event, participants);
            reportModal.style.display = 'block';
        } else {
            showMessage('Eroare la încărcarea raportului!', 'error');
        }
    } catch (error) {
        console.error('Eroare la încărcarea raportului:', error);
        showMessage('Eroare de conexiune la server!', 'error');
    }
}

// Afișare raport în modal
function displayParticipationReport(event, participants) {
    const reportContent = document.getElementById('report-content');
    const averageAgeDiv = document.getElementById('average-age');
    
    // Informații eveniment
    reportContent.innerHTML = `
        <div class="report-header">
            <h4>${escapeHtml(event.title)}</h4>
            <p><strong>Data:</strong> ${formatDate(event.date)}</p>
            <p><strong>Locația:</strong> ${escapeHtml(event.location)}</p>
            <p><strong>Capacitate:</strong> ${event.capacity} locuri</p>
            <p><strong>Înregistrări:</strong> ${participants.length}</p>
        </div>
        
        <div class="participants-list">
            <h5>Lista Participanților:</h5>
            ${participants.length === 0 ? 
                '<p>Nu există participanți înregistrați.</p>' :
                `<table class="participants-table">
                    <thead>
                        <tr>
                            <th>Username</th>
                            <th>Email</th>
                            <th>Vârsta</th>
                            <th>Data Înregistrării</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${participants.map(p => `
                            <tr>
                                <td>${escapeHtml(p.username)}</td>
                                <td>${escapeHtml(p.email)}</td>
                                <td>${p.age || 'N/A'}</td>
                                <td>${formatDate(p.registration_date)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>`
            }
        </div>
    `;
    
    // Calculare vârsta medie
    if (participants.length > 0) {
        const participantsWithAge = participants.filter(p => p.age && p.age > 0);
        if (participantsWithAge.length > 0) {
            const averageAge = participantsWithAge.reduce((sum, p) => sum + p.age, 0) / participantsWithAge.length;
            averageAgeDiv.innerHTML = `
                <p><strong>Vârsta medie a participanților:</strong> ${averageAge.toFixed(1)} ani</p>
                <p><strong>Participanți cu vârsta specificată:</strong> ${participantsWithAge.length} din ${participants.length}</p>
            `;
        } else {
            averageAgeDiv.innerHTML = '<p>Nu există informații despre vârsta participanților.</p>';
        }
    } else {
        averageAgeDiv.innerHTML = '';
    }
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
        categoryId: formData.get('categoryId') || null,
        venueId: formData.get('venueId') || null,
        status: formData.get('status'),
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
    document.getElementById('edit-event-status').value = event.status;
    
    // Setare categorie și venue
    if (event.category_id) {
        document.getElementById('edit-event-category').value = event.category_id;
    }
    if (event.venue_id) {
        document.getElementById('edit-event-venue').value = event.venue_id;
    }
    
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
        capacity: parseInt(formData.get('capacity')),
        categoryId: formData.get('categoryId') || null,
        venueId: formData.get('venueId') || null,
        status: formData.get('status')
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

// Gestionare modale
function closeModal() {
    editModal.style.display = 'none';
    editEventForm.reset();
}

function closeReportModal() {
    reportModal.style.display = 'none';
}

closeModalBtn.addEventListener('click', closeModal);
cancelEditBtn.addEventListener('click', closeModal);
closeReportBtn.addEventListener('click', closeReportModal);

// Închidere modale la click pe background
window.addEventListener('click', (e) => {
    if (e.target === editModal) {
        closeModal();
    }
    if (e.target === reportModal) {
        closeReportModal();
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