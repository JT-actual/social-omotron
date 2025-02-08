import axios from 'axios';

const GMAIL_API_BASE_URL = 'https://gmail.googleapis.com/gmail/v1/users/me';

// Helper function to decode base64 in the browser
function base64Decode(str) {
  return decodeURIComponent(
    atob(str.replace(/-/g, '+').replace(/_/g, '/'))
      .split('')
      .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
      .join('')
  );
}

class GmailAPI {
  constructor(accessToken) {
    if (!accessToken) {
      throw new Error('Access token is required');
    }
    console.log('Initializing Gmail API with token:', accessToken.substring(0, 10) + '...');
    
    this.axiosInstance = axios.create({
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
  }

  async fetchEmails(maxResults = 10) {
    try {
      console.log('Fetching emails from Gmail API...');
      console.log('Request URL:', `${GMAIL_API_BASE_URL}/messages`);
      console.log('Request params:', { maxResults, q: 'in:inbox -category:{social promotions}' });
      
      const response = await this.axiosInstance.get(`${GMAIL_API_BASE_URL}/messages`, {
        params: {
          maxResults,
          q: 'in:inbox -category:{social promotions}',
        },
      });

      if (!response.data.messages || !response.data.messages.length) {
        console.log('No emails found in response');
        return [];
      }

      console.log(`Found ${response.data.messages.length} emails, fetching content...`);
      
      const emails = await Promise.all(
        response.data.messages.map(message => this.fetchEmailContent(message.id))
      );

      console.log('Email content fetched successfully');
      return emails.map(email => ({
        id: email.id,
        headline: email.subject,
        body: email.snippet,
        fullContent: email.body,
      }));
    } catch (error) {
      console.error('Detailed error information:');
      console.error('Error object:', error);
      console.error('Response data:', error.response?.data);
      console.error('Response status:', error.response?.status);
      console.error('Response headers:', error.response?.headers);
      
      if (error.response?.status === 403) {
        throw new Error('Access denied. Please check Gmail API permissions and ensure the API is enabled.');
      } else if (error.response?.status === 401) {
        throw new Error('Authentication expired or invalid. Please sign in again.');
      } else if (error.response?.data?.error) {
        throw new Error(`Gmail API Error: ${error.response.data.error.message}`);
      }
      throw new Error('Failed to fetch emails: ' + (error.message || 'Unknown error'));
    }
  }

  async fetchEmailContent(messageId) {
    try {
      const response = await this.axiosInstance.get(`${GMAIL_API_BASE_URL}/messages/${messageId}`);
      const message = response.data;
      
      const headers = message.payload.headers;
      const subject = headers.find(header => header.name === 'Subject')?.value || 'No Subject';
      
      // Extract email body
      let body = '';
      if (message.payload.parts) {
        body = this.getBodyFromParts(message.payload.parts);
      } else if (message.payload.body.data) {
        body = base64Decode(message.payload.body.data);
      }

      return {
        id: message.id,
        subject,
        snippet: message.snippet,
        body: this.cleanEmailContent(body),
      };
    } catch (error) {
      console.error('Error fetching email content:', error.response || error);
      throw new Error('Failed to fetch email content: ' + (error.response?.data?.error?.message || error.message));
    }
  }

  getBodyFromParts(parts) {
    let body = '';
    parts.forEach(part => {
      if (part.mimeType === 'text/plain' && part.body.data) {
        body += base64Decode(part.body.data);
      } else if (part.parts) {
        body += this.getBodyFromParts(part.parts);
      }
    });
    return body;
  }

  cleanEmailContent(content) {
    // Remove email signatures, quoted replies, etc.
    return content
      .replace(/(On\s.*wrote:)[\s\S]*$/gm, '') // Remove quoted replies
      .replace(/--[\s\S]*$/, '') // Remove signatures
      .trim();
  }
}

export default GmailAPI; 