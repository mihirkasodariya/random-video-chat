import { useEffect } from 'react';

const GoogleAd = ({ slotId, style = {}, sizes = [[300, 250]], divId = '' }) => {
    const id = divId || `div-gpt-ad-${slotId}-${Math.random().toString(36).substr(2, 9)}`;

    useEffect(() => {
        const { googletag } = window;
        googletag.cmd.push(() => {
            // Clean up existing slot if any
            const existingSlots = googletag.pubads().getSlots();
            const oldSlot = existingSlots.find(s => s.getSlotElementId() === id);
            if (oldSlot) googletag.destroySlots([oldSlot]);

            // Define new slot
            const slot = googletag.defineSlot(
                slotId,
                sizes,
                id
            ).addService(googletag.pubads());

            googletag.display(id);
            // Refresh to ensure ad fills in SRA mode
            googletag.pubads().refresh([slot]);
        });

        return () => {
            googletag.cmd.push(() => {
                const slots = googletag.pubads().getSlots();
                const slotToDestroy = slots.find(s => s.getSlotElementId() === id);
                if (slotToDestroy) googletag.destroySlots([slotToDestroy]);
            });
        };
    }, [slotId, id]);

    return (
        <div
            className="ad-container relative flex items-center justify-center bg-slate-900/40 border border-white/5 overflow-hidden shadow-inner"
            style={{
                minHeight: style.height || '250px',
                minWidth: style.width || '300px',
                ...style
            }}
        >
            <div id={id} className="mx-auto"></div>

            {/* Background Hint (Visible if ad fails to fill) */}
            <div className="absolute inset-0 flex flex-col items-center justify-center -z-10 border border-white/5 bg-slate-800 animate-[pulse_4s_infinite]">
                <div className="relative">
                    <div className="w-10 h-10 border-2 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div>
                    <div className="absolute inset-0 flex items-center justify-center text-[7px] font-black text-blue-500">GAM</div>
                </div>
                <span className="text-slate-600 text-[8px] font-black uppercase tracking-[0.3em] mt-3">Loading Ad...</span>
            </div>
        </div>
    );
};

export default GoogleAd;
