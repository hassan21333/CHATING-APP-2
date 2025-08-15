export const getMainUIHtml = () => `
  <div class="main-container">
    <header class="top-nav">
      <div class="logo">WhatsApp</div>
      <div class="top-nav-icons">
        <i class="fas fa-search" title="Search"></i>
        <div class="dropdown-container">
            <i id="menu-btn" class="fas fa-ellipsis-v" title="Menu"></i>
            <div id="dropdown-menu" class="dropdown-menu hidden">
                <a href="#">Settings</a>
                <a href="#">Help</a>
                <a href="#" id="logout-btn">Logout</a>
            </div>
        </div>
      </div>
    </header>

    <main id="main-content" class="main-content">
      <!-- Content for Home, Chats, Calls, Profile will be rendered here -->
    </main>

    <footer class="bottom-nav">
      <div class="bottom-nav-item active" data-page="home">
        <i class="fas fa-home"></i>
        <span>Home</span>
      </div>
      <div class="bottom-nav-item" data-page="chats">
        <i class="fas fa-comment-dots"></i>
        <span>Chats</span>
      </div>
      <div class="bottom-nav-item" data-page="calls">
        <i class="fas fa-phone-alt"></i>
        <span>Calls</span>
      </div>
      <div class="bottom-nav-item" data-page="profile">
        <i class="fas fa-user"></i>
        <span>Profile</span>
      </div>
    </footer>
  </div>
`;
