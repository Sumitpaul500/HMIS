import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Wifi, WifiOff, RefreshCw, CheckCircle } from 'lucide-react';

interface OfflineIndicatorProps {
  onSync?: () => void;
  lastSync?: string;
  pendingChanges?: number;
}

const OfflineIndicator: React.FC<OfflineIndicatorProps> = ({ 
  onSync, 
  lastSync, 
  pendingChanges = 0 
}) => {
  const { t } = useTranslation();
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showAlert, setShowAlert] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setShowAlert(true);
      setTimeout(() => setShowAlert(false), 3000);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowAlert(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const formatLastSync = (timestamp?: string) => {
    if (!timestamp) return t('offline.lastSync');
    const date = new Date(timestamp);
    return `${t('offline.lastSync')}: ${date.toLocaleTimeString()}`;
  };

  return (
    <>
      {/* Status Badge */}
      <div className="flex items-center gap-2">
        <Badge 
          variant={isOnline ? 'default' : 'destructive'}
          className="flex items-center gap-1"
        >
          {isOnline ? (
            <>
              <Wifi className="w-3 h-3" />
              {t('header.online')}
            </>
          ) : (
            <>
              <WifiOff className="w-3 h-3" />
              {t('header.offline')}
            </>
          )}
        </Badge>

        {pendingChanges > 0 && (
          <Badge variant="secondary" className="flex items-center gap-1">
            <RefreshCw className="w-3 h-3" />
            {pendingChanges} {t('offline.syncPending')}
          </Badge>
        )}

        {onSync && pendingChanges > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={onSync}
            className="flex items-center gap-1"
          >
            <RefreshCw className="w-3 h-3" />
            {t('offline.syncNow')}
          </Button>
        )}
      </div>

      {/* Alert Messages */}
      {showAlert && (
        <Alert className={`fixed top-4 right-4 z-50 w-80 ${
          isOnline ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'
        }`}>
          <div className="flex items-center gap-2">
            {isOnline ? (
              <CheckCircle className="w-4 h-4 text-green-600" />
            ) : (
              <WifiOff className="w-4 h-4 text-red-600" />
            )}
            <AlertDescription className={
              isOnline ? 'text-green-800' : 'text-red-800'
            }>
              {isOnline ? t('offline.connectionRestored') : t('offline.message')}
            </AlertDescription>
          </div>
        </Alert>
      )}

      {/* Offline Alert */}
      {!isOnline && (
        <Alert className="mb-4 border-orange-200 bg-orange-50">
          <WifiOff className="h-4 w-4 text-orange-600" />
          <AlertDescription className="text-orange-800">
            <strong>{t('offline.title')}:</strong> {t('offline.message')}
          </AlertDescription>
        </Alert>
      )}
    </>
  );
};

export default OfflineIndicator;
