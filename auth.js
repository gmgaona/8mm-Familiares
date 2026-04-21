// Sistema de Autenticación y Mantenedor de Usuarios

let users = [];
let currentUser = null;

// Inicializar
function initAuth() {
    loadUsers();
    checkSession();
}

// Cargar usuarios desde EMBEDDED_DATA o localStorage
function loadUsers() {
    // Primero intentar cargar desde EMBEDDED_DATA
    if (typeof EMBEDDED_DATA !== 'undefined' && EMBEDDED_DATA && EMBEDDED_DATA.users) {
        users = [...EMBEDDED_DATA.users];
    }
    
    // Luego mergear con localStorage si existe
    const savedUsers = localStorage.getItem('vhsUsers');
    if (savedUsers) {
        try {
            const parsedUsers = JSON.parse(savedUsers);
            // Merge usuarios, evitando duplicados por ID
            parsedUsers.forEach(savedUser => {
                const existingIndex = users.findIndex(u => u.id === savedUser.id);
                if (existingIndex >= 0) {
                    users[existingIndex] = savedUser;
                } else {
                    users.push(savedUser);
                }
            });
        } catch (e) {
            console.error('Error parsing saved users:', e);
        }
    }
    
    // Si no hay usuarios, crear los usuarios por defecto
    if (users.length === 0) {
        users.push({
            id: 1,
            username: 'usuario',
            password: '1234',
            role: 'admin',
            name: 'Administrador'
        });
        users.push({
            id: 2,
            username: 'gerardo',
            password: '1081',
            role: 'admin',
            name: 'Gerardo Gaona'
        });
        saveUsers();
    }
}

// Guardar usuarios en localStorage
function saveUsers() {
    localStorage.setItem('vhsUsers', JSON.stringify(users));
}

// Verificar sesión activa
function checkSession() {
    const session = localStorage.getItem('vhsSession');
    if (session) {
        try {
            currentUser = JSON.parse(session);
            // Si estamos en login.html y hay sesión, redirigir a la app
            if (window.location.pathname.includes('login.html')) {
                window.location.href = 'index.html';
            }
        } catch (e) {
            localStorage.removeItem('vhsSession');
        }
    }
}

// Login
function login(username, password) {
    const user = users.find(u => u.username === username && u.password === password);
    if (user) {
        currentUser = { ...user };
        delete currentUser.password; // No guardar password en sesión
        localStorage.setItem('vhsSession', JSON.stringify(currentUser));
        return true;
    }
    return false;
}

// Logout
function logout() {
    currentUser = null;
    localStorage.removeItem('vhsSession');
    window.location.href = 'login.html';
}

// Verificar si está autenticado (para proteger páginas)
function requireAuth() {
    const session = localStorage.getItem('vhsSession');
    if (!session) {
        window.location.href = 'login.html';
        return false;
    }
    try {
        currentUser = JSON.parse(session);
        return true;
    } catch (e) {
        window.location.href = 'login.html';
        return false;
    }
}

// Obtener usuario actual
function getCurrentUser() {
    return currentUser;
}

// CRUD Usuarios
function getUsers() {
    return [...users];
}

function addUser(userData) {
    // Verificar si el username ya existe
    if (users.some(u => u.username === userData.username)) {
        return { success: false, error: 'El usuario ya existe' };
    }
    
    const newUser = {
        id: Date.now(),
        ...userData
    };
    users.push(newUser);
    saveUsers();
    return { success: true, user: newUser };
}

function updateUser(id, userData) {
    const index = users.findIndex(u => u.id === id);
    if (index === -1) {
        return { success: false, error: 'Usuario no encontrado' };
    }
    
    // Verificar si el nuevo username ya existe en otro usuario
    if (userData.username && users.some(u => u.username === userData.username && u.id !== id)) {
        return { success: false, error: 'El usuario ya existe' };
    }
    
    users[index] = { ...users[index], ...userData };
    saveUsers();
    return { success: true, user: users[index] };
}

function deleteUser(id) {
    // No permitir borrar el último admin
    const userToDelete = users.find(u => u.id === id);
    if (userToDelete && userToDelete.role === 'admin') {
        const adminCount = users.filter(u => u.role === 'admin').length;
        if (adminCount <= 1) {
            return { success: false, error: 'Debe haber al menos un administrador' };
        }
    }
    
    const index = users.findIndex(u => u.id === id);
    if (index === -1) {
        return { success: false, error: 'Usuario no encontrado' };
    }
    
    users.splice(index, 1);
    saveUsers();
    return { success: true };
}

// ===== EVENT LISTENERS PARA LOGIN =====
document.addEventListener('DOMContentLoaded', function() {
    initAuth();
    
    // Formulario de login
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const username = document.getElementById('username').value.trim();
            const password = document.getElementById('password').value;
            
            if (login(username, password)) {
                window.location.href = 'index.html';
            } else {
                const errorMsg = document.getElementById('errorMessage');
                const errorText = document.getElementById('errorText');
                errorText.textContent = 'Usuario o contraseña incorrectos';
                errorMsg.classList.add('show');
                
                setTimeout(() => {
                    errorMsg.classList.remove('show');
                }, 3000);
            }
        });
    }
    
    // Formulario de usuario
    const userForm = document.getElementById('userForm');
    if (userForm) {
        userForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const userId = document.getElementById('userId').value;
            const userData = {
                name: document.getElementById('userName').value.trim(),
                username: document.getElementById('userUsername').value.trim(),
                password: document.getElementById('userPassword').value,
                role: document.getElementById('userRole').value
            };
            
            let result;
            if (userId) {
                // Si la contraseña está vacía, no la actualizamos
                if (!userData.password) {
                    delete userData.password;
                }
                result = updateUser(parseInt(userId), userData);
            } else {
                result = addUser(userData);
            }
            
            if (result.success) {
                closeUserForm();
                renderUsersList();
            } else {
                alert(result.error);
            }
        });
    }
});

// ===== FUNCIONES PARA UI DE USUARIOS =====
function openUsersManager() {
    document.getElementById('usersModal').style.display = 'block';
    renderUsersList();
}

function closeUsersModal() {
    document.getElementById('usersModal').style.display = 'none';
}

function renderUsersList() {
    const grid = document.getElementById('usersGrid');
    if (!grid) return;
    
    const usersList = getUsers();
    
    if (usersList.length === 0) {
        grid.innerHTML = '<p style="text-align: center; color: #666;">No hay usuarios registrados</p>';
        return;
    }
    
    grid.innerHTML = usersList.map(user => `
        <div class="user-card">
            <div class="user-info">
                <h4>${user.name} ${user.role === 'admin' ? '<span style="color: #667eea;">(Admin)</span>' : ''}</h4>
                <small>@${user.username}</small>
            </div>
            <div class="user-actions">
                <button class="btn-icon btn-edit" onclick="editUser(${user.id})" title="Editar">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn-icon btn-delete" onclick="confirmDeleteUser(${user.id})" title="Eliminar">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
    `).join('');
}

function openUserForm(user = null) {
    const modal = document.getElementById('userFormModal');
    const title = document.getElementById('userFormTitle');
    
    if (user) {
        title.innerHTML = '<i class="fas fa-user-edit"></i> Editar Usuario';
        document.getElementById('userId').value = user.id;
        document.getElementById('userName').value = user.name;
        document.getElementById('userUsername').value = user.username;
        document.getElementById('userPassword').value = '';
        document.getElementById('userPassword').placeholder = 'Dejar vacío para no cambiar';
        document.getElementById('userRole').value = user.role;
    } else {
        title.innerHTML = '<i class="fas fa-user-plus"></i> Nuevo Usuario';
        document.getElementById('userId').value = '';
        document.getElementById('userName').value = '';
        document.getElementById('userUsername').value = '';
        document.getElementById('userPassword').value = '';
        document.getElementById('userPassword').placeholder = '';
        document.getElementById('userRole').value = 'user';
    }
    
    modal.style.display = 'block';
}

function closeUserForm() {
    document.getElementById('userFormModal').style.display = 'none';
}

function editUser(id) {
    const user = users.find(u => u.id === id);
    if (user) {
        openUserForm(user);
    }
}

function confirmDeleteUser(id) {
    const user = users.find(u => u.id === id);
    if (!user) return;
    
    if (confirm(`¿Está seguro de eliminar al usuario "${user.name}"?`)) {
        const result = deleteUser(id);
        if (result.success) {
            renderUsersList();
        } else {
            alert(result.error);
        }
    }
}

// Cerrar modales al hacer clic fuera
window.onclick = function(event) {
    const usersModal = document.getElementById('usersModal');
    const userFormModal = document.getElementById('userFormModal');
    
    if (event.target === usersModal) {
        closeUsersModal();
    }
    if (event.target === userFormModal) {
        closeUserForm();
    }
}
