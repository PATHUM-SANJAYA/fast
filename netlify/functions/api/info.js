"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const ytdl_core_1 = __importDefault(require("ytdl-core"));
const handler = async (event) => {
    var _a;
    if (event.httpMethod !== 'GET') {
        return {
            statusCode: 405,
            body: JSON.stringify({ error: 'Method not allowed' })
        };
    }
    const videoUrl = (_a = event.queryStringParameters) === null || _a === void 0 ? void 0 : _a.url;
    if (!videoUrl) {
        return {
            statusCode: 400,
            body: JSON.stringify({ error: 'URL parameter is required' })
        };
    }
    try {
        const info = await ytdl_core_1.default.getInfo(videoUrl);
        const videoInfo = {
            title: info.videoDetails.title,
            author: info.videoDetails.author.name,
            lengthSeconds: info.videoDetails.lengthSeconds,
            viewCount: info.videoDetails.viewCount,
            formats: info.formats.map(format => ({
                itag: format.itag,
                url: format.url,
                mimeType: format.mimeType,
                quality: String(format.quality),
                qualityLabel: format.qualityLabel,
                contentLength: format.contentLength
            }))
        };
        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
            },
            body: JSON.stringify(videoInfo)
        };
    }
    catch (error) {
        console.error('Error fetching video info:', error);
        return {
            statusCode: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
            },
            body: JSON.stringify({ error: 'Failed to fetch video information' })
        };
    }
};
exports.handler = handler;
