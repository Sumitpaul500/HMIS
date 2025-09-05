# HMIS Multilingual & Offline Support Guide

This guide explains the multilingual and offline functionality added to the Hospital Management Information System (HMIS).

## 🌍 Multilingual Support

### Supported Languages
- **English** (en) - Default
- **Spanish** (es) - Español
- **French** (fr) - Français
- **German** (de) - Deutsch
- **Hindi** (hi) - हिन्दी
- **Chinese** (zh) - 中文
- **Arabic** (ar) - العربية

### Features
- **Language Selector**: Dropdown in the header to switch languages
- **Persistent Selection**: Language choice is saved in localStorage
- **RTL Support**: Arabic language includes right-to-left text direction
- **Comprehensive Translation**: All UI elements, forms, and messages are translated

### How to Use
1. Click the language selector in the top-right corner
2. Choose your preferred language from the dropdown
3. The entire interface will immediately switch to the selected language
4. Your language preference is automatically saved

### Adding New Languages
1. Create a new translation file in `src/i18n/locales/[language-code].json`
2. Add the language to the `languages` array in `src/i18n/index.ts`
3. Add the language option to `src/components/ui/LanguageSelector.tsx`

Example for adding Japanese:
```json
// src/i18n/locales/ja.json
{
  "common": {
    "loading": "読み込み中...",
    "save": "保存",
    // ... rest of translations
  }
}
```

## 📱 Offline Functionality

### Features
- **Service Worker**: Caches static assets and API responses
- **Offline Data Storage**: Uses IndexedDB to store data locally
- **Background Sync**: Automatically syncs data when connection is restored
- **Offline Indicators**: Visual indicators show connection status
- **Progressive Web App**: Can be installed as a native app

### How It Works

#### 1. Service Worker
- Automatically caches static files (HTML, CSS, JS, images)
- Caches API responses for offline access
- Handles network requests with cache-first strategy

#### 2. Offline Data Manager
- Stores pending changes in IndexedDB
- Queues API requests when offline
- Automatically retries failed requests
- Syncs data when connection is restored

#### 3. Visual Indicators
- **Online Status**: Green indicator when connected
- **Offline Status**: Red indicator when disconnected
- **Pending Changes**: Shows number of unsynced changes
- **Sync Button**: Manual sync option

### Offline Capabilities
- ✅ View all patient data
- ✅ Add new patients (queued for sync)
- ✅ Record vitals (queued for sync)
- ✅ Create prescriptions (queued for sync)
- ✅ Search and filter data
- ✅ Export data to CSV
- ✅ Full UI functionality

### Data Synchronization
When you go offline:
1. All new data is stored locally in IndexedDB
2. Changes are queued as "pending changes"
3. Visual indicators show offline status
4. Data remains fully functional

When connection is restored:
1. Automatic background sync begins
2. Pending changes are sent to server
3. Success/failure notifications are shown
4. Data is synchronized with server

## 🚀 Installation & Setup

### Prerequisites
- Node.js 16 or higher
- Modern web browser with IndexedDB support

### Installation
1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Start development server:**
   ```bash
   npm run dev
   ```

3. **Build for production:**
   ```bash
   npm run build
   ```

### Service Worker Registration
The service worker is automatically registered when the app loads. You can verify it's working by:
1. Opening browser DevTools
2. Going to Application tab
3. Checking Service Workers section

## 🔧 Configuration

### Language Configuration
Edit `src/i18n/index.ts` to modify language settings:
```typescript
i18n.init({
  fallbackLng: 'en', // Default language
  debug: false, // Set to true for debugging
  // ... other options
});
```

### Offline Configuration
Modify `src/utils/offlineManager.ts` to adjust offline behavior:
```typescript
class OfflineManager {
  private dbName = 'HMISOfflineDB'; // Database name
  private dbVersion = 1; // Database version
  // ... configuration options
}
```

### PWA Configuration
Edit `vite.config.ts` to modify PWA settings:
```typescript
VitePWA({
  registerType: 'autoUpdate',
  workbox: {
    // Caching strategies
  },
  manifest: {
    // App manifest settings
  }
})
```

## 📊 Performance Considerations

### Caching Strategy
- **Static Assets**: Cached indefinitely with versioning
- **API Responses**: Cached for 1 hour by default
- **Images**: Cached for 30 days
- **Fonts**: Cached for 1 year

### Storage Limits
- **IndexedDB**: Typically 50MB-1GB depending on browser
- **Cache Storage**: Typically 50MB-1GB depending on browser
- **LocalStorage**: 5-10MB per domain

### Optimization Tips
1. **Regular Cleanup**: Old cache entries are automatically cleaned
2. **Efficient Sync**: Only changed data is synchronized
3. **Background Processing**: Heavy operations run in background
4. **Progressive Loading**: Critical content loads first

## 🐛 Troubleshooting

### Common Issues

#### Language Not Switching
- Check if translation files are properly loaded
- Verify language code is correct
- Clear browser cache and reload

#### Offline Data Not Syncing
- Check network connection
- Verify API endpoints are accessible
- Check browser console for errors
- Manually trigger sync using sync button

#### Service Worker Not Working
- Check if HTTPS is enabled (required for service workers)
- Clear browser cache and reload
- Check browser console for errors
- Verify service worker file is accessible

#### Data Not Persisting
- Check if IndexedDB is supported
- Verify browser storage permissions
- Check for storage quota exceeded errors

### Debug Mode
Enable debug mode for i18n:
```typescript
// src/i18n/index.ts
i18n.init({
  debug: true, // Enable debug logging
  // ... other options
});
```

### Manual Cache Clear
```javascript
// In browser console
caches.keys().then(names => {
  names.forEach(name => caches.delete(name));
});
```

## 🔒 Security Considerations

### Data Protection
- All offline data is stored locally in the browser
- No sensitive data is sent to external services
- Data is encrypted in transit when syncing

### Privacy
- Language preferences are stored locally
- No user data is collected for analytics
- All data remains within your infrastructure

## 📱 Mobile Support

### PWA Features
- **Installable**: Can be added to home screen
- **Offline**: Works without internet connection
- **Responsive**: Adapts to different screen sizes
- **Fast**: Cached resources load instantly

### Mobile-Specific Optimizations
- Touch-friendly interface
- Optimized for small screens
- Gesture support
- Mobile-specific caching strategies

## 🚀 Future Enhancements

### Planned Features
- **More Languages**: Additional language support
- **Voice Input**: Speech-to-text for data entry
- **Offline Maps**: Location-based features
- **Advanced Sync**: Conflict resolution for concurrent edits
- **Push Notifications**: Real-time updates
- **Biometric Authentication**: Enhanced security

### Contributing
To add new languages or improve offline functionality:
1. Fork the repository
2. Create a feature branch
3. Add your changes
4. Test thoroughly
5. Submit a pull request

## 📞 Support

For issues or questions:
1. Check this documentation
2. Review browser console for errors
3. Test in different browsers
4. Check network connectivity
5. Contact support team

---

**Note**: This multilingual and offline functionality is designed to work seamlessly with the existing HMIS system. All features are backward compatible and can be disabled if needed.
