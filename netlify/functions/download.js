const ytdl = require('yt-dlp-exec');
const ffmpeg = require('ffmpeg-static');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

exports.handler = async function(event, context) {
  // Set CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  // Handle CORS preflight request
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method Not Allowed' })
    };
  }

  try {
    const body = JSON.parse(event.body);
    const { url, format, quality, filename, platform } = body;

    // Validate URL
    if (!url) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'URL is required' })
      };
    }

    // Create a temporary directory for downloads
    const tempDir = '/tmp/downloads';
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    // Configure yt-dlp options based on platform
    const options = {
      format: getFormatString(format, quality, platform),
      output: path.join(tempDir, filename || '%(title)s.%(ext)s'),
      noCheckCertificates: true,
      noWarnings: true,
      preferFreeFormats: true,
      addHeader: [
        'referer:youtube.com',
        'user-agent:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      ]
    };

    // Add platform-specific options
    if (platform === 'tiktok') {
      options.addHeader.push('referer:tiktok.com');
    } else if (platform === 'instagram') {
      options.addHeader.push('referer:instagram.com');
      options.addHeader.push('cookie:sessionid=YOUR_SESSION_ID'); // Note: This should be handled securely
    } else if (platform === 'facebook') {
      options.addHeader.push('referer:facebook.com');
    }

    // Download video
    const info = await ytdl(url, options);

    // Handle video processing
    const inputFile = info.output;
    const outputFile = path.join(tempDir, filename || `${Date.now()}.mp4`);

    // Process video with FFmpeg for consistent format and quality
    await new Promise((resolve, reject) => {
      const ffmpegProcess = spawn(ffmpeg, [
        '-i', inputFile,
        '-c:v', 'libx264',
        '-preset', 'medium',
        '-crf', '23',
        '-c:a', 'aac',
        '-b:a', '128k',
        '-movflags', '+faststart',
        outputFile
      ]);

      ffmpegProcess.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`FFmpeg process exited with code ${code}`));
        }
      });

      ffmpegProcess.stderr.on('data', (data) => {
        console.log(`FFmpeg: ${data}`);
      });
    });

    // Read the processed file
    const videoBuffer = fs.readFileSync(outputFile);

    // Clean up temporary files
    try {
      fs.unlinkSync(inputFile);
      fs.unlinkSync(outputFile);
    } catch (err) {
      console.error('Error cleaning up temp files:', err);
    }

    // Return video data
    return {
      statusCode: 200,
      headers: {
        ...headers,
        'Content-Type': 'video/mp4',
        'Content-Disposition': `attachment; filename="${filename || 'video.mp4'}"`,
        'Content-Length': videoBuffer.length
      },
      body: videoBuffer.toString('base64'),
      isBase64Encoded: true
    };

  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message || 'Failed to download video' })
    };
  }
};

function getFormatString(format, quality, platform) {
  if (platform === 'youtube') {
    return format || `bestvideo[height<=${quality}]+bestaudio/best[height<=${quality}]`;
  } else if (platform === 'tiktok' || platform === 'instagram') {
    return 'best';
  } else if (platform === 'facebook') {
    return 'best';
  }
  return format || 'best';
}