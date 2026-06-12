const API_BASE = '';
const PROFILE_API = '/api/profile';

async function checkAuth() {
    try {
        let res = await fetch('/api/me', { 
            method: 'GET',
            credentials: 'include' 
        });
        
        if (!res.ok) {
            window.location.href = "login.html";
            return false;
        }
        return true;
    } catch (err) {
        console.error('Auth check failed:', err);
        window.location.href = "login.html";
        return false;
    }
}

async function loadProfile() {
    try {
        const response = await fetch(PROFILE_API, {
            method: 'GET',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (response.ok) {
            const profile = await response.json();
            if (profile) {
                document.getElementById('fullName').value = profile.fullName || '';
                document.getElementById('email').value = profile.email || '';
                document.getElementById('phone').value = profile.phone || '';
                document.getElementById('age').value = profile.age || '';
                document.getElementById('gender').value = profile.gender || '';
                document.getElementById('occupation').value = profile.occupation || '';
                document.getElementById('monthlyIncome').value = profile.monthlyIncome || '';
                document.getElementById('address').value = profile.address || '';
                document.getElementById('bio').value = profile.bio || '';
                
                showMessage('Profile loaded successfully!', 'info');
            }
        } else if (response.status === 404) {
            console.log('No existing profile found');
        } else {
            showMessage('Failed to load profile', 'error');
        }
    } catch (err) {
        console.error('Error loading profile:', err);
        showMessage('Error loading profile', 'error');
    }
}

async function saveProfile(profileData) {
    try {
        const response = await fetch(PROFILE_API, {
            method: 'POST',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(profileData)
        });

        if (response.ok) {
            const savedProfile = await response.json();
            showMessage('Profile saved successfully! Redirecting to dashboard...', 'success');
            
            setTimeout(() => {
                window.location.href = 'index2.html';
            }, 1500);
            
            return true;
        } else {
            const error = await response.json();
            showMessage(error.error || 'Failed to save profile', 'error');
            return false;
        }
    } catch (err) {
        console.error('Error saving profile:', err);
        showMessage('Error saving profile', 'error');
        return false;
    }
}

async function logout() {
    try {
        const response = await fetch('/api/logout', {
            method: 'POST',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (response.ok) {
            localStorage.removeItem('userProfile');
            window.location.href = 'login.html';
        } else {
            showMessage('Logout failed', 'error');
        }
    } catch (err) {
        console.error('Error during logout:', err);
        showMessage('Error during logout', 'error');
    }
}

function showMessage(message, type = 'info') {
    const messageDiv = document.getElementById('message');
    messageDiv.textContent = message;
    messageDiv.className = `message ${type}`;
    
    if (type !== 'error') {
        setTimeout(() => {
            messageDiv.style.display = 'none';
            messageDiv.className = 'message';
        }, 3000);
    }
}

function clearForm() {
    if (confirm('Are you sure you want to clear all form fields?')) {
        document.getElementById('profileForm').reset();
        showMessage('Form cleared', 'info');
    }
}

function validateForm(data) {
    if (data.email && !validateEmail(data.email)) {
        showMessage('Please enter a valid email address', 'error');
        return false;
    }
    
    if (data.phone && !validatePhone(data.phone)) {
        showMessage('Please enter a valid phone number (10-15 digits)', 'error');
        return false;
    }
    
    if (data.age && (data.age < 1 || data.age > 120)) {
        showMessage('Please enter a valid age (1-120)', 'error');
        return false;
    }
    
    if (data.monthlyIncome && data.monthlyIncome < 0) {
        showMessage('Monthly income cannot be negative', 'error');
        return false;
    }
    
    return true;
}

function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

function validatePhone(phone) {
    const re = /^\d{10,15}$/;
    return re.test(phone.replace(/[\s-]/g, ''));
}

document.getElementById('profileForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const profileData = {
        fullName: document.getElementById('fullName').value.trim(),
        email: document.getElementById('email').value.trim(),
        phone: document.getElementById('phone').value.trim(),
        age: document.getElementById('age').value ? parseInt(document.getElementById('age').value) : null,
        gender: document.getElementById('gender').value,
        occupation: document.getElementById('occupation').value.trim(),
        monthlyIncome: document.getElementById('monthlyIncome').value ? parseFloat(document.getElementById('monthlyIncome').value) : null,
        address: document.getElementById('address').value.trim(),
        bio: document.getElementById('bio').value.trim(),
        updatedAt: new Date().toISOString()
    };
    
    Object.keys(profileData).forEach(key => {
        if (profileData[key] === '' || profileData[key] === null) {
            delete profileData[key];
        }
    });
    
    if (validateForm(profileData)) {
        await saveProfile(profileData);
    }
});

document.getElementById('clearBtn').addEventListener('click', clearForm);

document.getElementById('logoutBtn').addEventListener('click', async () => {
    if (confirm('Are you sure you want to logout?')) {
        await logout();
    }
});

(async function init() {
    const isAuthenticated = await checkAuth();
    if (isAuthenticated) {
        await loadProfile();
    }
})();