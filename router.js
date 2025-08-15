import { getLoginPageHtml, getSignupPageHtml } from './auth-ui.js';
import { handleLogin, handleSignup } from './auth.js';
import { getMainUIHtml } from './main-ui.js';
import { initMainApp } from './main-app.js';

const authRoutes = {
    '/': getLoginPageHtml,
    '/login': getLoginPageHtml,
    '/signup': getSignupPageHtml,
};

const appContainer = document.getElementById('app');

export function navigate(path) {
    if (authRoutes[path]) {
        appContainer.innerHTML = authRoutes[path]();
        addAuthEventListeners(path);
    } else {
        // Any other path is considered part of the main app for a logged-in user
        appContainer.innerHTML = getMainUIHtml();
        initMainApp();
    }
}

function addAuthEventListeners(path) {
    if (path === '/login' || path === '/') {
        const signupLink = document.getElementById('go-to-signup');
        if (signupLink) {
            signupLink.addEventListener('click', (e) => {
                e.preventDefault();
                navigate('/signup');
            });
        }
        const loginForm = document.getElementById('login-form');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => {
                e.preventDefault();
                handleLogin();
            });
        }
    } else if (path === '/signup') {
        const loginLink = document.getElementById('go-to-login');
        if (loginLink) {
            loginLink.addEventListener('click', (e) => {
                e.preventDefault();
                navigate('/login');
            });
        }
        const signupForm = document.getElementById('signup-form');
        if (signupForm) {
            signupForm.addEventListener('submit', (e) => {
                e.preventDefault();
                handleSignup();
            });
        }
    }
}
