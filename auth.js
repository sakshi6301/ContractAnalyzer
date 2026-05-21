// ═══════════════════════════════════════════════════════════
//  AUTH MANAGER — Client-side authentication with localStorage
//  Handles registration, login, sessions, and user profiles
// ═══════════════════════════════════════════════════════════

class AuthManager {
  constructor() {
    this.USERS_KEY = 'cra_users';
    this.SESSION_KEY = 'cra_session';
    this.HISTORY_KEY = 'cra_history';
  }

  // ── Password Hashing (SHA-256 via Web Crypto) ──
  async _hashPassword(password) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password + '_cra_salt_2024');
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  // ── Get Users DB ──
  _getUsers() {
    try {
      return JSON.parse(localStorage.getItem(this.USERS_KEY)) || {};
    } catch {
      return {};
    }
  }

  _saveUsers(users) {
    localStorage.setItem(this.USERS_KEY, JSON.stringify(users));
  }

  // ── Register ──
  async register(name, email, password) {
    const emailLower = email.toLowerCase().trim();
    const users = this._getUsers();

    if (users[emailLower]) {
      return { success: false, error: 'An account with this email already exists.' };
    }

    if (password.length < 6) {
      return { success: false, error: 'Password must be at least 6 characters.' };
    }

    if (!name.trim()) {
      return { success: false, error: 'Please enter your full name.' };
    }

    if (!this._isValidEmail(emailLower)) {
      return { success: false, error: 'Please enter a valid email address.' };
    }

    const hashedPassword = await this._hashPassword(password);
    
    users[emailLower] = {
      name: name.trim(),
      email: emailLower,
      password: hashedPassword,
      createdAt: new Date().toISOString(),
      avatar: this._generateAvatar(name.trim())
    };

    this._saveUsers(users);

    return { success: true, user: this._sanitizeUser(users[emailLower]) };
  }

  // ── Login ──
  async login(email, password) {
    const emailLower = email.toLowerCase().trim();
    const users = this._getUsers();
    const user = users[emailLower];

    if (!user) {
      return { success: false, error: 'No account found with this email.' };
    }

    const hashedPassword = await this._hashPassword(password);
    
    if (user.password !== hashedPassword) {
      return { success: false, error: 'Incorrect password. Please try again.' };
    }

    this._createSession(user);
    return { success: true, user: this._sanitizeUser(user) };
  }

  // ── Logout ──
  logout() {
    localStorage.removeItem(this.SESSION_KEY);
  }

  // ── Session Management ──
  _createSession(user) {
    const session = {
      email: user.email,
      name: user.name,
      avatar: user.avatar,
      loginAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days
    };
    localStorage.setItem(this.SESSION_KEY, JSON.stringify(session));
  }

  getCurrentUser() {
    try {
      const session = JSON.parse(localStorage.getItem(this.SESSION_KEY));
      if (!session) return null;
      
      // Check expiry
      if (new Date(session.expiresAt) < new Date()) {
        this.logout();
        return null;
      }

      return session;
    } catch {
      return null;
    }
  }

  isLoggedIn() {
    return this.getCurrentUser() !== null;
  }

  // ── Analysis History ──
  saveAnalysis(results, contractPreview) {
    const user = this.getCurrentUser();
    if (!user) return;

    const history = this._getHistory(user.email);
    history.unshift({
      id: Date.now().toString(36) + Math.random().toString(36).substr(2, 5),
      date: new Date().toISOString(),
      overallScore: results.overallScore,
      verdict: results.overallVerdict.label,
      totalFindings: results.stats.totalFindings,
      critical: results.stats.critical,
      high: results.stats.high,
      medium: results.stats.medium,
      low: results.stats.low,
      preview: contractPreview.substring(0, 120) + '...',
      categories: Object.keys(results.categoryScores).length
    });

    // Keep last 20 analyses
    if (history.length > 20) history.length = 20;

    const allHistory = this._getAllHistory();
    allHistory[user.email] = history;
    localStorage.setItem(this.HISTORY_KEY, JSON.stringify(allHistory));
  }

  getHistory() {
    const user = this.getCurrentUser();
    if (!user) return [];
    return this._getHistory(user.email);
  }

  _getHistory(email) {
    const allHistory = this._getAllHistory();
    return allHistory[email] || [];
  }

  _getAllHistory() {
    try {
      return JSON.parse(localStorage.getItem(this.HISTORY_KEY)) || {};
    } catch {
      return {};
    }
  }

  deleteHistoryItem(id) {
    const user = this.getCurrentUser();
    if (!user) return;
    const allHistory = this._getAllHistory();
    const history = allHistory[user.email] || [];
    allHistory[user.email] = history.filter(h => h.id !== id);
    localStorage.setItem(this.HISTORY_KEY, JSON.stringify(allHistory));
  }

  // ── Helpers ──
  _isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  _sanitizeUser(user) {
    return { name: user.name, email: user.email, avatar: user.avatar, createdAt: user.createdAt };
  }

  _generateAvatar(name) {
    const initials = name.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase();
    const colors = ['#7c3aed', '#06b6d4', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#8b5cf6'];
    const color = colors[name.length % colors.length];
    return { initials, color };
  }

  // ── Password Strength ──
  getPasswordStrength(password) {
    let score = 0;
    if (password.length >= 6) score++;
    if (password.length >= 8) score++;
    if (password.length >= 12) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;

    if (score <= 1) return { level: 'weak', label: 'Weak', color: '#ef4444', percent: 20 };
    if (score <= 2) return { level: 'fair', label: 'Fair', color: '#f59e0b', percent: 40 };
    if (score <= 3) return { level: 'good', label: 'Good', color: '#06b6d4', percent: 65 };
    if (score <= 4) return { level: 'strong', label: 'Strong', color: '#10b981', percent: 85 };
    return { level: 'excellent', label: 'Excellent', color: '#10b981', percent: 100 };
  }
}

// Global instance
const auth = new AuthManager();
