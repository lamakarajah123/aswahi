import { MapContainer, TileLayer, Marker, Polyline, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet's default icon path issues
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const driverIcon = new L.Icon({
  iconUrl: 'https://mgx-backend-cdn.metadl.com/generate/images/773620/2026-03-03/driver-icon-custom.png',
  iconRetinaUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  iconSize: [25, 41] as L.PointExpression, iconAnchor: [12, 41] as L.PointExpression, popupAnchor: [1, -34] as L.PointExpression, shadowSize: [41, 41] as L.PointExpression,
});
const storeIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  iconSize: [25, 41] as L.PointExpression, iconAnchor: [12, 41] as L.PointExpression, popupAnchor: [1, -34] as L.PointExpression, shadowSize: [41, 41] as L.PointExpression,
});
const customerIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  iconSize: [25, 41] as L.PointExpression, iconAnchor: [12, 41] as L.PointExpression, popupAnchor: [1, -34] as L.PointExpression, shadowSize: [41, 41] as L.PointExpression,
});

interface DriverMapProps {
  driverLat: number;
  driverLng: number;
  orderInfo: any;
  calculateOptimalRoute: (orderContext: any) => any[];
  t: (key: string, fallback: string) => string;
}

export default function DriverMap({ driverLat, driverLng, orderInfo, calculateOptimalRoute, t }: DriverMapProps) {
  const route = calculateOptimalRoute(orderInfo);
  const validRoute = route.filter((point: any) => point.lat != null && point.lng != null);
  const polylinePositions: [number, number][] = [
    [driverLat, driverLng],
    ...validRoute.map((p: any) => [p.lat, p.lng] as [number, number]),
  ];

  return (
    <MapContainer
      center={[driverLat, driverLng]}
      zoom={14}
      style={{ height: '100%', width: '100%' }}
      className="z-0"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      <Marker position={[driverLat, driverLng]} icon={driverIcon}>
        <Popup>
          <div className="font-bold text-sm">{t('driver.map.your_location', 'Your Location')}</div>
        </Popup>
      </Marker>

      {validRoute.length > 0 && (
        <>
          <Polyline positions={polylinePositions} color="#2563eb" weight={4} opacity={0.7} dashArray="5, 10" />
          {validRoute.map((point: any, idx: number) => (
            <Marker key={idx} position={[point.lat, point.lng]} icon={point.isCustomer ? customerIcon : storeIcon}>
              <Popup>
                <div className="text-sm">
                  <strong className="block">
                    {point.isCustomer
                      ? `${t('driver.map.dropoff', 'Drop-off')}: ${point.name}`
                      : `${t('driver.map.pickup', 'Pickup')} ${idx + 1}: ${point.name}`}
                  </strong>
                  <span className="text-gray-500 text-xs mt-1 block">{point.address}</span>
                </div>
              </Popup>
            </Marker>
          ))}
        </>
      )}
    </MapContainer>
  );
}
