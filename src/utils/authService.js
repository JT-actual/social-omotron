const SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
];

const TOKEN_STORAGE_KEY = 'gmail_access_token';

class AuthService {
  constructor() {
    this.accessToken = localStorage.getItem(TOKEN_STORAGE_KEY);
  }

  async initializeGoogleAuth() {
    return new Promise((resolve, reject) => {
      const waitForGapi = (retries = 0) => {
        if (retries > 20) {
          reject(new Error('Google API failed to load'));
          return;
        }

        if (!window.gapi) {
          console.log('Waiting for GAPI to load...');
          setTimeout(() => waitForGapi(retries + 1), 100);
          return;
        }

        window.gapi.load('client:auth2', async () => {
          try {
            console.log('Initializing GAPI client...');
            
            if (!process.env.REACT_APP_GOOGLE_CLIENT_ID) {
              console.error('No client ID found in environment');
              throw new Error('Google Client ID not configured');
            }

            await window.gapi.client.init({
              clientId: process.env.REACT_APP_GOOGLE_CLIENT_ID,
              scope: SCOPES.join(' '),
              plugin_name: 'JTs Socialomatron'
            });
            
            console.log('GAPI client initialized');
            const authInstance = window.gapi.auth2.getAuthInstance();
            if (!authInstance) {
              throw new Error('Failed to get auth instance');
            }

            // Check if user is already signed in
            if (authInstance.isSignedIn.get()) {
              const user = authInstance.currentUser.get();
              this.accessToken = user.getAuthResponse().access_token;
              localStorage.setItem(TOKEN_STORAGE_KEY, this.accessToken);
            }

            resolve(authInstance);
          } catch (error) {
            console.error('Google Auth initialization error:', error);
            reject(error);
          }
        });
      };

      waitForGapi();
    });
  }

  async signIn() {
    try {
      console.log('Starting sign in process...');
      const auth = await this.initializeGoogleAuth();
      
      console.log('Requesting user consent...');
      const user = await auth.signIn({
        prompt: 'select_account'  // Changed to allow account selection
      });
      
      console.log('User signed in successfully');
      this.accessToken = user.getAuthResponse().access_token;
      localStorage.setItem(TOKEN_STORAGE_KEY, this.accessToken);
      return this.accessToken;
    } catch (error) {
      console.error('Detailed sign-in error:', error);
      if (error.error === 'popup_blocked_by_browser') {
        throw new Error('Please allow popups for this site to sign in');
      }
      throw error;
    }
  }

  async signOut() {
    try {
      const auth = await this.initializeGoogleAuth();
      await auth.signOut();
      this.accessToken = null;
      localStorage.removeItem(TOKEN_STORAGE_KEY);
    } catch (error) {
      console.error('Error signing out:', error);
      throw error;
    }
  }

  getAccessToken() {
    return this.accessToken;
  }

  isAuthenticated() {
    return !!this.accessToken;
  }
}

const authServiceInstance = new AuthService();
export default authServiceInstance; 