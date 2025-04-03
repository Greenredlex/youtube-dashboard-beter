import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

interface Video {
  video_id: string;
  title: string;
  channel_title: string;
  view_count: number;
  like_count: number;
  thumbnail_url: string;
  published_at: string;
}

interface Feature {
  type: 'Feature';
  geometry: {
    type: 'Point';
    coordinates: [number, number];
  };
  properties: {
    country_code: string;
    country_name: string;
    videos: Video[];
    last_updated: string;
  };
}

interface GeoJSONData {
  type: 'FeatureCollection';
  features: Feature[];
}

export async function GET() {
  try {
    const dataFilePath = path.join(process.cwd(), 'data', 'trending_videos.geojson');
    const fileContent = await fs.readFile(dataFilePath, 'utf-8');
    const jsonData = JSON.parse(fileContent) as GeoJSONData;

    // Ensure the data structure is correct
    if (jsonData.type !== 'FeatureCollection' || !Array.isArray(jsonData.features)) {
      throw new Error('Invalid GeoJSON format');
    }

    // Process each feature to ensure videos are properly parsed
    const processedData: GeoJSONData = {
      ...jsonData,
      features: jsonData.features.map(feature => ({
        ...feature,
        properties: {
          ...feature.properties,
          videos: Array.isArray(feature.properties.videos) 
            ? feature.properties.videos 
            : typeof feature.properties.videos === 'string'
              ? JSON.parse(feature.properties.videos)
              : []
        }
      }))
    };

    return NextResponse.json(processedData);
  } catch (error) {
    console.error('Error reading trending videos data:', error);
    return NextResponse.json({ error: 'Failed to read trending videos data' }, { status: 500 });
  }
} 