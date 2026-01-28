import React from 'react';
import GoogleAd from './GoogleAd';

const BannerAd = () => {
    // Randomize which ad to show for variety or just use a standard slot
    // In real AdSense, you might switch slot IDs if needed, or just let AdSense handle it.

    return (
        <div className="p-4 border-t border-gray-200 bg-gray-50 flex justify-center">
            {/* Replace '1234567890' with your actual AdSense Banner Ad Unit ID */}
            <GoogleAd slotId="6300978111" style={{ width: '100%', maxWidth: '350px' }} />
        </div>
    );
};

export default BannerAd;
