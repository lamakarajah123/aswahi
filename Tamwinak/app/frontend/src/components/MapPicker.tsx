import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

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

interface MapPickerProps {
    latitude: number;
    longitude: number;
    onLocationSelect: (lat: number, lng: number) => void;
}

function LocationMarker({ position, setPosition }: { position: L.LatLng | null, setPosition: (pos: L.LatLng) => void }) {
    const map = useMapEvents({
        click(e) {
            setPosition(e.latlng);
        },
    });

    useEffect(() => {
        if (position) {
            map.flyTo(position, map.getZoom());
        }
    }, [position, map]);

    return position === null ? null : (
        <Marker position={position}></Marker>
    );
}

export function MapPicker({ latitude, longitude, onLocationSelect }: MapPickerProps) {
    const center = new L.LatLng(latitude || 32.2211, longitude || 35.2544);

    return (
        <div className="h-[300px] w-full rounded-md overflow-hidden border">
            <MapContainer center={center} zoom={13} scrollWheelZoom={true} className="h-full w-full">
                <TileLayer
                    attribution='&amp;copy <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <LocationMarker
                    position={center}
                    setPosition={(pos) => onLocationSelect(pos.lat, pos.lng)}
                />
            </MapContainer>
        </div>
    );
}
