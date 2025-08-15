function applyTheme(theme) {
    const body = document.body;
    const themeToggle = document.getElementById('theme-toggle');

    if (theme === 'dark') {
        body.dataset.theme = 'dark';
        if (themeToggle) themeToggle.checked = true;
    } else {
        body.dataset.theme = 'light';
        if (themeToggle) themeToggle.checked = false;
    }
}

export function initTheme() {
    const savedTheme = localStorage.getItem('theme');
    // Default to light theme if nothing is saved
    const currentTheme = savedTheme || 'light';
    applyTheme(currentTheme);
}

export function initThemeToggle() {
    const themeToggle = document.getElementById('theme-toggle');
    if (!themeToggle) return;

    // Set the initial state of the toggle based on the current theme
    const currentTheme = localStorage.getItem('theme') || 'light';
    themeToggle.checked = currentTheme === 'dark';

    themeToggle.addEventListener('change', () => {
        const newTheme = themeToggle.checked ? 'dark' : 'light';
        localStorage.setItem('theme', newTheme);
        applyTheme(newTheme);
    });
}
