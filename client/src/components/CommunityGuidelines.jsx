import Layout from './Layout';

const CommunityGuidelines = () => {
    return (
        <Layout>
            <div className="flex-1 max-w-4xl mx-auto px-6 py-12 md:py-20 animate-in fade-in slide-in-from-bottom-4 duration-700 w-full">
                <section className="space-y-16">
                    {/* Header */}
                    <div className="space-y-4 text-center">
                        <h2 className="text-4xl md:text-5xl font-black tracking-tight text-white leading-tight uppercase">Community Guidelines</h2>
                        <div className="flex items-center justify-center gap-3">
                            <span className="h-px w-8 bg-blue-600"></span>
                            <p className="text-blue-500 text-[10px] font-black uppercase tracking-[0.4em]">Building a Safe Community</p>
                            <span className="h-px w-8 bg-blue-600"></span>
                        </div>
                    </div>

                    <div className="prose prose-invert max-w-none space-y-12 text-slate-400 text-sm md:text-base leading-relaxed font-medium">

                        {/* Intro */}
                        <div className="bg-slate-800/20 p-8 rounded-[2rem] border border-white/5 text-center space-y-4">
                            <p className="text-lg text-white font-medium leading-relaxed">
                                Mrgana.com is a global community, and we're committed to creating an online space where individuals can genuinely connect with new people and make new friends, securely and safely.
                            </p>
                            <p className="text-red-400 font-black uppercase tracking-widest text-xs">
                                Any violation of these guidelines may result in a permanent account ban.
                            </p>
                        </div>

                        {/* Be Respectful Section */}
                        <div className="space-y-6 text-left">
                            <h3 className="text-2xl font-black text-white uppercase tracking-tighter flex items-center gap-3">
                                <span className="bg-blue-600 text-white p-1 rounded-lg text-xs">01</span>
                                Be Respectful
                            </h3>
                            <div className="pl-11 space-y-4">
                                <p>
                                    We have a zero-tolerance policy for offensive content and abusive behavior. Bullying, harassment, discrimination, and inappropriate content are strictly prohibited on Mrgana.com.
                                </p>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 py-4">
                                    {["Bullying", "Nudity", "Drugs", "Spam"].map((item) => (
                                        <div key={item} className="bg-red-500/10 border border-red-500/20 py-3 rounded-xl text-center text-red-500 font-black uppercase text-[10px] tracking-widest">
                                            No {item}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Critical Rules Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="bg-slate-900/40 p-8 rounded-3xl border border-white/5 space-y-4 border-l-4 border-l-blue-600">
                                <h4 className="text-white font-black uppercase tracking-widest text-sm">18 and Over</h4>
                                <p className="text-xs leading-relaxed opacity-70">
                                    The age rating for Mrgana.com is 18+. Individuals under the age of 18 are strictly prohibited. Any individuals found to be under 18 will be blocked and accounts terminated.
                                </p>
                            </div>
                            <div className="bg-slate-900/40 p-8 rounded-3xl border border-white/5 space-y-4 border-l-4 border-l-pink-600">
                                <h4 className="text-white font-black uppercase tracking-widest text-sm">Sexually Explicit Content</h4>
                                <p className="text-xs leading-relaxed opacity-70">
                                    Zero-tolerance policy for promoting and/or distributing pornographic content. Any and all indications of child sexual exploitation are promptly reported to authorities.
                                </p>
                            </div>
                            <div className="bg-slate-900/40 p-8 rounded-3xl border border-white/5 space-y-4 border-l-4 border-l-yellow-600">
                                <h4 className="text-white font-black uppercase tracking-widest text-sm">Impersonation</h4>
                                <p className="text-xs leading-relaxed opacity-70">
                                    Any attempt to impersonate others is strictly prohibited. This includes deception about your age, name, or using someone else's photos.
                                </p>
                            </div>
                            <div className="bg-slate-900/40 p-8 rounded-3xl border border-white/5 space-y-4 border-l-4 border-l-green-600">
                                <h4 className="text-white font-black uppercase tracking-widest text-sm">Obey the Law</h4>
                                <p className="text-xs leading-relaxed opacity-70">
                                    Illegal activity of any nature is prohibited. Safety is our priority. No threats, weapons, violence, or promoting illegal services.
                                </p>
                            </div>
                        </div>

                        {/* Roles Section */}
                        <div className="space-y-8 pt-6">
                            <div className="text-center space-y-2">
                                <h3 className="text-3xl font-black text-white uppercase tracking-tighter">Guidelines for Roles</h3>
                                <p className="text-xs text-blue-500 font-bold uppercase tracking-widest">Best practices for the community</p>
                            </div>

                            <div className="space-y-6">
                                {/* Host */}
                                <div className="group bg-slate-800/20 p-8 rounded-[2.5rem] border border-white/5 hover:border-blue-500/20 transition-all">
                                    <div className="flex items-center gap-4 mb-4">
                                        <div className="w-12 h-12 bg-blue-600/20 rounded-2xl flex items-center justify-center text-blue-500 text-xl font-black">H</div>
                                        <h4 className="text-xl font-black text-white uppercase tracking-tight">The Host</h4>
                                    </div>
                                    <p className="text-sm opacity-70 mb-4">When you start a party, you guide the conversation and influence the content and style. Best hosts thoughtfully curate the speaker group and actively manage the conversation flow.</p>
                                </div>

                                {/* Speaker */}
                                <div className="group bg-slate-800/20 p-8 rounded-[2.5rem] border border-white/5 hover:border-pink-500/20 transition-all">
                                    <div className="flex items-center gap-4 mb-4">
                                        <div className="w-12 h-12 bg-pink-600/20 rounded-2xl flex items-center justify-center text-pink-500 text-xl font-black">S</div>
                                        <h4 className="text-xl font-black text-white uppercase tracking-tight">The Speaker</h4>
                                    </div>
                                    <p className="text-sm opacity-70">Successful speakers share the stage and take turns. Know when to mute to minimize background noise, and bow out anytime without feeling judged.</p>
                                </div>

                                {/* Audience */}
                                <div className="group bg-slate-800/20 p-8 rounded-[2.5rem] border border-white/5 hover:border-green-500/20 transition-all">
                                    <div className="flex items-center gap-4 mb-4">
                                        <div className="w-12 h-12 bg-green-600/20 rounded-2xl flex items-center justify-center text-green-500 text-xl font-black">A</div>
                                        <h4 className="text-xl font-black text-white uppercase tracking-tight">The Audience</h4>
                                    </div>
                                    <p className="text-sm opacity-70">Relax and enjoy the conversation. No pressure to speak, but feel free to raise your hand to chime in. You can come and go as you please with "leave quietly".</p>
                                </div>
                            </div>
                        </div>

                        {/* Footer Contact */}
                        <div className="pt-12 border-t border-white/10 text-center space-y-6">
                            <p className="text-white text-lg font-bold">Thank you for helping us build an amazing community!</p>
                            <div className="flex flex-col items-center gap-2">
                                <span className="text-[10px] font-black text-slate-600 uppercase tracking-[0.4em]">Questions? Contact us</span>
                                <a href="mailto:animeshdalui4545@gmail.com" className="text-blue-500 font-extrabold hover:text-blue-400 transition-colors tracking-tight text-lg underline">animeshdalui4545@gmail.com</a>
                            </div>
                            <p className="text-[9px] font-black text-slate-700 uppercase tracking-[0.3em]">Team Mrgana.com</p>
                        </div>
                    </div>
                </section>
            </div>
        </Layout>
    );
};

export default CommunityGuidelines;
