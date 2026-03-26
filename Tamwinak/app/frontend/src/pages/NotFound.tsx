import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Leaf, Home } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <Leaf className="w-8 h-8 text-green-600" />
        </div>
        <h1 className="text-4xl font-bold text-gray-900 mb-2">404</h1>
        <p className="text-lg text-gray-600 mb-6">Page not found</p>
        <p className="text-gray-400 mb-8">The page you're looking for doesn't exist or has been moved.</p>
        <Link to="/">
          <Button className="bg-green-600 hover:bg-green-700 text-white">
            <Home className="w-4 h-4 mr-2" /> Back to Home
          </Button>
        </Link>
      </div>
    </div>
  );
}