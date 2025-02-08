import React, { useState, useEffect, useCallback } from 'react';
import authService from '../utils/authService';
import GmailAPI from '../utils/gmailAPI';
import openaiAPI from '../utils/openaiAPI';

function MainContent() {
  const [emailContents, setEmailContents] = useState([]);
  const [selectedSnippets, setSelectedSnippets] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const loadEmails = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const accessToken = authService.getAccessToken();
      console.log('Access token available:', !!accessToken);
      console.log('Token preview:', accessToken ? `${accessToken.substring(0, 10)}...` : 'No token');
      
      const gmailAPI = new GmailAPI(accessToken);
      console.log('Gmail API instance created');
      
      const emails = await gmailAPI.fetchEmails();
      console.log('Emails fetched:', emails.length);
      
      setEmailContents(emails);
    } catch (error) {
      console.error('Detailed error in loadEmails:', error);
      setError(error.message || 'Failed to load emails. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleAuthentication = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      if (!process.env.REACT_APP_GOOGLE_CLIENT_ID) {
        throw new Error('Google Client ID not configured');
      }
      
      await authService.signIn();
      setIsAuthenticated(true);
      await loadEmails();
    } catch (error) {
      console.error('Authentication error:', error);
      setError(
        error.message === 'Google Client ID not configured'
          ? 'Application not properly configured. Please check the setup.'
          : 'Failed to authenticate. Please try again.'
      );
    } finally {
      setIsLoading(false);
    }
  }, [loadEmails]);

  useEffect(() => {
    if (authService.isAuthenticated()) {
      setIsAuthenticated(true);
      loadEmails();
    } else {
      handleAuthentication();
    }
  }, [handleAuthentication, loadEmails]);

  const handleRetry = () => {
    if (!isAuthenticated) {
      handleAuthentication();
    } else {
      loadEmails();
    }
  };

  const handleContentClick = async (content) => {
    try {
      setIsLoading(true);
      const suggestions = await openaiAPI.generateLinkedInPosts(content.fullContent || content.body);
      setSelectedSnippets(suggestions);
    } catch (error) {
      console.error('Error generating snippets:', error);
      // Show error in the snippets section
      setSelectedSnippets([{
        id: 'error',
        content: 'Failed to generate LinkedIn posts. Please try again.'
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="main-content">
      <div className="container-grid">
        <div className="content-container">
          <div className="input-label">Content</div>
          <div className="scrollable-stack">
            {isLoading ? (
              <div className="loading">
                <div className="loading-spinner"></div>
                <p>Loading emails...</p>
              </div>
            ) : error ? (
              <div className="error">
                <p>{error}</p>
                <button className="retry-button" onClick={handleRetry}>
                  Try Again
                </button>
              </div>
            ) : emailContents.length === 0 ? (
              <div className="empty-state">No emails found</div>
            ) : (
              emailContents.map((content) => (
                <div
                  key={content.id}
                  className="content-item"
                  onClick={() => handleContentClick(content)}
                >
                  <h3 className="content-headline">{content.headline}</h3>
                  <p className="content-body">{content.body}</p>
                </div>
              ))
            )}
          </div>
        </div>
        
        <div className="snippets-container">
          <div className="input-label">Generated Posts</div>
          <div className="scrollable-stack">
            {selectedSnippets.map((snippet) => (
              <div key={snippet.id} className="snippet-item">
                {snippet.content}
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}

export default MainContent; 