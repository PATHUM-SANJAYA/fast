const ytdl = require('ytdl-core');
const { jsonResponse, validateYouTubeUrl, mapYouTubeError } = require('./utils');

// Basic response helpers
const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Content-Type': 'application/json'
};

// Safe JSON response helper
const safeJsonResponse = (statusCode, data) => {
  try {
    return {
      statusCode,
      headers,
      body: JSON.stringify(data)
    };
  } catch (error) {
    console.error(' JSON stringify error:', error);
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

exports.handler = async function(event, context) {
  console.log(' Request received:', {
    method: event.httpMethod,
    query: event.queryStringParameters
  });

  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return safeJsonResponse(200, {});
  }

  // Validate request method
  if (event.httpMethod !== 'GET') {
    return safeJsonResponse(405, {
      error: 'Method not allowed',
      message: 'Only GET requests are supported'
    });
  }

  try {
    const url = event.queryStringParameters?.url;
    
    // Validate URL parameter
    if (!url) {
      console.log(' Missing URL parameter');
      return safeJsonResponse(400, {
        error: 'Missing parameter',
        message: 'URL parameter is required'
      });
    }

    // Decode and validate URL
    const decodedUrl = decodeURIComponent(url);
    console.log(' Processing URL:', decodedUrl);

    const urlValidation = validateYouTubeUrl(decodedUrl);
    if (!urlValidation.isValid) {
      console.log(' URL validation failed:', urlValidation.error);
      return safeJsonResponse(400, {
        error: 'Invalid URL',
        message: urlValidation.error
      });
    }

    // Additional validation using ytdl-core
    if (!ytdl.validateURL(decodedUrl)) {
      console.log(' ytdl validation failed:', decodedUrl);
      return safeJsonResponse(400, {
        error: 'Invalid video URL',
        message: 'The URL does not point to a valid YouTube video'
      });
    }

    console.log(' Fetching video info for ID:', urlValidation.videoId);
    
    // Set timeout for video info fetch
    const timeoutMs = 10000;
    const videoInfoPromise = ytdl.getInfo(decodedUrl);
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Request timed out')), timeoutMs)
    );

    const info = await Promise.race([videoInfoPromise, timeoutPromise]);
    
    if (!info?.videoDetails) {
      console.log(' No video details in response');
      return safeJsonResponse(500, {
        error: 'Invalid response',
        message: 'Failed to get video details'
      });
    }

    const { videoDetails, formats } = info;

    // Early validation of video status
    if (videoDetails.isLiveContent) {
      return safeJsonResponse(400, {
        error: 'Live content',
        message: 'Live streams are not supported'
      });
    }

    if (videoDetails.isPrivate) {
      return safeJsonResponse(403, {
        error: 'Private video',
        message: 'This video is private'
      });
    }

    // Filter and map formats
    const mappedFormats = formats
      .filter(format => format.hasVideo && format.hasAudio)
      .map(format => ({
        format_id: format.itag?.toString() || '',
        ext: format.container || 'mp4',
        height: format.height || 0,
        width: format.width || 0,
        filesize: parseInt(format.contentLength || '0', 10),
        format_note: format.qualityLabel || 'Unknown',
        fps: format.fps || 0,
        vcodec: format.codecs || 'unknown',
        acodec: format.audioCodec || 'unknown',
        url: format.url
      }))
      .sort((a, b) => b.height - a.height);

    if (mappedFormats.length === 0) {
      console.log(' No downloadable formats available');
      return safeJsonResponse(404, {
        error: 'No formats',
        message: 'No downloadable formats found for this video'
      });
    }

    const response = {
      id: urlValidation.videoId,
      title: videoDetails.title || 'Untitled',
      description: videoDetails.description || '',
      duration: parseInt(videoDetails.lengthSeconds) || 0,
      view_count: parseInt(videoDetails.viewCount) || 0,
      thumbnail: videoDetails.thumbnails?.[0]?.url || '',
      channel: {
        id: videoDetails.channelId || '',
        name: videoDetails.author?.name || 'Unknown',
        url: videoDetails.author?.channel_url || ''
      },
      formats: mappedFormats,
      platform: 'youtube'
    };

    console.log(' Sending response:', {
      id: response.id,
      title: response.title,
      formats: response.formats.length
    });

    return safeJsonResponse(200, response);

  } catch (error) {
    console.error(' Error details:', {
      name: error.name,
      message: error.message,
      stack: error.stack?.split('\n')
    });

    // Map specific error types to appropriate responses
    if (error.message?.includes('timeout')) {
      return safeJsonResponse(504, {
        error: 'Timeout',
        message: 'Request timed out while fetching video information'
      });
    }
    if (error.message?.includes('age-restricted')) {
      return safeJsonResponse(403, {
        error: 'Age restricted',
        message: 'Age-restricted videos are not supported'
      });
    }
    if (error.message?.includes('private')) {
      return safeJsonResponse(403, {
        error: 'Private video',
        message: 'Private videos cannot be accessed'
      });
    }
    if (error.message?.includes('not found') || error.message?.includes('not exist')) {
      return safeJsonResponse(404, {
        error: 'Not found',
        message: 'The requested video does not exist'
      });
    }
    if (error.message?.includes('unavailable')) {
      return safeJsonResponse(410, {
        error: 'Unavailable',
        message: 'This video is no longer available'
      });
    }
    if (error.message?.includes('copyright')) {
      return safeJsonResponse(403, {
        error: 'Copyright',
        message: 'This video is not available due to copyright restrictions'
      });
    }

    // Generic error response
    return safeJsonResponse(500, {
      error: 'Server error',
      message: process.env.NODE_ENV === 'development' 
        ? error.message 
        : 'An unexpected error occurred'
    });
  }
};