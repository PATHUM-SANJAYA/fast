# Video Downloader

A web application for downloading videos from various platforms including YouTube, Facebook, Instagram, and TikTok.

## Features

- Download videos from multiple platforms
- Select video quality
- Video compression option
- Progress tracking
- Responsive UI

## Tech Stack

### Backend
- FastAPI
- Python 3.9+
- yt-dlp
- FFmpeg

### Frontend
- React/Vite
- TypeScript
- Tailwind CSS

## Setup

### Prerequisites
- Python 3.9 or higher
- Node.js 16 or higher
- FFmpeg installed on your system
- RapidAPI key (for some platforms)

### Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Create a virtual environment:
   ```bash
   python -m venv .venv
   ```

3. Activate the virtual environment:
   - Windows:
     ```bash
     .\.venv\Scripts\activate
     ```
   - Unix/MacOS:
     ```bash
     source .venv/bin/activate
     ```

4. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

5. Create a .env file:
   ```bash
   cp .env.example .env
   ```
   Update the environment variables in .env with your values.

### Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a .env file:
   ```bash
   cp .env.example .env
   ```
   Update the environment variables in .env with your values.

## Running the Application

### Development

1. Start the backend server:
   ```bash
   python server_manager.py
   ```

2. In a new terminal, start the frontend development server:
   ```bash
   cd frontend
   npm run dev
   ```

### Production

1. Build the frontend:
   ```bash
   cd frontend
   npm run build
   ```

2. Deploy the backend to your preferred hosting platform
3. Update the frontend API URL in .env.production
4. Deploy the frontend to Netlify or similar platform

## Environment Variables

### Backend (.env)
- `RAPIDAPI_KEY`: Your RapidAPI key
- `PORT`: Server port (default: 8000)
- `HOST`: Server host (default: 0.0.0.0)
- `FRONTEND_URL`: Frontend URL for CORS

### Frontend (.env.production)
- `VITE_API_URL`: Backend API URL

## License

MIT

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a new Pull Request
