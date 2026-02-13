import React from 'react';

const rankColors = {
    1: 'from-yellow-500 to-amber-400',
    2: 'from-gray-300 to-gray-400',
    3: 'from-orange-400 to-amber-600',
};

const rankEmojis = { 1: '🥇', 2: '🥈', 3: '🥉' };

const Leaderboard = ({ leaderboard = [], currentUserId }) => {
    if (leaderboard.length === 0) {
        return (
            <div className="text-gray-500 text-center py-4 italic text-sm">
                No leaderboard data yet. Participate to earn points!
            </div>
        );
    }

    return (
        <div className="space-y-2">
            {leaderboard.map((entry) => {
                const isCurrentUser = entry.id === currentUserId;
                const isTopThree = entry.rank <= 3;

                return (
                    <div
                        key={entry.id}
                        className={`flex items-center justify-between p-3 rounded-xl border transition-all duration-300 ${isCurrentUser
                                ? 'bg-indigo-900/40 border-indigo-500/50 ring-1 ring-indigo-500/30'
                                : 'bg-[#1c1c1e] border-gray-800 hover:border-gray-700'
                            }`}
                    >
                        <div className="flex items-center gap-3">
                            {/* Rank Badge */}
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${isTopThree
                                    ? `bg-gradient-to-br ${rankColors[entry.rank]} text-gray-900 shadow-lg`
                                    : 'bg-gray-700 text-gray-300'
                                }`}>
                                {isTopThree ? rankEmojis[entry.rank] : entry.rank}
                            </div>

                            {/* Name + Badges */}
                            <div>
                                <div className={`font-semibold text-sm ${isCurrentUser ? 'text-indigo-300' : 'text-white'}`}>
                                    {entry.name || 'Unknown'}
                                    {isCurrentUser && <span className="text-xs text-indigo-400 ml-1">(You)</span>}
                                </div>
                                {entry.badges && entry.badges.length > 0 && (
                                    <div className="flex gap-1 mt-0.5">
                                        {entry.badges.map((badge, i) => (
                                            <span key={i} className="text-xs" title={badge}>
                                                {badge}
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Points */}
                        <div className={`text-right font-bold ${isTopThree ? 'text-yellow-400' : 'text-gray-300'
                            }`}>
                            {entry.points}
                            <span className="text-xs text-gray-500 font-normal ml-1">pts</span>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

export default Leaderboard;
