# Transora

**Turn Any Video Into Knowledge in Seconds**

Transora is a modern web application that converts YouTube links and uploaded MP4 videos into searchable transcripts, subtitles, summaries, notes, definitions, and transcript-based chat answers. It is built for students, creators, teachers, and professionals who want to understand video content faster.

## GitHub Description

AI-style video learning web app that turns YouTube links and MP4 uploads into transcripts, subtitles, summaries, notes, exports, and transcript-based chat.

## Features

- Paste a YouTube video link
- Upload an MP4 video
- Local audio extraction with ffmpeg
- Local speech-to-text with faster-whisper
- Transcript viewer with timestamps
- Search inside transcript
- Subtitle generation with SRT timestamps
- Summary, key points, notes, and definitions
- Chat answers based on the transcript
- Export transcript as TXT, PDF, DOCX, and SRT
- Login/register authentication
- Google login support when credentials are configured
- Dashboard with recent videos and processing status
- User profile and settings pages
- PWA install button for mobile and laptop
- PostgreSQL database with Prisma
- Docker PostgreSQL setup
- Responsive dark luxury UI

## Tech Stack

- Next.js
- TypeScript
- Tailwind CSS
- PostgreSQL
- Prisma
- REST API routes
- Docker
- ffmpeg
- yt-dlp
- faster-whisper

## Local Setup

1. Install Node.js 20.
2. Install Docker Desktop.
3. Install Python and ffmpeg if you want local transcription.
4. Copy the environment file:

```bash
cp .env.example .env
```

5. Start PostgreSQL:

```bash
docker compose up db -d
```

6. Install dependencies:

```bash
npm install
```

7. Create database tables:

```bash
npm run db:push
```

8. Start Transora:

```bash
npm run dev
```

Open:

```bash
http://localhost:3000
```

## Environment Variables

- `DATABASE_URL`: PostgreSQL connection string
- `JWT_SECRET`: secret used for login cookies
- `GOOGLE_CLIENT_ID`: optional Google OAuth client ID
- `GOOGLE_CLIENT_SECRET`: optional Google OAuth client secret
- `NEXT_PUBLIC_APP_URL`: public app URL
- `UPLOAD_DIR`: upload storage folder
- `MAX_UPLOAD_MB`: maximum upload size
- `YOUTUBE_FETCH_TIMEOUT_MS`: YouTube caption fetch timeout
- `ALLOW_DEMO_TRANSCRIPTS`: allow demo transcripts when processing fails
- `USE_LOCAL_TRANSCRIPTION`: enable local ffmpeg/faster-whisper transcription
- `LOCAL_WHISPER_LANGUAGE`: optional language override
- `LOCAL_WHISPER_TIMEOUT_MS`: maximum local transcription time
- `FAST_WHISPER_MODEL`: local model, for example `base`
- `FAST_WHISPER_BEAM_SIZE`: transcription search quality
- `FFMPEG_PATH`: ffmpeg path on Windows
- `PYTHON_BIN`: Python executable

## PWA Install

Transora includes PWA support.

On Android Chrome:

- Open the live site.
- Tap the browser menu.
- Choose **Install app** or **Add to Home screen**.

On laptop Chrome or Edge:

- Open the live site.
- Click the install icon in the address bar.
- Or use the browser menu and choose **Install Transora**.

## Docker

Start only the database:

```bash
docker compose up db -d
```

Run the full stack:

```bash
docker compose up --build
```

For a fresh database inside Docker:

```bash
docker compose exec app npx prisma db push
```

## Deployment Notes

For simple hosting, use Railway, Render, or another platform that supports PostgreSQL and longer server jobs.

Vercel works well for the frontend, but MP4 transcription with ffmpeg and faster-whisper needs longer-running server support. Railway or Render is better if you want upload processing online.

## Founder

Founded by **Mukilan Muthuvalathan**, CEO & Founder, Transora.
