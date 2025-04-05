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
  try {
    const url = event.queryStringParameters?.url;
    if (!url) throw new Error('Missing URL parameter');
    
    const info = await ytdl.getInfo(url);
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
      },
      body: JSON.stringify({
        title: info.videoDetails.title,
        formats: info.formats
      })
    };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
      },
      body: JSON.stringify({ error: errorMessage })
    };
  }
};
