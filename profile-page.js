import { auth, db } from './app.js';
import { ref, get, update } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-database.js";
import { initThemeToggle } from './theme.js';

export const getProfilePageHtml = () => `
  <div class="profile-page-container">
    <div class="profile-header card">
      <div class="profile-picture-container">
        <img id="profile-pic" src="https://i.stack.imgur.com/34AD2.jpg" alt="Profile Picture">
        <label for="profile-pic-upload" class="profile-pic-edit-icon">
          <i class="fas fa-camera"></i>
        </label>
        <input type="file" id="profile-pic-upload" accept="image/*" class="hidden">
      </div>
      <h2 id="profile-fullname-header">Loading...</h2>
    </div>
    <div class="profile-details card">
      <div class="detail-item">
        <label>Full Name</label>
        <p class="value" id="fullname-display"></p>
        <input type="text" class="edit-input hidden" id="fullname-input">
      </div>
      <div class="detail-item">
        <label>Phone Number</label>
        <p class="value" id="phone-display"></p>
        <input type="tel" class="edit-input hidden" id="phone-input">
      </div>
      <div class="detail-item">
        <label>Email Address</label>
        <p class="value" id="email-display"></p>
        <input type="email" class="edit-input hidden" id="email-input" disabled> <!-- Email is used for login, should not be editable -->
      </div>
      <div class="detail-item">
        <label>Bio</label>
        <p class="value" id="bio-display"></p>
        <textarea class="edit-input hidden" id="bio-input"></textarea>
      </div>
      <div class="detail-item theme-switcher-container">
        <label>Theme</label>
        <div class="theme-switcher">
          <i class="fas fa-sun"></i>
          <label class="switch">
            <input type="checkbox" id="theme-toggle">
            <span class="slider round"></span>
          </label>
          <i class="fas fa-moon"></i>
        </div>
      </div>
    </div>
    <button id="edit-profile-btn" class="btn-primary">Edit Profile</button>
  </div>
`;

let isEditMode = false;
let currentUserData = {};

function toggleEditMode(edit) {
    isEditMode = edit;
    const btn = document.getElementById('edit-profile-btn');

    const displayFields = document.querySelectorAll('.profile-details .value');
    const inputFields = document.querySelectorAll('.profile-details .edit-input');

    if (isEditMode) {
        btn.textContent = 'Save Changes';
        displayFields.forEach(el => el.classList.add('hidden'));
        inputFields.forEach(el => el.classList.remove('hidden'));

        document.getElementById('fullname-input').value = currentUserData.fullname || '';
        document.getElementById('phone-input').value = currentUserData.phone || '';
        document.getElementById('email-input').value = currentUserData.email || '';
        document.getElementById('bio-input').value = currentUserData.bio || '';
    } else {
        btn.textContent = 'Edit Profile';
        displayFields.forEach(el => el.classList.remove('hidden'));
        inputFields.forEach(el => el.classList.add('hidden'));
    }
}

async function saveProfileChanges() {
    const user = auth.currentUser;
    if (!user) return;

    const updates = {
        fullname: document.getElementById('fullname-input').value,
        phone: document.getElementById('phone-input').value,
        bio: document.getElementById('bio-input').value,
    };

    try {
        await update(ref(db, 'users/' + user.uid), updates);
        await loadUserProfile();
        toggleEditMode(false);
        alert('Profile updated successfully!');
    } catch (error) {
        console.error("Error updating profile:", error);
        alert('Failed to update profile.');
    }
}

async function loadUserProfile() {
    const user = auth.currentUser;
    if (!user) return;

    const userRef = ref(db, 'users/' + user.uid);
    const snapshot = await get(userRef);

    if (snapshot.exists()) {
        currentUserData = snapshot.val();
        document.getElementById('profile-fullname-header').textContent = currentUserData.fullname;
        document.getElementById('fullname-display').textContent = currentUserData.fullname;
        document.getElementById('phone-display').textContent = currentUserData.phone;
        document.getElementById('email-display').textContent = currentUserData.email;
        document.getElementById('bio-display').textContent = currentUserData.bio || 'No bio set.';
        if (currentUserData.profilePicture) {
            document.getElementById('profile-pic').src = currentUserData.profilePicture;
        }
    }
}

export async function initProfilePage() {
    await loadUserProfile();

    initThemeToggle();

    const editBtn = document.getElementById('edit-profile-btn');
    editBtn.addEventListener('click', () => {
        if (isEditMode) {
            saveProfileChanges();
        } else {
            toggleEditMode(true);
        }
    });

    const uploadInput = document.getElementById('profile-pic-upload');
    uploadInput.addEventListener('change', handleProfilePictureUpload);
}

function handleProfilePictureUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        const base64String = e.target.result;
        const user = auth.currentUser;
        if (!user) return;

        update(ref(db, 'users/' + user.uid), {
            profilePicture: base64String
        }).then(() => {
            document.getElementById('profile-pic').src = base64String;
            alert('Profile picture updated!');
        }).catch(error => {
            console.error("Error updating profile picture:", error);
            alert('Failed to update profile picture.');
        });
    };
    reader.readAsDataURL(file);
}
