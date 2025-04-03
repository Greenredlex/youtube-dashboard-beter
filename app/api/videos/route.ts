import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { YouTubeVideo } from '@/app/types/youtube';

const dataFilePath = path.join(process.cwd(), 'data', 'videos.csv');

export async function GET() {
  try {
    // Custom CSV parsing function
    function parseCSVLine(line: string): string[] {
        // Split by commas, but handle empty fields correctly
        const values: string[] = [];
        let currentValue = '';
        let inQuotes = false;
        
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            
            if (char === '"') {
                if (inQuotes && line[i + 1] === '"') {
                    // Handle escaped quotes
                    currentValue += '"';
                    i++; // Skip next quote
                } else {
                    inQuotes = !inQuotes;
                }
            } else if (char === ',' && !inQuotes) {
                values.push(currentValue.trim());
                currentValue = '';
            } else {
                currentValue += char;
            }
        }
        
        // Push the last value
        values.push(currentValue.trim());
        
        // Clean up quotes at start/end of values
        return values.map(value => value.replace(/(^"|"$)/g, '').replace(/""/g, '"'));
    }

    // Read CSV file
    const fileContent = await fs.readFile(dataFilePath, 'utf-8');
    const lines = fileContent.split('\n');
    const headers = parseCSVLine(lines[0]);
    
    // Parse CSV to JSON
    const videos: YouTubeVideo[] = lines.slice(1)
      .filter(line => line.trim())
      .map(line => {
        const values = parseCSVLine(line);
        const video: YouTubeVideo = {
            video_id: '',
            video_title: '',
            channel_title: '',
            published_at: '',
            views: 0,
            likes: 0,
            duration_seconds: 0,
            thumbnail_url: ''   
        };
        const validHeaders: (keyof YouTubeVideo)[] = ['video_id', 'video_title', 'channel_title', 'published_at', 'views', 'likes', 'duration_seconds', 'thumbnail_url'];

        headers.forEach((header, index) => {
          const value = values[index]?.trim();
          if (validHeaders.includes(header as keyof YouTubeVideo)) {
            if (header === 'views' || header === 'likes' || header === 'duration_seconds') {
              video[header as 'views' | 'likes' | 'duration_seconds'] = value ? parseInt(value) : 0;
            } else {
              video[header as Exclude<keyof YouTubeVideo, 'views' | 'likes' | 'duration_seconds'>] = value || '';
            }
          }
        });
        return video as YouTubeVideo;
      });

    return NextResponse.json(videos);
  } catch (error) {
    console.error('Error reading videos data:', error);
    return NextResponse.json({ error: 'Failed to read videos data' }, { status: 500 });
  }
} 