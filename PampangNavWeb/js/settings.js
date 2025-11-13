import { auth, db } from './firebase-config.js';
import {
    onAuthStateChanged,
    updateProfile,
    updateEmail,
    updatePassword,
    reauthenticateWithCredential,
    EmailAuthProvider,
    signOut,
    verifyBeforeUpdateEmail
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
                userImage.src = 'https://via.placeholder.com/40';
                profilePicturePreview.src = 'https://via.placeholder.com/96';
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
        await updateProfile(currentUser, { displayName: newUsername });
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

// ✅ FIXED — Change Email (with verification)
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
        const providerId = currentUser.providerData[0]?.providerId;
        if (providerId === 'google.com') {
            showMessage(messageElementId,
                'You cannot change your Google account email here. Please change it in your Google Account settings.',
                true
            );
            return;
        }

        await reauthenticateUser(currentPassword);

<<<<<<< HEAD
        await verifyBeforeUpdateEmail(currentUser, newEmail);

        showSuccessModal(
            'Verify Your New Email',
            `A verification link has been sent to ${newEmail}. Please open that email and confirm to complete the change.`
        );

        showMessage(messageElementId,
            'Verification email sent. Please verify to complete the email change.',
            false
        );

        if (userDocRef) {
            await updateDoc(userDocRef, { pendingEmail: newEmail });
        }

=======
        await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js')
            .then(({ verifyBeforeUpdateEmail }) => verifyBeforeUpdateEmail(currentUser, newEmail));

        showSuccessModal(
            'Verify Your New Email',
            `A verification link has been sent to ${newEmail}. Please open that email and confirm to complete the change.`
        );

        showMessage(messageElementId,
            'Verification email sent. Please verify to complete the email change.',
            false
        );

        if (userDocRef) {
            await updateDoc(userDocRef, { pendingEmail: newEmail });
        }

>>>>>>> 1915045985855251c83c646ea665cc9c7d7e944e
    } catch (error) {
        console.error('Error updating email:', error);
        let errorMessage = `Failed to update email: ${error.message}`;
        if (error.code === 'auth/invalid-credential') {
            errorMessage = 'Invalid current password.';
        } else if (error.code === 'auth/email-already-in-use') {
            errorMessage = 'This email is already in use by another account.';
        } else if (error.code === 'auth/operation-not-allowed') {
            errorMessage = 'Email update not allowed. Verify the new email before changing or check Firebase settings.';
        } else if (error.code === 'auth/requires-recent-login') {
            errorMessage = 'Please log in again before changing your email.';
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
        document.getElementById('changePasswordForm').reset();
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

// Logout functionality
const logoutBtn = document.getElementById('logoutBtn');
if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
        try {
            await signOut(auth);
            localStorage.removeItem('loggedInRole');
            localStorage.removeItem('userId');
            window.location.href = 'login.html';
        } catch (error) {
            console.error('Logout error:', error);
            alert('Error logging out. Please try again.');
        }
    });
}

// ✅ Check authentication state
onAuthStateChanged(auth, async (user) => {
    if (user) {
        currentUser = user;
        await loadUserData();

        // ✅ If user verified new email, update Firestore and show dialog
        if (userDocRef && user.email) {
            const userSnap = await getDoc(userDocRef);
            if (userSnap.exists()) {
                const userData = userSnap.data();
                if (userData.pendingEmail === user.email) {
                    await updateDoc(userDocRef, { email: user.email, pendingEmail: null });

                    // ✅ Show notification after verified email update
                    showSuccessModal(
                        'Email Updated',
                        `Your email address has been successfully changed to ${user.email}.`
                    );
                    showMessage('emailMessage', 'Email has been changed successfully.', false);
                }
            }
        }
    } else {
        window.location.href = 'login.html';
    }
<<<<<<< HEAD
})
=======
});
>>>>>>> 1915045985855251c83c646ea665cc9c7d7e944e
