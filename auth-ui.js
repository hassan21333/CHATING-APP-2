export const getLoginPageHtml = () => `
  <div class="auth-container">
    <div class="auth-form">
      <h1>Log In</h1>
      <form id="login-form">
        <div class="form-group">
          <label for="phone">Phone Number</label>
          <input type="tel" id="phone" required>
        </div>
        <div class="form-group">
          <label for="password">Password</label>
          <input type="password" id="password" required>
        </div>
        <button type="submit">Log In</button>
        <p class="switch-auth">Don't have an account? <a href="#" id="go-to-signup">Sign Up</a></p>
      </form>
    </div>
  </div>
`;

export const getSignupPageHtml = () => `
  <div class="auth-container">
    <div class="auth-form">
      <h1>Sign Up</h1>
      <form id="signup-form">
        <div class="form-group">
          <label for="fullname">Full Name</label>
          <input type="text" id="fullname" required>
        </div>
        <div class="form-group">
          <label for="phone">Phone Number</label>
          <input type="tel" id="phone" required>
        </div>
        <div class="form-group">
          <label for="email">Email Address</label>
          <input type="email" id="email" required>
        </div>
        <div class="form-group">
          <label for="password">Password</label>
          <input type="password" id="password" required>
        </div>
        <button type="submit">Sign Up</button>
        <p class="switch-auth">Already have an account? <a href="#" id="go-to-login">Log In</a></p>
      </form>
    </div>
  </div>
`;
