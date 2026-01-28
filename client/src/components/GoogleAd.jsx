import React, { useEffect } from 'react';

const GoogleAd = ({ slotId, style = {}, format = 'auto', layoutKey = '' }) => {
    useEffect(() => {
        try {
            // Push the ad to Google's queue
            (window.adsbygoogle = window.adsbygoogle || []).push({});
        } catch (err) {
            console.error('AdSense load error:', err);
        }
    }, []);

    return (
        <div style={{ overflow: 'hidden', ...style }}>
            <ins
                className="adsbygoogle"
                style={{ display: 'block' }}
                data-ad-client="ca-pub-3940256099942544" // REPLACE THIS with your AdSense Publisher ID
                data-ad-slot={slotId}
                data-ad-format={format}
                data-full-width-responsive="true"
                {...(layoutKey ? { 'data-ad-layout-key': layoutKey } : {})}
            />
        </div>
    );
};

export default GoogleAd;
