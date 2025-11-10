import { auth, db } from './firebase-config.js';
import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import {
    doc,
    setDoc,
    getDoc,
    collection,
    query,
    where,
    getDocs,
    addDoc
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

// Role constants
const ADMIN_ROLE = 'admin';
const PENDING_ROLE = 'pending';

// Helper function to show error messages
function showError(message) {
    const errorElement = document.getElementById('errorMessage');
    if (errorElement) {
        errorElement.textContent = message;
        errorElement.classList.remove('hidden');
        setTimeout(() => {
            errorElement.classList.add('hidden');
        }, 5000);
    }
}

// Helper function to show success modal
function showSuccessModal() {
    const modal = document.getElementById('successModal');
    if (modal) {
        // Update modal content for pending registration
        const title = modal.querySelector('h3');
        const message = modal.querySelector('p');
        title.textContent = 'Registration Submitted!';
        message.textContent = 'Your registration is pending approval. You will be notified once an admin grants you access.';

        modal.classList.remove('hidden');
        document.body.classList.add('modal-open');

        const okBtn = document.getElementById('modalOkBtn');
        if (okBtn) {
            okBtn.addEventListener('click', () => {
                modal.classList.add('hidden');
                document.body.classList.remove('modal-open');
                window.location.href = 'login.html';
            });
        }

        setTimeout(() => {
            modal.classList.add('hidden');
            document.body.classList.remove('modal-open');
            window.location.href = 'login.html';
        }, 5000);
    }
}

// Helper function to set loading state
function setLoading(isLoading, buttonId) {
    const button = document.getElementById(buttonId);
    if (button) {
        if (isLoading) {
            button.disabled = true;
            button.classList.add('loading');
            button.textContent = 'Loading...';
        } else {
            button.disabled = false;
            button.classList.remove('loading');
            button.textContent = buttonId === 'signupBtn' ? 'SIGN UP' : 'LOGIN';
        }
    }
}

// Register function
async function register(email, password, fullName, token) {
    try {
        setLoading(true, 'signupBtn');

        // Verify the registration token
        if (!token) {
            throw new Error('Registration token is missing.');
        }

        const tokensCollection = collection(db, 'registrationTokens');
        const q = query(tokensCollection, where('token', '==', token));
        const tokenSnapshot = await getDocs(q);

        if (tokenSnapshot.empty) {
            throw new Error('Invalid or expired registration token.');
        }

        const tokenDoc = tokenSnapshot.docs[0];
        const tokenData = tokenDoc.data();

        if (tokenData.expiresAt < Date.now()) {
            throw new Error('Registration token has expired.');
        }

        // Create user in Firebase Auth
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const uid = userCredential.user.uid;

        // Store user data in 'pendingUsers' collection
        const pendingUserData = {
            uid: uid,
            email: email,
            username: fullName,
            role: PENDING_ROLE,
            createdAt: Date.now()
        };

        await setDoc(doc(db, 'pendingUsers', uid), pendingUserData);

        // Success - show modal and redirect to login
        showSuccessModal();

    } catch (error) {
        console.error('Registration error:', error);
        let errorMessage = 'Registration failed. Please try again.';

        if (error.code === 'auth/email-already-in-use') {
            errorMessage = 'This email is already registered.';
        } else if (error.message.includes('token')) {
            errorMessage = error.message;
        }

        showError(errorMessage);
    } finally {
        setLoading(false, 'signupBtn');
    }
}

// Login function
async function login(email, password) {
    try {
        setLoading(true, 'loginBtn');

        // Sign in with Firebase Auth
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const uid = userCredential.user.uid;

        // Get user data from Firestore
        const userDoc = await getDoc(doc(db, 'users', uid));

        if (!userDoc.exists()) {
            throw new Error('User data not found.');
        }

        const userData = userDoc.data();
        const storedRole = userData.role;

        // Check if user's registration is pending
        if (storedRole === PENDING_ROLE) {
            await auth.signOut();
            throw new Error('Your registration is pending approval.');
        }

        // Check if user is admin
        if (storedRole !== ADMIN_ROLE) {
            await auth.signOut();
            throw new Error('Access denied. Admin privileges required.');
        }

        // Store role in localStorage
        localStorage.setItem('loggedInRole', storedRole);
        localStorage.setItem('userId', uid);

        // Success - redirect to admin dashboard
        window.location.href = 'dashboard.html';

    } catch (error) {
        console.error('Login error:', error);
        let errorMessage = 'Login failed. Please check your credentials.';

        if (error.code === 'auth/user-not-found') {
            errorMessage = 'No account found with this email.';
        } else if (error.code === 'auth/wrong-password') {
            errorMessage = 'Incorrect password.';
        } else if (error.message.includes('pending approval')) {
            errorMessage = error.message;
        } else if (error.message.includes('Access denied')) {
            errorMessage = error.message;
        }

        showError(errorMessage);
    } finally {
        setLoading(false, 'loginBtn');
    }
}

// Sign Up Form Handler
const signupForm = document.getElementById('signupForm');
if (signupForm) {
    signupForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;
        const confirmPassword = document.getElementById('confirmPassword').value;
        const fullName = document.getElementById('fullName').value.trim();

        // Get token from URL
        const urlParams = new URLSearchParams(window.location.search);
        const token = urlParams.get('token');

        // Validation
        if (!token) {
            showError('Invalid registration link. Please use the link provided by an admin.');
            return;
        }

        if (!email || !password || !confirmPassword || !fullName) {
            showError('All fields are required.');
            return;
        }

        if (password !== confirmPassword) {
            showError('Passwords do not match.');
            return;
        }

        if (password.length < 6) {
            showError('Password must be at least 6 characters long.');
            return;
        }

        await register(email, password, fullName, token);
    });
}

// Login Form Handler
const loginForm = document.getElementById('loginForm');
if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;

        // Validation
        if (!email || !password) {
            showError('Email and password are required.');
            return;
        }

        await login(email, password);
    });
}

// Do not auto-redirect if on login/signup page
// This prevents issues with the pending registration flow
// import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
// onAuthStateChanged(auth, (user) => {
//     if (user) {
//         // User is already logged in, redirect to dashboard
//         window.location.href = 'dashboard.html';
//     }
// });