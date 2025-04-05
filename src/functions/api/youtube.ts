import { Handler } from '@netlify/functions';
import ytdl from 'ytdl-core';

interface VideoFormat {
  format_id: string;
  ext: string;
  height: number;
  width: number;
  filesize: number;
  format_note: string;
  fps: number;
  vcodec: string;
  acodec: string;
  url: string;
}

interface VideoResponse {
  id: string;
  title: string;
  description: string;
  duration: number;
  view_count: number;
  thumbnail: string;
  channel: {
    id: string;
    name: string;
    url: string;
  };
  formats: VideoFormat[];
  platform: string;
}

interface YTFormat {
  itag?: number;
  container?: string;
  height?: number;
  width?: number;
  contentLength?: string;
  qualityLabel?: string;
  fps?: number;
  codecs?: string;
  audioCodec?: string;
  url: string;
  hasVideo: boolean;
  hasAudio: boolean;
}

interface YTInfo {
  videoDetails: {
    videoId: string;
    title: string;
    description: string;
    lengthSeconds: string;
    viewCount: string;
    thumbnails: Array<{ url: string }>;
    channelId: string;
    author: {
      name: string;
      channel_url: string;
    };
    isLiveContent: boolean;
    isPrivate: boolean;
  };
  formats: YTFormat[];
}

export const handler: Handler = async (event) => {
  // Set CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Content-Type': 'application/json'
  };

  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  // Validate request method
  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({
        error: 'Method not allowed',
        message: 'Only GET requests are supported'
      })
    };
  }

  try {
    const url = event.queryStringParameters?.url;
    
    // Validate URL parameter
    if (!url) {
      console.log('❌ Missing URL parameter');
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'Missing parameter',
          message: 'URL parameter is required'
        })
      };
    }

    // Decode and validate URL
    const decodedUrl = decodeURIComponent(url);
    console.log('📝 Processing URL:', decodedUrl);

    // Validate YouTube URL
    if (!ytdl.validateURL(decodedUrl)) {
      console.log('❌ Invalid YouTube URL:', decodedUrl);
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'Invalid URL',
          message: 'The URL does not point to a valid YouTube video'
        })
      };
    }

    console.log('🎥 Fetching video info...');
    
    // Set timeout for video info fetch
    const timeoutMs = 10000;
    const videoInfoPromise = ytdl.getInfo(decodedUrl);
    const timeoutPromise = new Promise<YTInfo>((_, reject) => 
      setTimeout(() => reject(new Error('Request timed out')), timeoutMs)
    );

    const info = await Promise.race([videoInfoPromise, timeoutPromise]);
    
    if (!info?.videoDetails) {
      console.log('❌ No video details in response');
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          error: 'Invalid response',
          message: 'Failed to get video details'
        })
      };
    }

    const { videoDetails, formats } = info;

    // Early validation of video status
    if (videoDetails.isLiveContent) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'Live content',
          message: 'Live streams are not supported'
        })
      };
    }

    if (videoDetails.isPrivate) {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({
          error: 'Private video',
          message: 'This video is private'
        })
      };
    }

    // Filter and map formats
    const mappedFormats = formats
      .filter((format: YTFormat) => format.hasVideo && format.hasAudio)
      .map((format: YTFormat) => ({
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
      .sort((a: VideoFormat, b: VideoFormat) => b.height - a.height);

    if (mappedFormats.length === 0) {
      console.log('❌ No downloadable formats available');
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({
          error: 'No formats',
          message: 'No downloadable formats found for this video'
        })
      };
    }

    const response: VideoResponse = {
      id: videoDetails.videoId,
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

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(response)
    };

  } catch (error) {
    console.error('❌ Error:', error);

    // Map specific error types to appropriate responses
    if (error instanceof Error) {
      if (error.message.includes('timeout')) {
        return {
          statusCode: 504,
          headers,
          body: JSON.stringify({
            error: 'Timeout',
            message: 'Request timed out while fetching video information'
          })
        };
      }

      if (error.message.includes('age-restricted')) {
        return {
          statusCode: 403,
          headers,
          body: JSON.stringify({
            error: 'Age restricted',
            message: 'Age-restricted videos are not supported'
          })
        };
      }

      if (error.message.includes('private')) {
        return {
          statusCode: 403,
          headers,
          body: JSON.stringify({
            error: 'Private video',
            message: 'Private videos cannot be accessed'
          })
        };
      }

      if (error.message.includes('not found') || error.message.includes('not exist')) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({
            error: 'Not found',
            message: 'The requested video does not exist'
          })
        };
      }

      if (error.message.includes('unavailable')) {
        return {
          statusCode: 410,
          headers,
          body: JSON.stringify({
            error: 'Unavailable',
            message: 'This video is no longer available'
          })
        };
      }

      if (error.message.includes('copyright')) {
        return {
          statusCode: 403,
          headers,
          body: JSON.stringify({
            error: 'Copyright',
            message: 'This video is not available due to copyright restrictions'
          })
        };
      }
    }

    // Generic error response
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Server error',
        message: process.env.NODE_ENV === 'development' 
          ? error instanceof Error ? error.message : 'Unknown error'
          : 'An unexpected error occurred'
      })
    };
  }
};
