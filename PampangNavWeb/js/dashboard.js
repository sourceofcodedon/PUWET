import { auth, db } from './firebase-config.js';
import { onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import {
    collection,
    getDocs,
    query,
    where,
    orderBy,
    doc,
    addDoc,
    getDoc,
    updateDoc,
    deleteDoc
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

// Global variables
let allUsers = [];
let allAdmins = [];
let allStores = [];
let pendingUsers = [];
let currentView = 'dashboard';

// Navigation elements
const navItems = document.querySelectorAll('nav a');
const pageTitle = document.getElementById('pageTitle');
const dashboardContent = document.getElementById('dashboardContent');
const usersContent = document.getElementById('usersContent');
const adminContent = document.getElementById('adminContent');
const pendingRegistrationContent = document.getElementById('pendingRegistrationContent');
const storesContent = document.getElementById('storesContent');

// Check authentication state
onAuthStateChanged(auth, async (user) => {
    if (user) {
        console.log('User is logged in:', user.uid);
        // Display user email
        document.getElementById('userEmail').textContent = user.email;

        // Load dashboard data
        await loadDashboardData();

        // Setup navigation
        setupNavigation();
    } else {
        console.log('No user logged in, redirecting to login...');
        // Redirect to login if not authenticated
        window.location.href = 'login.html';
    }
});

// Setup navigation functionality
function setupNavigation() {
    // Navigation item clicks
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const view = item.querySelector('span').textContent.toLowerCase().replace(' ', '');
            switchView(view);
        });
    });

    // Users card click
    const usersCard = document.getElementById('usersCard');
    if (usersCard) {
        usersCard.addEventListener('click', () => {
            switchView('users');
        });
    }

    // Admin card click
    const adminCard = document.getElementById('adminCard');
    if (adminCard) {
        adminCard.addEventListener('click', () => {
            switchView('admin');
        });
    }

    // Stores card click
    const storesCard = document.getElementById('storesCard');
    if (storesCard) {
        storesCard.addEventListener('click', () => {
            switchView('stores');
        });
    }

    // Search functionality
    const userSearch = document.getElementById('userSearch');
    const clearSearch = document.getElementById('clearSearch');

    if (userSearch) {
        userSearch.addEventListener('input', function () {
            toggleClearButton(this, clearSearch);
            filterUsers();
        });
    }

    if (clearSearch) {
        clearSearch.addEventListener('click', () => {
            userSearch.value = '';
            toggleClearButton(userSearch, clearSearch);
            filterUsers();
        });
    }

    // Admin search functionality
    const adminSearch = document.getElementById('adminSearch');
    const clearAdminSearch = document.getElementById('clearAdminSearch');

    if (adminSearch) {
        adminSearch.addEventListener('input', function () {
            toggleClearButton(this, clearAdminSearch);
            filterAdmins();
        });
    }

    if (clearAdminSearch) {
        clearAdminSearch.addEventListener('click', () => {
            adminSearch.value = '';
            toggleClearButton(adminSearch, clearAdminSearch);
            filterAdmins();
        });
    }

    // Store search functionality
    const storeSearch = document.getElementById('storeSearch');
    const clearStoreSearch = document.getElementById('clearStoreSearch');

    if (storeSearch) {
        storeSearch.addEventListener('input', function () {
            toggleClearButton(this, clearStoreSearch);
            filterStores();
        });
    }

    if (clearStoreSearch) {
        clearStoreSearch.addEventListener('click', () => {
            storeSearch.value = '';
            toggleClearButton(storeSearch, clearStoreSearch);
            filterStores();
        });
    }

    // Generate registration link
    const generateLinkBtn = document.getElementById('generateLinkBtn');
    if (generateLinkBtn) {
        generateLinkBtn.addEventListener('click', generateRegistrationLink);
    }

    // Copy registration link
    const copyLinkBtn = document.getElementById('copyLinkBtn');
    if (copyLinkBtn) {
        copyLinkBtn.addEventListener('click', copyRegistrationLink);
    }
}

// Helper function to toggle clear button visibility
function toggleClearButton(inputElement, clearButton) {
    if (inputElement.value.trim() !== '') {
        clearButton.classList.remove('hidden');
    } else {
        clearButton.classList.add('hidden');
    }
}

// Switch between views
function switchView(view) {
    currentView = view;

    // Update navigation active states
    navItems.forEach(item => {
        const itemText = item.querySelector('span').textContent.toLowerCase().replace(' ', '');
        if (itemText === view) {
            item.classList.add('text-primary-light', 'bg-green-50', 'font-medium');
            item.classList.remove('text-gray-600', 'hover:bg-gray-50');
        } else {
            item.classList.remove('text-primary-light', 'bg-green-50', 'font-medium');
            item.classList.add('text-gray-600', 'hover:bg-gray-50');
        }
    });

    // Update page title and content visibility
    if (pageTitle) {
        const titleText = pageTitle.querySelector('h2');
        if (titleText) {
            titleText.textContent = view.charAt(0).toUpperCase() + view.slice(1).replace(/([A-Z])/g, ' ').trim();
        }
    }

    // Toggle content visibility
    dashboardContent.classList.add('hidden');
    usersContent.classList.add('hidden');
    adminContent.classList.add('hidden');
    pendingRegistrationContent.classList.add('hidden');
    storesContent.classList.add('hidden');

    if (view === 'dashboard') {
        dashboardContent.classList.remove('hidden');
    } else if (view === 'users') {
        usersContent.classList.remove('hidden');
        loadUsersList();
    } else if (view === 'admin') {
        adminContent.classList.remove('hidden');
        loadAdminList();
    } else if (view === 'pendingregistration') {
        pendingRegistrationContent.classList.remove('hidden');
        loadPendingUsersList();
    } else if (view === 'stores') {
        storesContent.classList.remove('hidden');
        loadStoresList();
    }
}

// Load dashboard statistics
async function loadDashboardData() {
    try {
        console.log('Loading dashboard data...');
        const loadingIndicator = document.getElementById('loadingIndicator');

        // Get all users from Firestore
        const usersCollection = collection(db, 'users');
        const usersSnapshot = await getDocs(usersCollection);

        let userCount = 0;
        let adminCount = 0;
        allUsers = [];
        allAdmins = [];

        // Count users by role and store all users data
        usersSnapshot.forEach((doc) => {
            const userData = doc.data();
            const role = userData.role;

            if (role === 'admin') {
                adminCount++;
                allAdmins.push(userData);
            } else {
                userCount++;
                allUsers.push(userData);
            }
        });

        // Get all stores from Firestore
        const storesCollection = collection(db, 'stores');
        const storesSnapshot = await getDocs(storesCollection);
        allStores = storesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        console.log('Users count:', userCount);
        console.log('Admin count:', adminCount);
        console.log('Stores count:', allStores.length);

        // Update the UI
        document.getElementById('usersCount').textContent = userCount;
        document.getElementById('adminCount').textContent = adminCount;
        document.getElementById('storesCount').textContent = allStores.length;

        // Hide loading indicator
        if (loadingIndicator) {
            loadingIndicator.style.display = 'none';
        }

    } catch (error) {
        console.error('Error loading dashboard data:', error);
        const loadingIndicator = document.getElementById('loadingIndicator');
        if (loadingIndicator) {
            loadingIndicator.innerHTML = '<p class="text-red-500">Error loading dashboard data. Please refresh the page.</p>';
        }
    }
}

// Load users list for management
async function loadUsersList() {
    const usersTableBody = document.getElementById('usersTableBody');
    const usersLoading = document.getElementById('usersLoading');
    const noUsers = document.getElementById('noUsers');

    if (!usersTableBody || !usersLoading || !noUsers) return;

    usersLoading.classList.remove('hidden');
    usersTableBody.innerHTML = '';
    noUsers.classList.add('hidden');

    try {
        const sortedUsers = [...allUsers].sort((a, b) =>
            (a.username || '').localeCompare(b.username || '')
        );

        usersLoading.classList.add('hidden');

        if (sortedUsers.length === 0) {
            noUsers.classList.remove('hidden');
            return;
        }

        sortedUsers.forEach(user => {
            const userRow = createUserTableRow(user);
            usersTableBody.appendChild(userRow);
        });

    } catch (error) {
        console.error('Error loading users list:', error);
        usersLoading.innerHTML = '<p class="text-red-500 p-4">Error loading users. Please refresh the page.</p>';
    }
}

// Load admin list for management
async function loadAdminList() {
    const adminTableBody = document.getElementById('adminTableBody');
    const adminLoading = document.getElementById('adminLoading');
    const noAdmins = document.getElementById('noAdmins');

    if (!adminTableBody || !adminLoading || !noAdmins) return;

    adminLoading.classList.remove('hidden');
    adminTableBody.innerHTML = '';
    noAdmins.classList.add('hidden');

    try {
        const sortedAdmins = [...allAdmins].sort((a, b) =>
            (a.username || '').localeCompare(b.username || '')
        );

        adminLoading.classList.add('hidden');

        if (sortedAdmins.length === 0) {
            noAdmins.classList.remove('hidden');
            return;
        }

        sortedAdmins.forEach(admin => {
            const adminRow = createUserTableRow(admin);
            adminTableBody.appendChild(adminRow);
        });

    } catch (error) {
        console.error('Error loading admin list:', error);
        adminLoading.innerHTML = '<p class="text-red-500 p-4">Error loading admins. Please refresh the page.</p>';
    }
}

// Load stores list for management
async function loadStoresList() {
    const storesTableBody = document.getElementById('storesTableBody');
    const storesLoading = document.getElementById('storesLoading');
    const noStores = document.getElementById('noStores');

    if (!storesTableBody || !storesLoading || !noStores) return;

    storesLoading.classList.remove('hidden');
    storesTableBody.innerHTML = '';
    noStores.classList.add('hidden');

    try {
        const sortedStores = [...allStores].sort((a, b) =>
            (a.store_name || '').localeCompare(b.store_name || '')
        );

        storesLoading.classList.add('hidden');

        if (sortedStores.length === 0) {
            noStores.classList.remove('hidden');
            return;
        }

        sortedStores.forEach(store => {
            const storeRow = createStoreTableRow(store);
            storesTableBody.appendChild(storeRow);
        });

    } catch (error) {
        console.error('Error loading stores list:', error);
        storesLoading.innerHTML = '<p class="text-red-500 p-4">Error loading stores. Please refresh the page.</p>';
    }
}

// Create user table row
function createUserTableRow(user) {
    const row = document.createElement('tr');
    row.className = 'hover:bg-gray-50';

    row.innerHTML = `
        <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${user.username || 'N/A'}</td>
        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${user.email || 'N/A'}</td>
        <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
            <button class="text-red-600 hover:text-red-900" data-uid="${user.uid}">Delete</button>
        </td>
    `;

    row.querySelector('button[data-uid]').addEventListener('click', () => deleteUser(user.uid));

    return row;
}

// Create store table row
function createStoreTableRow(store) {
    const row = document.createElement('tr');
    row.className = 'hover:bg-gray-50';

    row.innerHTML = `
        <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${store.store_name || 'N/A'}</td>
        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${store.opening_time || 'N/A'}</td>
        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${store.closing_time || 'N/A'}</td>
        <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
            <button class="text-indigo-600 hover:text-indigo-900" data-id="${store.id}">Edit</button>
            <button class="text-red-600 hover:text-red-900 ml-4" data-id="${store.id}">Delete</button>
        </td>
    `;

    row.querySelector('button[data-id]').addEventListener('click', () => editStore(store.id));
    row.querySelectorAll('button[data-id]')[1].addEventListener('click', () => deleteStore(store.id));

    return row;
}

// Filter users based on search input
function filterUsers() {
    const searchTerm = document.getElementById('userSearch').value.toLowerCase().trim();
    const usersTableBody = document.getElementById('usersTableBody');
    const noUsers = document.getElementById('noUsers');

    if (!usersTableBody || !noUsers) return;

    const userRows = usersTableBody.querySelectorAll('tr');
    let visibleCount = 0;

    userRows.forEach(row => {
        const cells = row.querySelectorAll('td');
        const username = cells[0].textContent.toLowerCase();
        const email = cells[1].textContent.toLowerCase();

        if (username.includes(searchTerm) || email.includes(searchTerm)) {
            row.style.display = '';
            visibleCount++;
        } else {
            row.style.display = 'none';
        }
    });

    if (visibleCount === 0) {
        noUsers.classList.remove('hidden');
    } else {
        noUsers.classList.add('hidden');
    }
}

// Filter admins based on search input
function filterAdmins() {
    const searchTerm = document.getElementById('adminSearch').value.toLowerCase().trim();
    const adminTableBody = document.getElementById('adminTableBody');
    const noAdmins = document.getElementById('noAdmins');

    if (!adminTableBody || !noAdmins) return;

    const adminRows = adminTableBody.querySelectorAll('tr');
    let visibleCount = 0;

    adminRows.forEach(row => {
        const cells = row.querySelectorAll('td');
        const username = cells[0].textContent.toLowerCase();
        const email = cells[1].textContent.toLowerCase();

        if (username.includes(searchTerm) || email.includes(searchTerm)) {
            row.style.display = '';
            visibleCount++;
        } else {
            row.style.display = 'none';
        }
    });

    if (visibleCount === 0) {
        noAdmins.classList.remove('hidden');
    } else {
        noAdmins.classList.add('hidden');
    }
}

// Filter stores based on search input
function filterStores() {
    const searchTerm = document.getElementById('storeSearch').value.toLowerCase().trim();
    const storesTableBody = document.getElementById('storesTableBody');
    const noStores = document.getElementById('noStores');

    if (!storesTableBody || !noStores) return;

    const storeRows = storesTableBody.querySelectorAll('tr');
    let visibleCount = 0;

    storeRows.forEach(row => {
        const cells = row.querySelectorAll('td');
        const storeName = cells[0].textContent.toLowerCase();

        if (storeName.includes(searchTerm)) {
            row.style.display = '';
            visibleCount++;
        } else {
            row.style.display = 'none';
        }
    });

    if (visibleCount === 0) {
        noStores.classList.remove('hidden');
    } else {
        noStores.classList.add('hidden');
    }
}

// Generate and display registration link
async function generateRegistrationLink() {
    const generateLinkBtn = document.getElementById('generateLinkBtn');
    generateLinkBtn.disabled = true;
    generateLinkBtn.textContent = 'Generating...';

    try {
        // Generate a unique token
        const token = 'REG-' + Math.random().toString(36).substr(2, 10);

        // Store token in Firestore with an expiration date (e.g., 24 hours)
        const tokensCollection = collection(db, 'registrationTokens');
        await addDoc(tokensCollection, {
            token: token,
            expiresAt: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
            createdAt: Date.now()
        });

        const registrationUrl = window.location.href.replace('dashboard.html', `signup.html?token=${token}`);

        // Display the link
        const registrationLinkInput = document.getElementById('registrationLink');
        registrationLinkInput.value = registrationUrl;
        document.getElementById('copyLinkBtn').classList.remove('hidden');

    } catch (error) {
        console.error('Error generating registration link:', error);
        alert('Failed to generate registration link. Please try again.');
    } finally {
        generateLinkBtn.disabled = false;
        generateLinkBtn.textContent = 'Generate';
    }
}

// Copy registration link to clipboard
function copyRegistrationLink() {
    const registrationLinkInput = document.getElementById('registrationLink');
    navigator.clipboard.writeText(registrationLinkInput.value).then(() => {
        const copyBtn = document.getElementById('copyLinkBtn');
        copyBtn.textContent = 'Copied!';
        setTimeout(() => {
            copyBtn.textContent = 'Copy';
        }, 2000);
    }).catch(err => {
        console.error('Failed to copy link:', err);
        alert('Failed to copy link. Please copy it manually.');
    });
}

// Load pending users for approval
async function loadPendingUsersList() {
    const tableBody = document.getElementById('pendingUsersTableBody');
    const loading = document.getElementById('pendingUsersLoading');
    const noUsers = document.getElementById('noPendingUsers');

    loading.classList.remove('hidden');
    tableBody.innerHTML = '';
    noUsers.classList.add('hidden');

    try {
        const pendingUsersCollection = collection(db, 'pendingUsers');
        const q = query(pendingUsersCollection, orderBy('createdAt', 'desc'));
        const querySnapshot = await getDocs(q);

        pendingUsers = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        loading.classList.add('hidden');

        if (pendingUsers.length === 0) {
            noUsers.classList.remove('hidden');
            return;
        }

        pendingUsers.forEach(user => {
            const row = createPendingUserTableRow(user);
            tableBody.appendChild(row);
        });

    } catch (error) {
        console.error('Error loading pending users:', error);
        loading.innerHTML = '<p class="text-red-500 p-4">Error loading pending users. Please refresh.</p>';
    }
}

// Create table row for a pending user
function createPendingUserTableRow(user) {
    const row = document.createElement('tr');
    row.id = `pending-user-${user.id}`;
    row.className = 'hover:bg-gray-50';

    row.innerHTML = `
        <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${user.username || 'N/A'}</td>
        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${user.email || 'N/A'}</td>
        <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
            <button class="text-green-600 hover:text-green-900" data-action="approve" data-uid="${user.uid}">Approve</button>
            <button class="text-red-600 hover:text-red-900 ml-4" data-action="reject" data-id="${user.id}">Reject</button>
        </td>
    `;

    // Add event listeners for approve/reject buttons
    row.querySelector('[data-action="approve"]').addEventListener('click', () => approveUser(user.uid, user.id));
    row.querySelector('[data-action="reject"]').addEventListener('click', () => rejectUser(user.id));

    return row;
}

// Approve a pending user
async function approveUser(uid, pendingId) {
    if (!confirm('Are you sure you want to approve this user?')) return;

    try {
        // Update user's role to 'admin' in the main 'users' collection
        const userRef = doc(db, 'users', uid);
        await updateDoc(userRef, { role: 'admin' });

        // Delete the user from 'pendingUsers'
        await deleteDoc(doc(db, 'pendingUsers', pendingId));

        // Refresh the list
        loadPendingUsersList();
        // Refresh dashboard data
        loadDashboardData();

        alert('User approved successfully.');

    } catch (error) {
        console.error('Error approving user:', error);
        alert('Failed to approve user. Please try again.');
    }
}

// Reject a pending user
async function rejectUser(pendingId) {
    if (!confirm('Are you sure you want to reject this user? This action cannot be undone.')) return;

    try {
        // Just delete from 'pendingUsers'
        await deleteDoc(doc(db, 'pendingUsers', pendingId));

        // Refresh the list
        loadPendingUsersList();

        alert('User rejected successfully.');

    } catch (error) {
        console.error('Error rejecting user:', error);
        alert('Failed to reject user. Please try again.');
    }
}

// Delete a user
async function deleteUser(uid) {
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) return;

    try {
        await deleteDoc(doc(db, 'users', uid));

        // Refresh the list
        loadDashboardData();
        loadUsersList();

        alert('User deleted successfully.');

    } catch (error) {
        console.error('Error deleting user:', error);
        alert('Failed to delete user. Please try again.');
    }
}

// Delete a store
async function deleteStore(id) {
    if (!confirm('Are you sure you want to delete this store? This action cannot be undone.')) return;

    try {
        await deleteDoc(doc(db, 'stores', id));

        // Refresh the list
        loadDashboardData();
        loadStoresList();

        alert('Store deleted successfully.');

    } catch (error) {
        console.error('Error deleting store:', error);
        alert('Failed to delete store. Please try again.');
    }
}

// Edit a store
function editStore(id) {
    const store = allStores.find(s => s.id === id);
    if (!store) {
        alert('Store not found!');
        return;
    }

    const modal = document.getElementById('editStoreModal');
    const storeIdInput = document.getElementById('editStoreId');
    const storeNameInput = document.getElementById('editStoreName');
    const openingTimeInput = document.getElementById('editOpeningTime');
    const closingTimeInput = document.getElementById('editClosingTime');

    storeIdInput.value = id;
    storeNameInput.value = store.store_name;
    openingTimeInput.value = store.opening_time;
    closingTimeInput.value = store.closing_time;

    modal.classList.remove('hidden');
}

// Save store changes
async function saveStoreChanges() {
    const id = document.getElementById('editStoreId').value;
    const storeName = document.getElementById('editStoreName').value;
    const openingTime = document.getElementById('editOpeningTime').value;
    const closingTime = document.getElementById('editClosingTime').value;

    if (!storeName || !openingTime || !closingTime) {
        alert('Please fill in all fields.');
        return;
    }

    try {
        const storeRef = doc(db, 'stores', id);
        await updateDoc(storeRef, {
            store_name: storeName,
            opening_time: openingTime,
            closing_time: closingTime,
        });

        // Refresh the list
        await loadDashboardData();
        loadStoresList();

        // Hide the modal
        document.getElementById('editStoreModal').classList.add('hidden');

        alert('Store updated successfully.');

    } catch (error) {
        console.error('Error updating store:', error);
        alert('Failed to update store. Please try again.');
    }
}

// Close edit modal
function cancelEdit() {
    document.getElementById('editStoreModal').classList.add('hidden');
}

// Logout functionality
const logoutBtn = document.getElementById('logoutBtn');
if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
        try {
            console.log('Logging out...');
            await signOut(auth);

            // Clear localStorage
            localStorage.removeItem('loggedInRole');
            localStorage.removeItem('userId');

            console.log('Logout successful, redirecting to login...');
            window.location.href = 'login.html';
        } catch (error) {
            console.error('Logout error:', error);
            alert('Error logging out. Please try again.');
        }
    });
}

// Event Listeners for Modal
const saveStoreBtn = document.getElementById('saveStoreBtn');
if (saveStoreBtn) {
    saveStoreBtn.addEventListener('click', saveStoreChanges);
}

const cancelEditBtn = document.getElementById('cancelEditBtn');
if (cancelEditBtn) {
    cancelEditBtn.addEventListener('click', cancelEdit);
}