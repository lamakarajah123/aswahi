import { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, FeatureGroup, GeoJSON, useMap, Tooltip, Marker } from 'react-leaflet';

import { EditControl } from 'react-leaflet-draw';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-draw/dist/leaflet.draw.css';

// Fix for leaflet default icons in Vite
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
    iconUrl: markerIcon,
    iconRetinaUrl: markerIcon2x,
    shadowUrl: markerShadow,
});

interface AreaDrawMapProps {
    existingAreas?: {
        name: string;
        color: string;
        boundaries: any;
        isActive: boolean;
    }[];
    editableBoundary?: any; // The initial GeoJSON polygon to edit
    editableColor?: string;
    onBoundaryChange?: (geojson: any) => void;
    height?: number;
    centerLat?: number;
    centerLng?: number;
    zoom?: number;
    mode: 'view' | 'edit';
    t?: (key: string, def?: string) => string;
}

// Component to handle auto-fitting bounds based on editable boundary
function MapFitter({ editableBoundary }: { editableBoundary: any }) {
    const map = useMap();
    useEffect(() => {
        if (editableBoundary) {
            try {
                const layer = L.geoJSON(editableBoundary);
                map.fitBounds(layer.getBounds(), { padding: [50, 50] });
            } catch (e) {
                console.error("Failed to fit bounds", e);
            }
        }
    }, [map, editableBoundary]);
    return null;
}

// Component to handle external center updates (e.g. from store selection)
function MapCenterer({ lat, lng, zoom }: { lat: number; lng: number; zoom?: number }) {
    const map = useMap();
    useEffect(() => {
        map.setView([lat, lng], zoom || map.getZoom());
    }, [map, lat, lng, zoom]);
    return null;
}


const DRAW_OPTIONS = {
    rectangle: false as const,
    circle: false as const,
    circlemarker: false as const,
    marker: false as const,
    polyline: false as const,
    polygon: {
        allowIntersection: false,
        drawError: {
            color: '#e1e100',
            message: '<strong>خطأ!<strong> لا يمكنك رسم المضلع بهذا الشكل!'
        }
    }
};

const EDIT_OPTIONS = {
    edit: false as const,
    remove: true
};


export default function AreaDrawMap({
    existingAreas = [],
    editableBoundary,
    editableColor = '#3B82F6',
    onBoundaryChange,
    height = 400,
    centerLat = 32.2211, // Nablus
    centerLng = 35.2544,
    zoom = 13,
    mode,
    t = (k, d) => d || k
}: AreaDrawMapProps) {
    const center = new L.LatLng(centerLat, centerLng);
    const featureGroupRef = useRef<L.FeatureGroup>(null);
    const [mapReady, setMapReady] = useState(false);

    // Initialize the editable layer if we have existing boundary data
    useEffect(() => {
        if (mapReady && featureGroupRef.current && mode === 'edit') {
            // ALWAYS clear existing layers when data changes or becomes null
            featureGroupRef.current.clearLayers();
            
            if (editableBoundary) {
                try {
                    // Convert GeoJSON to Leaflet layer
                    const geoJsonLayer = L.geoJSON(editableBoundary);
                    geoJsonLayer.eachLayer((layer) => {
                        // Force the layer to have the correct styles
                        if (layer instanceof L.Polygon) {
                            layer.setStyle({
                                color: editableColor,
                                fillColor: editableColor,
                                fillOpacity: 0.2,
                                weight: 3
                            });
                        }
                        // Add it to the FeatureGroup used by EditControl
                        featureGroupRef.current?.addLayer(layer);
                    });
                } catch (e) {
                    console.error('Failed to parse existing boundary for editing', e);
                }
            }
        }
    }, [mapReady, editableBoundary, mode, editableColor]);

    const handleCreated = (e: any) => {
        const { layerType, layer } = e;
        if (layerType === 'polygon') {
            // Set style for the newly drawn polygon
            layer.setStyle({ color: editableColor, fillColor: editableColor });
            // Remove previous polygons so we only have one (if single area per edit)
            featureGroupRef.current?.eachLayer((l) => {
                if (l !== layer) {
                    featureGroupRef.current?.removeLayer(l);
                }
            });
            const geojson = layer.toGeoJSON();
            // Extact the geometry part for storing
            onBoundaryChange?.(geojson.geometry);
        }
    };

    const handleEdited = (e: any) => {
        e.layers.eachLayer((layer: any) => {
            const geojson = layer.toGeoJSON();
            // Get geometry, wrapped back out
            onBoundaryChange?.(geojson.geometry);
        });
    };

    const handleDeleted = () => {
        onBoundaryChange?.(null);
    };

    return (
        <div style={{ height: `${height}px` }} className="w-full rounded-md overflow-hidden border relative z-0">
            <MapContainer 
                center={center} 
                zoom={zoom} 
                scrollWheelZoom={true} 
                className="h-full w-full"
                whenReady={() => setMapReady(true)}
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                {!editableBoundary && <MapCenterer lat={centerLat} lng={centerLng} zoom={zoom} />}
                
                <Marker position={[centerLat, centerLng]}>
                    <Tooltip permanent>{t('admin.areas.store_location', 'Store Location')}</Tooltip>
                </Marker>

                {mode === 'edit' && editableBoundary && <MapFitter editableBoundary={editableBoundary} />}


                
                {/* Visualizing existing non-editable areas */}
                {existingAreas.map((area, idx) => {
                    if (!area.boundaries) return null;
                    let geoData = area.boundaries;
                    try {
                        if (typeof geoData === 'string') geoData = JSON.parse(geoData);
                        // Basic validation that it's a GeoJSON-like object
                        if (!geoData.type) return null;
                    } catch (e) {
                        return null;
                    }
                    
                    return (
                        <GeoJSON
                            key={`existing-${idx}-${area.name}`}
                            data={geoData}
                            style={{
                                color: area.color || '#3B82F6',
                                weight: 2,
                                opacity: area.isActive ? 0.8 : 0.4,
                                fillColor: area.color || '#3B82F6',
                                fillOpacity: area.isActive ? 0.2 : 0.1
                            }}
                        >
                            <Tooltip sticky>
                                <span className="font-semibold">{area.name}</span>
                                {!area.isActive && <span className="text-gray-500 ml-1">(Inactive)</span>}
                            </Tooltip>
                        </GeoJSON>
                    );
                })}

                {mode === 'edit' && mapReady && (
                    <FeatureGroup ref={featureGroupRef}>
                        <EditControl
                            position="topright"
                            onCreated={handleCreated}
                            onEdited={handleEdited}
                            onDeleted={handleDeleted}
                            draw={DRAW_OPTIONS}
                            edit={EDIT_OPTIONS}
                        />
                    </FeatureGroup>
                )}
            </MapContainer>
        </div>
    );
}
