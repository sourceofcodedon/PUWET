import { auth, db } from './firebase-config.js';
import {
    onAuthStateChanged,
    updateProfile,
    updateEmail,
    updatePassword,
    reauthenticateWithCredential,
    EmailAuthProvider,
    signOut
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { doc, getDoc, updateDoc } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

let currentUser = null;
let userDocRef = null;

// Helper function to show messages (success/error)
function showMessage(elementId, message, isError = false) {
    const element = document.getElementById(elementId);
    if (element) {
        element.textContent = message;
        element.className = `text-sm text-center mt-2 ${isError ? 'text-red-500' : 'text-green-500'}`;
        element.classList.remove('hidden');
        setTimeout(() => {
            element.classList.add('hidden');
        }, 5000);
    }
}

// Helper function to show success modal
function showSuccessModal(title, message) {
    const modal = document.getElementById('successModal');
    if (modal) {
        document.getElementById('modalTitle').textContent = title;
        document.getElementById('modalMessage').textContent = message;
        modal.classList.remove('hidden');
        document.body.classList.add('modal-open');

        const okBtn = document.getElementById('modalOkBtn');
        okBtn.onclick = () => {
            modal.classList.add('hidden');
            document.body.classList.remove('modal-open');
            // Reload user data to reflect changes in sidebar
            loadUserData();
        };
    }
}

// Helper function to set loading state on buttons
function setLoading(buttonId, isLoading, originalText) {
    const button = document.getElementById(buttonId);
    if (button) {
        button.disabled = isLoading;
        button.textContent = isLoading ? 'Loading...' : originalText;
        if (isLoading) {
            button.classList.add('loading');
        } else {
            button.classList.remove('loading');
        }
    }
}

// Load user data for sidebar and profile picture preview
async function loadUserData() {
    if (currentUser) {
        document.getElementById('userEmail').textContent = currentUser.email;

        // Fetch user data from Firestore to get the profile picture and username
        userDocRef = doc(db, "users", currentUser.uid);
        const userDocSnap = await getDoc(userDocRef);

        if (userDocSnap.exists()) {
            const userData = userDocSnap.data();
            const profilePictureUrl = currentUser.photoURL || userData.profilePicture;
            const username = userData.username;

            const userImage = document.getElementById('userImage');
            const profilePicturePreview = document.getElementById('profilePicturePreview');
            const newUsernameInput = document.getElementById('newUsername');

            if (profilePictureUrl) {
                userImage.src = profilePictureUrl;
                profilePicturePreview.src = profilePictureUrl;
            } else {
                // Show default SVG if no profile picture
                userImage.src = 'https://via.placeholder.com/40'; // Placeholder for sidebar
                profilePicturePreview.src = 'https://via.placeholder.com/96'; // Placeholder for settings page
            }

            if (username) {
                newUsernameInput.value = username;
            }
        }
    }
}

// Reauthenticate user for sensitive operations
async function reauthenticateUser(currentPassword) {
    const credential = EmailAuthProvider.credential(currentUser.email, currentPassword);
    await reauthenticateWithCredential(currentUser, credential);
}

// Change Username
document.getElementById('changeUsernameForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!currentUser) return;

    const newUsername = document.getElementById('newUsername').value.trim();
    const messageElementId = 'usernameMessage';

    if (!newUsername) {
        showMessage(messageElementId, 'Username cannot be empty.', true);
        return;
    }

    setLoading('changeUsernameBtn', true, 'Update Username');
    try {
        // Update in Firebase Auth profile
        await updateProfile(currentUser, { displayName: newUsername });

        // Update in Firestore
        if (userDocRef) {
            await updateDoc(userDocRef, { username: newUsername });
        }

        showSuccessModal('Username Updated', 'Your username has been successfully updated.');
        showMessage(messageElementId, 'Username updated successfully!', false);
    } catch (error) {
        console.error('Error updating username:', error);
        showMessage(messageElementId, `Failed to update username: ${error.message}`, true);
    } finally {
        setLoading('changeUsernameBtn', false, 'Update Username');
    }
});

// Change Email
document.getElementById('changeEmailForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!currentUser) return;

    const newEmail = document.getElementById('newEmail').value.trim();
    const currentPassword = document.getElementById('currentPasswordEmail').value;
    const messageElementId = 'emailMessage';

    if (!newEmail || !currentPassword) {
        showMessage(messageElementId, 'All fields are required.', true);
        return;
    }

    if (newEmail === currentUser.email) {
        showMessage(messageElementId, 'New email cannot be the same as the current email.', true);
        return;
    }

    setLoading('changeEmailBtn', true, 'Update Email');
    try {
        await reauthenticateUser(currentPassword);
        await updateEmail(currentUser, newEmail);

        // Update in Firestore
        if (userDocRef) {
            await updateDoc(userDocRef, { email: newEmail });
        }

        showSuccessModal('Email Updated', 'Your email has been successfully updated. You will be logged out to re-authenticate with the new email.');
        showMessage(messageElementId, 'Email updated successfully! Please log in again with your new email.', false);
        setTimeout(() => signOut(auth), 3000); // Log out after a delay
    } catch (error) {
        console.error('Error updating email:', error);
        let errorMessage = `Failed to update email: ${error.message}`;
        if (error.code === 'auth/invalid-credential') {
            errorMessage = 'Invalid current password.';
        } else if (error.code === 'auth/email-already-in-use') {
            errorMessage = 'This email is already in use by another account.';
        }
        showMessage(messageElementId, errorMessage, true);
    } finally {
        setLoading('changeEmailBtn', false, 'Update Email');
    }
});

// Change Password
document.getElementById('changePasswordForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!currentUser) return;

    const currentPassword = document.getElementById('currentPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmNewPassword = document.getElementById('confirmNewPassword').value;
    const messageElementId = 'passwordMessage';

    if (!currentPassword || !newPassword || !confirmNewPassword) {
        showMessage(messageElementId, 'All fields are required.', true);
        return;
    }

    if (newPassword !== confirmNewPassword) {
        showMessage(messageElementId, 'New passwords do not match.', true);
        return;
    }

    if (newPassword.length < 6) {
        showMessage(messageElementId, 'New password must be at least 6 characters long.', true);
        return;
    }

    setLoading('changePasswordBtn', true, 'Update Password');
    try {
        await reauthenticateUser(currentPassword);
        await updatePassword(currentUser, newPassword);

        showSuccessModal('Password Updated', 'Your password has been successfully updated.');
        showMessage(messageElementId, 'Password updated successfully!', false);
        document.getElementById('changePasswordForm').reset(); // Clear form
    } catch (error) {
        console.error('Error updating password:', error);
        let errorMessage = `Failed to update password: ${error.message}`;
        if (error.code === 'auth/invalid-credential') {
            errorMessage = 'Invalid current password.';
        }
        showMessage(messageElementId, errorMessage, true);
    } finally {
        setLoading('changePasswordBtn', false, 'Update Password');
    }
});



// Logout functionality (copied from dashboard.js for consistency)
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

// Check authentication state
onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUser = user;
        loadUserData();
    } else {
        console.log('No user logged in, redirecting to login...');
        window.location.href = 'login.html';
    }
});