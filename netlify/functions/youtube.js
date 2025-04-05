const ytdl = require('ytdl-core');
const { jsonResponse, validateYouTubeUrl, mapYouTubeError } = require('./utils');

exports.handler = async function(event, context) {
  console.log('🚀 YouTube request received:', {
    method: event.httpMethod,
    query: event.queryStringParameters
  });

  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return jsonResponse(200, {});
  }

  // Validate request method
  if (event.httpMethod !== 'GET') {
    return jsonResponse(405, {
      error: 'Method not allowed',
      message: 'Only GET requests are supported'
    });
  }

  try {
    const url = event.queryStringParameters?.url;
    
    // Validate URL parameter
    if (!url) {
      console.log('❌ Missing URL parameter');
      return jsonResponse(400, {
        error: 'Missing parameter',
        message: 'URL parameter is required'
      });
    }

    // Decode and validate URL
    const decodedUrl = decodeURIComponent(url);
    console.log('📝 Processing URL:', decodedUrl);

    const urlValidation = validateYouTubeUrl(decodedUrl);
    if (!urlValidation.isValid) {
      console.log('❌ URL validation failed:', urlValidation.error);
      return jsonResponse(400, {
        error: 'Invalid URL',
        message: urlValidation.error
      });
    }

    // Additional validation using ytdl-core
    if (!ytdl.validateURL(decodedUrl)) {
      console.log('❌ ytdl validation failed:', decodedUrl);
      return jsonResponse(400, {
        error: 'Invalid video URL',
        message: 'The URL does not point to a valid YouTube video'
      });
    }

    console.log('🎥 Fetching video info for ID:', urlValidation.videoId);
    
    // Set timeout for video info fetch
    const timeoutMs = 10000;
    const videoInfoPromise = ytdl.getInfo(decodedUrl);
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Request timed out')), timeoutMs)
    );

    const info = await Promise.race([videoInfoPromise, timeoutPromise]);
    
    if (!info?.videoDetails) {
      console.log('❌ No video details in response');
      return jsonResponse(500, {
        error: 'Invalid response',
        message: 'Failed to get video details'
      });
    }

    const { videoDetails, formats } = info;

    // Early validation of video status
    if (videoDetails.isLiveContent) {
      return jsonResponse(400, {
        error: 'Live content',
        message: 'Live streams are not supported'
      });
    }

    if (videoDetails.isPrivate) {
      return jsonResponse(403, {
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
      console.log('❌ No downloadable formats available');
      return jsonResponse(404, {
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

    console.log('✅ Success:', {
      id: response.id,
      title: response.title,
      formats: response.formats.length
    });

    return jsonResponse(200, response);

  } catch (error) {
    console.error('❌ Error:', {
      name: error.name,
      message: error.message,
      stack: error.stack?.split('\n')
    });

    const { code, error: errorType, message } = mapYouTubeError(error);
    return jsonResponse(code, { error: errorType, message });
  }
};
