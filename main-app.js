import { getProfilePageHtml, initProfilePage } from './profile-page.js';
import { getChatsPageHtml, initChatsPage } from './chats-page.js';
import { getCallsPageHtml, initCallsPage } from './calls-page.js';
import { getChatWindowHtml, initChatWindow } from './chat-window.js';
import { getMainUIHtml } from './main-ui.js';
import { handleLogout } from './auth.js';

const appContainer = document.getElementById('app');

const pages = {
    'home': {
        html: getChatsPageHtml, // Home is the same as chats
        init: initChatsPage
    },
    'chats': {
        html: getChatsPageHtml,
        init: initChatsPage
    },
    'calls': {
        html: getCallsPageHtml,
        init: initCallsPage
    },
    'profile': {
        html: getProfilePageHtml,
        init: initProfilePage
    },
};

function showChatWindow(chatId, otherUser) {
    const onBack = () => showMainApp('chats');
    appContainer.innerHTML = getChatWindowHtml(otherUser);
    initChatWindow(chatId, otherUser, onBack);
}

function renderTabContent(pageName) {
    const mainContent = document.getElementById('main-content');
    const page = pages[pageName];
    if (!mainContent || !page) return;

    mainContent.innerHTML = typeof page.html === 'function' ? page.html() : page.html;

    if (pageName === 'chats' || pageName === 'home') {
        page.init(showChatWindow); // Pass the navigation function
    } else {
        page.init();
    }

    // Update active nav item
    document.querySelectorAll('.bottom-nav-item').forEach(item => item.classList.remove('active'));
    const activeItem = document.querySelector(`.bottom-nav-item[data-page="${pageName}"]`);
    if (activeItem) {
        activeItem.classList.add('active');
    }
}

function showMainApp(initialTab = 'chats') {
    appContainer.innerHTML = getMainUIHtml();

    // Bottom Nav listeners
    document.querySelectorAll('.bottom-nav-item').forEach(item => {
        item.addEventListener('click', () => {
            const pageName = item.dataset.page;
            renderTabContent(pageName);
        });
    });

    // Top Nav Menu listeners
    const menuBtn = document.getElementById('menu-btn');
    const dropdownMenu = document.getElementById('dropdown-menu');

    menuBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        dropdownMenu.classList.toggle('hidden');
    });

    document.getElementById('logout-btn').addEventListener('click', (e) => {
        e.preventDefault();
        handleLogout();
    });

    // Global listener to close dropdown
    document.addEventListener('click', () => {
        if (!dropdownMenu.classList.contains('hidden')) {
            dropdownMenu.classList.add('hidden');
        }
    });

    renderTabContent(initialTab);
}

export function initMainApp() {
    showMainApp();
}
