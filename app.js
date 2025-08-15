import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js';
import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js';
import { getDatabase, ref, onValue, onDisconnect, set, serverTimestamp } from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-database.js';
import { firebaseConfig } from './firebase-config.js';
import { initMainApp } from './main-app.js';
import { navigate } from './router.js';
import { initTheme } from './theme.js';

// Apply theme on startup
initTheme();

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);

console.log("Firebase initialized");

// Listen for auth state changes
onAuthStateChanged(auth, user => {
    if (user) {
        // --- PRESENCE SYSTEM ---
        const userStatusDatabaseRef = ref(db, '/status/' + user.uid);

        const isOfflineForDatabase = {
            state: 'offline',
            last_changed: serverTimestamp(),
        };
        const isOnlineForDatabase = {
            state: 'online',
            last_changed: serverTimestamp(),
        };

        const connectedRef = ref(db, '.info/connected');
        onValue(connectedRef, (snapshot) => {
            if (snapshot.val() === false) {
                // If we lose connection, don't do anything. `onDisconnect` will handle it.
                return;
            }
            // When we connect, we set our `onDisconnect` handler
            // This handler will be executed once we disconnect
            onDisconnect(userStatusDatabaseRef).set(isOfflineForDatabase).then(() => {
                // Now that our `onDisconnect` is set, we can safely set our online status
                set(userStatusDatabaseRef, isOnlineForDatabase);
            });
        });

        // --- END PRESENCE SYSTEM ---

        initMainApp(); // Initialize the main application UI
    } else {
        // User is signed out
        console.log('User is logged out');
        navigate('/login');
    }
});

// Export for use in other modules
export { auth, db };
