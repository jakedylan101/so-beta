import axios from 'axios';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env' });
dotenv.config({ path: '.env.local' });

// API Keys for external services
const SOUNDCLOUD_CLIENT_ID = process.env.SOUNDCLOUD_CLIENT_ID || '';
const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY || '';

console.log('Test file for API debugging');
console.log('SoundCloud Client ID:', SOUNDCLOUD_CLIENT_ID ? `${SOUNDCLOUD_CLIENT_ID.substring(0, 4)}...` : 'Not found');
console.log('YouTube API Key:', YOUTUBE_API_KEY ? `${YOUTUBE_API_KEY.substring(0, 4)}...` : 'Not found');

// Test SoundCloud API
async function testSoundCloud() {
  console.log('\n=== Testing SoundCloud API ===');
  
  try {
    // Test direct access using client ID
    console.log('Testing direct SoundCloud API access...');
    const response = await axios.get(`https://api.soundcloud.com/tracks?client_id=${SOUNDCLOUD_CLIENT_ID}&limit=5`);
    
    console.log('SoundCloud API Response Status:', response.status);
    console.log('SoundCloud API Response Data Keys:', Object.keys(response.data));
    console.log('SoundCloud API Items Found:', response.data.collection?.length || 0);
    
    if (response.data.collection && response.data.collection.length > 0) {
      console.log('First track title:', response.data.collection[0].title);
    }
    
    return true;
  } catch (error: any) {
    console.error('SoundCloud API Error:', error.message);
    
    if (error.response) {
      console.error('Response Status:', error.response.status);
      console.error('Response Data:', JSON.stringify(error.response.data));
    }
    
    return false;
  }
}

// Test YouTube API
async function testYouTube() {
  console.log('\n=== Testing YouTube API ===');
  
  try {
    console.log('Testing YouTube API access...');
    const response = await axios.get('https://www.googleapis.com/youtube/v3/search', {
      params: {
        key: YOUTUBE_API_KEY,
        part: 'snippet',
        q: 'dj set',
        type: 'video',
        maxResults: 5
      }
    });
    
    console.log('YouTube API Response Status:', response.status);
    console.log('YouTube API Response Data Keys:', Object.keys(response.data));
    console.log('YouTube API Items Found:', response.data.items?.length || 0);
    
    if (response.data.items && response.data.items.length > 0) {
      console.log('First video title:', response.data.items[0].snippet.title);
    }
    
    return true;
  } catch (error: any) {
    console.error('YouTube API Error:', error.message);
    
    if (error.response) {
      console.error('Response Status:', error.response.status);
      console.error('Response Data:', JSON.stringify(error.response.data));
    }
    
    return false;
  }
}

// Run tests
async function runTests() {
  console.log('\nRunning API tests...');
  
  const soundcloudResult = await testSoundCloud();
  console.log('SoundCloud API test result:', soundcloudResult ? 'SUCCESS' : 'FAILED');
  
  const youtubeResult = await testYouTube();
  console.log('YouTube API test result:', youtubeResult ? 'SUCCESS' : 'FAILED');
  
  console.log('\nTests completed.');
}

// Execute tests
runTests().catch(err => {
  console.error('Test execution error:', err);
}); 