import { auth, db } from './app.js';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";
import { ref, set, get, query, orderByChild, equalTo } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-database.js";
import { navigate } from './router.js';

export async function handleSignup() {
    const fullname = document.getElementById('fullname').value;
    const phone = document.getElementById('phone').value;
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    if (!fullname || !phone || !email || !password) {
        alert('Please fill in all fields.');
        return;
    }

    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // Add user details to the Realtime Database
        await set(ref(db, 'users/' + user.uid), {
            fullname: fullname,
            phone: phone,
            email: email,
        });

        // The onAuthStateChanged listener in app.js will handle navigation
    } catch (error) {
        console.error("Error signing up:", error);
        alert(`Error: ${error.message}`);
    }
}

export async function handleLogin() {
    const phone = document.getElementById('phone').value;
    const password = document.getElementById('password').value;

    if (!phone || !password) {
        alert('Please fill in all fields.');
        return;
    }

    try {
        // 1. Find user by phone number in the database
        const usersRef = ref(db, 'users');
        const q = query(usersRef, orderByChild('phone'), equalTo(phone));
        const snapshot = await get(q);

        if (snapshot.exists()) {
            const userData = snapshot.val();
            const userId = Object.keys(userData)[0];
            const userEmail = userData[userId].email;

            // 2. Sign in with email and password
            await signInWithEmailAndPassword(auth, userEmail, password);
            // The onAuthStateChanged listener in app.js will handle navigation
        } else {
            throw new Error('User with this phone number not found.');
        }
    } catch (error) {
        console.error("Error logging in:", error);
        alert(`Error: ${error.message}`);
    }
}

export function handleLogout() {
    signOut(auth).catch(error => {
        console.error("Error signing out:", error);
        alert(`Error: ${error.message}`);
    });
}
