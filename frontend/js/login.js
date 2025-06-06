// configurare backend URL
const BACKEND_URL = 'http://localhost:3000';

// elemente DOM
const tabButtons = document.querySelectorAll('.tab-btn');
const authForms = document.querySelectorAll('.auth-form');
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const messageDiv = document.getElementById('message');

// gestionarea tab-urilor
tabButtons.forEach(button => {
    button.addEventListener('click', () => {
        const tabName = button.getAttribute('data-tab');
        
        // actualizare butoane active
        tabButtons.forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');
        
        // afisare formular corespunzator
        authForms.forEach(form => form.classList.remove('active'));
        document.getElementById(`${tabName}-form`).classList.add('active');
        
        // curatare mesaje
        hideMessage();
    });
});

// gestionarea formularului de login
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const formData = new FormData(loginForm);
    const loginData = {
        username: formData.get('username'),
        password: formData.get('password'),
        role: formData.get('role')
    };
    
    try {
        showMessage('Se proceseaza autentificarea...', 'info');
        
        const response = await fetch(`${BACKEND_URL}/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(loginData)
        });
        
        const result = await response.json();
        
        if (response.ok) {
            // salvare date în localStorage
            window.localStorage.setItem('id_user', result.id_user);
            window.localStorage.setItem('role', result.role);
            window.localStorage.setItem('username', result.username);
            
            showMessage('Autentificare reusita! Redirectionare...', 'success');
            
            // redirectionare în functie de rol
            setTimeout(() => {
                if (result.role === 'admin') {
                    window.location.href = 'admin-dashboard.html';
                } else {
                    window.location.href = 'user-dashboard.html';
                }
            }, 1500);
            
        } else {
            showMessage(result.message || 'Eroare la autentificare!', 'error');
        }
        
    } catch (error) {
        console.error('Eroare la autentificare:', error);
        showMessage('Eroare de conexiune la server!', 'error');
    }
});

// gestionarea formularului de inregistrare
registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const formData = new FormData(registerForm);
    const registerData = {
        username: formData.get('username'),
        password: formData.get('password'),
        email: formData.get('email'),
        role: formData.get('role')
    };
    
    // validare de baza
    if (registerData.password.length < 6) {
        showMessage('Parola trebuie sa aiba cel putin 6 caractere!', 'error');
        return;
    }
    
    try {
        showMessage('Se proceseaza inregistrarea...', 'info');
        
        const response = await fetch(`${BACKEND_URL}/signup`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(registerData)
        });
        
        const result = await response.json();
        
        if (response.ok) {
            showMessage('Inregistrare reusita! Poti sa te autentifici acum.', 'success');
            
            // resetare formular si comutare la sign in
            registerForm.reset();
            setTimeout(() => {
                document.querySelector('[data-tab="signin"]').click();
            }, 2000);
            
        } else {
            showMessage(result.message || 'Eroare la inregistrare!', 'error');
        }
        
    } catch (error) {
        console.error('Eroare la înregistrare:', error);
        showMessage('Eroare de conexiune la server!', 'error');
    }
});

// funcții utilitare pentru mesaje
function showMessage(text, type = 'info') {
    messageDiv.textContent = text;
    messageDiv.className = `message ${type}`;
    messageDiv.style.display = 'block';
}

function hideMessage() {
    messageDiv.style.display = 'none';
    messageDiv.className = 'message';
}

// verificare daca utilizatorul este deja autentificat
window.addEventListener('load', () => {
    const userId = window.localStorage.getItem('id_user');
    const role = window.localStorage.getItem('role');
    
    if (userId && role) {
        // utilizatorul este deja autentificat, redirectioneaza
        if (role === 'admin') {
            window.location.href = 'admin-dashboard.html';
        } else {
            window.location.href = 'user-dashboard.html';
        }
    }
});