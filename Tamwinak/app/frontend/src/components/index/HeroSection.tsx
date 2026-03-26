import { MapPin, RefreshCw } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';

const HERO_IMG = 'https://mgx-backend-cdn.metadl.com/generate/images/773620/2026-02-25/82da614d-9580-476f-ba0e-66ee63f019dd.png';

interface HeroSectionProps {
  locationName: string | null;
  onRefreshLocation?: () => void;
}

export function HeroSection({ locationName, onRefreshLocation }: HeroSectionProps) {
  const { t } = useLanguage();

  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-green-600 to-green-800 text-white mt-3">
      <div className="absolute inset-0 opacity-20">
        <img src={HERO_IMG} alt="" width={1200} height={400} className="w-full h-full object-cover" />
      </div>
      <div className="relative max-w-7xl mx-auto px-4 py-12 md:py-20 flex flex-col md:flex-row items-center md:items-start justify-between gap-8 text-center md:text-start">
        <div className="max-w-2xl flex flex-col items-center md:items-start">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4 leading-tight">
            {t('home.hero_title', 'Aswahi Fresh Groceries, Delivered Fast')}
          </h1>
          <p className="text-base sm:text-lg text-green-100 mb-8 max-w-lg md:max-w-none">
            {t('home.hero_subtitle', 'Order your favorite products and get them delivered to your door in minutes without the hassle!')}
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-lg px-4 py-2 border border-white/20">
              <MapPin className="w-5 h-5 text-green-200 shrink-0" />
              <span className="text-sm text-green-100 font-medium truncate max-w-[200px] md:max-w-xs">{locationName}</span>
            </div>
            {onRefreshLocation && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={onRefreshLocation}
                className="bg-white/10 hover:bg-white/20 text-white border-white/30 rounded-lg backdrop-blur-sm transition-all flex items-center gap-2 h-9"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span className="text-xs font-semibold">{t('home.detect_location', 'Detect Location')}</span>
              </Button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
