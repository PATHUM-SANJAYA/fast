import { Handler } from '@netlify/functions';
import ytdl from 'ytdl-core';

interface VideoInfo {
  title: string;
  author: string;
  lengthSeconds: string;
  viewCount: string;
  formats: Array<{
    itag: string;
    url: string;
    mimeType: string;
    quality: string;
    qualityLabel: string;
    contentLength: string;
  }>;
}

const handler: Handler = async (event) => {
  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  const videoUrl = event.queryStringParameters?.url;
  if (!videoUrl) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'URL parameter is required' })
    };
  }

  try {
    const info = await ytdl.getInfo(videoUrl);
    const videoInfo: VideoInfo = {
      title: info.videoDetails.title,
      author: info.videoDetails.author.name,
      lengthSeconds: info.videoDetails.lengthSeconds,
      viewCount: info.videoDetails.viewCount,
      formats: info.formats.map(format => ({
        itag: format.itag,
        url: format.url,
        mimeType: format.mimeType,
        quality: format.quality,
        qualityLabel: format.qualityLabel,
        contentLength: format.contentLength
      }))
    };

    return {
      statusCode: 200,
      body: JSON.stringify(videoInfo)
    };
  } catch (error) {
    console.error('Error fetching video info:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to fetch video information' })
    };
  }
};

export { handler };
