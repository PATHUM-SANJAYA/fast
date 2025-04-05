// Response helpers
const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Content-Type': 'application/json'
};

// Safe JSON response helper
const jsonResponse = (statusCode, data) => {
  try {
    return {
      statusCode,
      headers,
      body: JSON.stringify(data)
    };
  } catch (error) {
    console.error('❌ JSON stringify error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to serialize response',
        message: 'Internal server error'
      })
    };
  }
};

// YouTube URL validation
const validateYouTubeUrl = (url) => {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.toLowerCase();
    
    // Validate hostname
    if (!['youtube.com', 'www.youtube.com', 'youtu.be', 'www.youtu.be'].includes(hostname)) {
      return { isValid: false, error: 'Invalid YouTube domain' };
    }

    // Extract and validate video ID
    let videoId;
    if (hostname.includes('youtu.be')) {
      videoId = urlObj.pathname.slice(1);
    } else {
      videoId = urlObj.searchParams.get('v');
    }

    if (!videoId || videoId.length !== 11) {
      return { isValid: false, error: 'Invalid video ID format' };
    }

    return { isValid: true, videoId };
  } catch (error) {
    return { isValid: false, error: 'Invalid URL format' };
  }
};

// Error mapping
const mapYouTubeError = (error) => {
  if (error.message?.includes('timeout')) {
    return { code: 504, error: 'Timeout', message: 'Request timed out' };
  }
  if (error.message?.includes('age-restricted')) {
    return { code: 403, error: 'Age restricted', message: 'Age-restricted videos are not supported' };
  }
  if (error.message?.includes('private')) {
    return { code: 403, error: 'Private video', message: 'Private videos cannot be accessed' };
  }
  if (error.message?.includes('not found') || error.message?.includes('not exist')) {
    return { code: 404, error: 'Not found', message: 'The requested video does not exist' };
  }
  if (error.message?.includes('unavailable')) {
    return { code: 410, error: 'Unavailable', message: 'This video is no longer available' };
  }
  if (error.message?.includes('copyright')) {
    return { code: 403, error: 'Copyright', message: 'This video is not available due to copyright restrictions' };
  }
  
  return { 
    code: 500, 
    error: 'Server error',
    message: process.env.NODE_ENV === 'development' ? error.message : 'An unexpected error occurred'
  };
};

module.exports = {
  headers,
  jsonResponse,
  validateYouTubeUrl,
  mapYouTubeError
};
