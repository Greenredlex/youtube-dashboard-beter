'use client';

import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { useDarkMode } from './DarkModeProvider';

// You'll need to replace this with your actual Mapbox access token
mapboxgl.accessToken = 'pk.eyJ1IjoiZ3JlZW5yZWRsZXgiLCJhIjoiY204c3MzMjFyMDNpNjJrc2I2N21pZXphaiJ9.Rq7wa9jCgwKMRgeUC5Uqdg';

interface Video {
  video_id: string;
  title: string;
  channel_title: string;
  view_count: number;
  like_count: number;
  thumbnail_url: string;
  published_at: string;
  duration_seconds: number;
}

interface CountryFeature {
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
  features: CountryFeature[];
}

interface TrendingMapProps {
  className?: string;
  filterShorts: boolean;
}

type VisualizationType = 'circles' | 'heatmap';

export default function TrendingMap({ className = '', filterShorts }: TrendingMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [geoJSONData, setGeoJSONData] = useState<GeoJSONData | null>(null);
  const [filteredGeoJSONData, setFilteredGeoJSONData] = useState<GeoJSONData | null>(null);
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const [selectedVideos, setSelectedVideos] = useState<Video[]>([]);
  const [visualizationType, setVisualizationType] = useState<VisualizationType>('circles');
  const { darkMode } = useDarkMode();
  const [mapLoaded, setMapLoaded] = useState(false);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    // Create map instance
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: darkMode 
        ? 'mapbox://styles/mapbox/dark-v11' 
        : 'mapbox://styles/mapbox/light-v11',
      center: [0, 20],
      zoom: 1.5,
      projection: 'globe'
    });

    // Add navigation controls
    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');
    map.current.addControl(new mapboxgl.FullscreenControl(), 'top-right');
    map.current.addControl(new mapboxgl.ScaleControl(), 'bottom-right');

    // Set map loaded state
    map.current.on('load', () => {
      setMapLoaded(true);
      console.log('Map loaded');
    });

    // Clean up on unmount
    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, [darkMode]);

  // Load GeoJSON data
  useEffect(() => {
    const fetchGeoJSON = async () => {
      try {
        const response = await fetch('/api/trending');
        const data = await response.json();
        console.log('Fetched GeoJSON data:', data);
        setGeoJSONData(data);
      } catch (error) {
        console.error('Error loading GeoJSON data:', error);
      }
    };

    fetchGeoJSON();
  }, []);

  // Filter GeoJSON data when filterShorts changes
  useEffect(() => {
    if (!geoJSONData) return;

    const filteredData: GeoJSONData = {
      type: 'FeatureCollection',
      features: geoJSONData.features.map(feature => {
        const filteredVideos = filterShorts
          ? feature.properties.videos.filter(video => video.duration_seconds > 60)
          : feature.properties.videos;

        return {
          ...feature,
          properties: {
            ...feature.properties,
            videos: filteredVideos
          }
        };
      }).filter(feature => feature.properties.videos.length > 0) // Remove countries with no videos after filtering
    };

    setFilteredGeoJSONData(filteredData);

    // Update selected videos if there's an active country selection
    if (selectedCountry && geoJSONData) {
      const countryFeature = geoJSONData.features.find(
        feature => feature.properties.country_name === selectedCountry
      );
      
      if (countryFeature) {
        const filteredVideos = filterShorts
          ? countryFeature.properties.videos.filter(video => video.duration_seconds > 60)
          : countryFeature.properties.videos;
        
        // If no videos remain after filtering, clear the selection
        if (filteredVideos.length === 0) {
          setSelectedCountry(null);
          setSelectedVideos([]);
        } else {
          setSelectedVideos(filteredVideos);
        }
      }
    }
  }, [geoJSONData, filterShorts, selectedCountry]);

  // Add GeoJSON data to map when both map and data are ready
  useEffect(() => {
    if (!map.current || !mapLoaded || !filteredGeoJSONData) {
      console.log('Waiting for map and data...', { mapLoaded, hasData: !!filteredGeoJSONData });
      return;
    }

    const mapInstance = map.current;
    console.log('Adding data to map');

    try {
      // Remove existing layers first
      if (mapInstance.getLayer('country-points')) {
        mapInstance.removeLayer('country-points');
      }
      if (mapInstance.getLayer('country-heatmap')) {
        mapInstance.removeLayer('country-heatmap');
      }
      if (mapInstance.getLayer('country-background')) {
        mapInstance.removeLayer('country-background');
      }

      // Then remove the source
      if (mapInstance.getSource('trending-videos')) {
        mapInstance.removeSource('trending-videos');
      }

      // Add the GeoJSON source
      mapInstance.addSource('trending-videos', {
        type: 'geojson',
        data: filteredGeoJSONData
      });

      // Add the background layer first
      mapInstance.addLayer({
        id: 'country-background',
        type: 'fill',
        source: 'trending-videos',
        paint: {
          'fill-color': darkMode ? '#374151' : '#E5E7EB',
          'fill-opacity': visualizationType === 'heatmap' ? 0.3 : 0
        }
      });

      // Add the heatmap layer
      mapInstance.addLayer({
        id: 'country-heatmap',
        type: 'heatmap',
        source: 'trending-videos',
        paint: {
          'heatmap-weight': [
            'interpolate',
            ['linear'],
            ['get', 'view_count', ['at', 0, ['get', 'videos']]],
            0, 0,
            100000, 0.2,
            1000000, 0.4,
            5000000, 0.6,
            10000000, 0.8,
            20000000, 1
          ],
          'heatmap-intensity': [
            'interpolate',
            ['linear'],
            ['zoom'],
            0, 0.5,
            3, 1,
            6, 1.5
          ],
          'heatmap-color': [
            'interpolate',
            ['linear'],
            ['heatmap-density'],
            0, 'rgba(33, 102, 172, 0)',
            0.1, 'rgb(103, 169, 207)',
            0.2, 'rgb(209, 229, 240)',
            0.3, 'rgb(253, 219, 199)',
            0.4, 'rgb(239, 138, 98)',
            0.5, 'rgb(178, 24, 43)',
            0.6, 'rgb(178, 24, 43)',
            0.7, 'rgb(178, 24, 43)',
            0.8, 'rgb(178, 24, 43)',
            0.9, 'rgb(178, 24, 43)',
            1, 'rgb(178, 24, 43)'
          ],
          'heatmap-radius': [
            'interpolate',
            ['linear'],
            ['zoom'],
            0, 40,
            3, 60,
            6, 80
          ],
          'heatmap-opacity': visualizationType === 'heatmap' ? 0.8 : 0
        }
      });

      // Add the circle layer last
      mapInstance.addLayer({
        id: 'country-points',
        type: 'circle',
        source: 'trending-videos',
        paint: {
          'circle-radius': [
            'interpolate',
            ['linear'],
            ['get', 'view_count', ['at', 0, ['get', 'videos']]],
            0, 5,
            1000000, 10,
            5000000, 15,
            10000000, 20
          ],
          'circle-color': darkMode ? '#3B82F6' : '#2563EB',
          'circle-opacity': visualizationType === 'circles' ? 0.8 : 0,
          'circle-stroke-width': 2,
          'circle-stroke-color': darkMode ? '#1E40AF' : '#1D4ED8'
        }
      });

      // Add hover effect
      mapInstance.on('mouseenter', 'country-points', () => {
        mapInstance.getCanvas().style.cursor = 'pointer';
      });

      mapInstance.on('mouseleave', 'country-points', () => {
        mapInstance.getCanvas().style.cursor = '';
      });

      // Handle click on country points
      mapInstance.on('click', 'country-points', (e) => {
        if (!e.features || e.features.length === 0) return;
        
        const feature = e.features[0];
        console.log('Raw feature data:', feature);
        
        if (!feature.properties) return;

        let videos: Video[] = [];
        try {
          if (typeof feature.properties.videos === 'string') {
            videos = JSON.parse(feature.properties.videos);
          } else if (Array.isArray(feature.properties.videos)) {
            videos = feature.properties.videos;
          }
          console.log('Parsed videos:', videos);
        } catch (error) {
          console.error('Error parsing videos:', error);
          return;
        }

        if (!Array.isArray(videos)) {
          console.error('Videos is not an array after parsing:', videos);
          return;
        }

        setSelectedCountry(feature.properties.country_name);
        setSelectedVideos(videos);

        // Fly to the clicked point
        if (feature.geometry && 'coordinates' in feature.geometry) {
          const coordinates = feature.geometry.coordinates as [number, number];
          mapInstance.flyTo({
            center: coordinates,
            zoom: 4,
            duration: 1000
          });
        }
      });
    } catch (error) {
      console.error('Error adding data to map:', error);
    }
  }, [filteredGeoJSONData, mapLoaded, darkMode, visualizationType]);

  // Format view count for display
  const formatViewCount = (count: number) => {
    if (count >= 1000000) {
      return `${(count / 1000000).toFixed(1)}M`;
    } else if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}K`;
    }
    return count.toString();
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  return (
    <div className={`relative ${className}`}>
      <div 
        ref={mapContainer} 
        className="w-full h-[600px] rounded-lg overflow-hidden"
      />
      
      {/* Visualization type selector */}
      <div className={`absolute top-4 left-4 z-10 flex space-x-2 p-2 rounded-lg shadow-lg ${
        darkMode ? 'bg-gray-800' : 'bg-white'
      }`}>
        <button
          onClick={() => setVisualizationType('circles')}
          className={`px-3 py-1 rounded-md text-sm font-medium transition-colors duration-200 ${
            visualizationType === 'circles'
              ? darkMode ? 'bg-blue-600 text-white' : 'bg-blue-500 text-white'
              : darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          Circles
        </button>
        <button
          onClick={() => setVisualizationType('heatmap')}
          className={`px-3 py-1 rounded-md text-sm font-medium transition-colors duration-200 ${
            visualizationType === 'heatmap'
              ? darkMode ? 'bg-blue-600 text-white' : 'bg-blue-500 text-white'
              : darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          Heatmap
        </button>
      </div>
      
      {/* Country info panel */}
      {selectedCountry && selectedVideos && selectedVideos.length > 0 && (
        <div className={`absolute top-4 right-4 w-80 max-h-[500px] overflow-y-auto p-4 rounded-lg shadow-lg ${
          darkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-800'
        }`}>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold">{selectedCountry}</h3>
            <button 
              onClick={() => {
                setSelectedCountry(null);
                setSelectedVideos([]);
              }}
              className={`p-1 rounded-full ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
          
          <div className="space-y-4">
            {selectedVideos.map((video) => (
              <div 
                key={video.video_id}
                className={`p-3 rounded-md ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}
              >
                <div className="flex space-x-3">
                  <img 
                    src={video.thumbnail_url} 
                    alt={video.title}
                    className="w-24 h-auto rounded"
                  />
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-sm truncate">{video.title}</h4>
                    <p className="text-xs opacity-80 truncate">{video.channel_title}</p>
                    <div className="flex justify-between mt-1 text-xs">
                      <span>{formatViewCount(video.view_count)} views</span>
                      <span>{formatViewCount(video.like_count)} likes</span>
                    </div>
                    <p className="text-xs opacity-70 mt-1">{formatDate(video.published_at)}</p>
                    <a 
                      href={`https://www.youtube.com/watch?v=${video.video_id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`mt-2 inline-block text-xs px-2 py-1 rounded ${
                        darkMode 
                          ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                          : 'bg-blue-500 hover:bg-blue-600 text-white'
                      }`}
                    >
                      Watch
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
} 