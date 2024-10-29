import React, { useState, useEffect } from 'react';
import { PlusCircle, MinusCircle, RefreshCcw, Trophy, Star, Sun, Moon } from 'lucide-react';

// Assuming this is implemented in your api.js
import { fetchCodeforcesSubmissions } from '../utils/api';

const CodingTracker = () => {
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('darkMode');
    return saved ? JSON.parse(saved) : true;
  });
  
  const [friends, setFriends] = useState(() => {
    const savedFriends = localStorage.getItem('codingFriends');
    return savedFriends ? JSON.parse(savedFriends) : [];
  });
  
  const [newFriend, setNewFriend] = useState({
    name: '',
    platforms: {
      codeforces: '',
      leetcode: ''
    }
  });

  const [stats, setStats] = useState({});
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showWinnerAnimation, setShowWinnerAnimation] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    localStorage.setItem('codingFriends', JSON.stringify(friends));
    localStorage.setItem('darkMode', JSON.stringify(darkMode));
    
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [friends, darkMode]);

  const handleAddFriend = () => {
    if (!newFriend.name || !newFriend.platforms.codeforces || !newFriend.platforms.leetcode) {
      setError('Please fill in all fields');
      return;
    }

    if (friends.some(friend => 
      friend.platforms.codeforces.toLowerCase() === newFriend.platforms.codeforces.toLowerCase() ||
      friend.platforms.leetcode.toLowerCase() === newFriend.platforms.leetcode.toLowerCase()
    )) {
      setError('A friend with these platform usernames already exists');
      return;
    }

    setFriends(prev => [...prev, { ...newFriend, id: Date.now() }]);
    setNewFriend({
      name: '',
      platforms: {
        codeforces: '',
        leetcode: ''
      }
    });
    setError('');
  };

  const handleRemoveFriend = (friendId) => {
    setFriends(prev => prev.filter(friend => friend.id !== friendId));
    setStats(prev => {
      const newStats = { ...prev };
      delete newStats[friendId];
      return newStats;
    });
  };

  const fetchStats = async () => {
    setIsLoading(true);
    setRefreshKey(prev => prev + 1);
    const newStats = {};
    
    try {
      for (const friend of friends) {
        const cfData = await fetchCodeforcesSubmissions(friend.platforms.codeforces);
        const cfSubmissions = cfData.result || [];
        
        const today = new Date().setHours(0, 0, 0, 0);
        
        const cfDailyCount = cfSubmissions.filter(sub => {
          const submissionDate = new Date(sub.creationTimeSeconds * 1000).setHours(0, 0, 0, 0);
          return sub.verdict === 'OK' && submissionDate === today;
        }).length;

        // TODO: Integrate actual LeetCode API
        const lcDailyCount = 0;

        newStats[friend.id] = {
          codeforces: cfDailyCount,
          leetcode: lcDailyCount,
          total: cfDailyCount + lcDailyCount
        };
      }
      
      setStats(newStats);
      
      const hasNewWinner = Object.values(newStats).some(stat => stat.total >= 5);
      if (hasNewWinner) {
        setShowWinnerAnimation(true);
        setTimeout(() => setShowWinnerAnimation(false), 3000);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
      setError('Error fetching statistics. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (friends.length > 0) {
      fetchStats();
    }
    
    const interval = setInterval(fetchStats, 300000); // Every 5 minutes
    return () => clearInterval(interval);
  }, [friends]);

  const isWinner = (friendId) => {
    return stats[friendId]?.total >= 5;
  };

  return (
    <div className={`min-h-screen w-full absolute top-0 transition-colors duration-300 ${
      darkMode 
        ? 'bg-gradient-to-br from-gray-900 to-indigo-900' 
        : 'bg-gradient-to-br from-indigo-50 to-purple-50'
    } p-2 sm:p-4 mt-0`}>
      <div className="max-w-6xl mx-auto">
        <div className={`rounded-2xl shadow-xl p-3 sm:p-6 relative overflow-hidden backdrop-blur-lg transition-all duration-300 hover:shadow-2xl ${
          darkMode 
            ? 'bg-gray-800 bg-opacity-90' 
            : 'bg-white bg-opacity-90'
        }`}>
          {showWinnerAnimation && (
            <div className="absolute inset-0 bg-gradient-to-r from-purple-200 to-indigo-200 opacity-20 animate-pulse" />
          )}
          
          <div className="flex flex-col sm:flex-row items-center justify-between mb-6 sm:mb-8 gap-4">
            <div className="flex items-center gap-3">
              <Star className={`w-6 h-6 sm:w-8 sm:h-8 ${darkMode ? 'text-indigo-400' : 'text-indigo-500'} animate-spin-slow`} />
              <h2 className={`text-2xl sm:text-3xl font-bold bg-gradient-to-r ${
                darkMode 
                  ? 'from-indigo-400 to-purple-400' 
                  : 'from-indigo-600 to-purple-600'
              } text-transparent bg-clip-text`}>
                Today's Coding Champions
              </h2>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={() => setDarkMode(!darkMode)}
                className={`p-2 sm:p-3 rounded-lg transition-all duration-300 transform hover:scale-105 ${
                  darkMode 
                    ? 'bg-gray-700 text-yellow-400 hover:bg-gray-600' 
                    : 'bg-indigo-100 text-indigo-600 hover:bg-indigo-200'
                }`}
              >
                {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>
              <button 
                onClick={fetchStats} 
                className={`flex items-center gap-2 px-4 sm:px-6 py-2 sm:py-3 rounded-lg transition-all duration-300 transform hover:scale-105 active:scale-95 shadow-md ${
                  darkMode
                    ? 'bg-indigo-600 text-white hover:bg-indigo-500'
                    : 'bg-indigo-600 text-white hover:bg-indigo-700'
                } disabled:opacity-50`}
                disabled={isLoading}
              >
                <RefreshCcw 
                  className={`w-5 h-5 transition-transform duration-700 ease-in-out ${
                    isLoading ? 'animate-spin' : `rotate-${refreshKey * 360}`
                  }`} 
                />
                {isLoading ? 'Updating...' : 'Refresh'}
              </button>
            </div>
          </div>
          
          <div className={`mb-6 sm:mb-8 p-4 sm:p-6 rounded-xl ${
            darkMode 
              ? 'bg-gray-700' 
              : 'bg-gradient-to-r from-indigo-50 to-purple-50'
          }`}>
            <h3 className={`text-lg sm:text-xl font-semibold mb-4 ${
              darkMode ? 'text-white' : 'text-indigo-800'
            }`}>Add New Champion</h3>
            <div className="flex flex-col sm:flex-row gap-4 mb-2">
              <input
                placeholder="Friend's Name"
                value={newFriend.name}
                onChange={(e) => setNewFriend({...newFriend, name: e.target.value})}
                className={`px-4 py-3 rounded-lg flex-1 transition-all duration-200 ${
                  darkMode
                    ? 'bg-gray-600 border-gray-500 text-white placeholder-gray-400'
                    : 'bg-white border-indigo-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500'
                }`}
              />
              <input
                placeholder="Codeforces Username"
                value={newFriend.platforms.codeforces}
                onChange={(e) => setNewFriend({
                  ...newFriend,
                  platforms: {...newFriend.platforms, codeforces: e.target.value}
                })}
                className={`px-4 py-3 rounded-lg flex-1 transition-all duration-200 ${
                  darkMode
                    ? 'bg-gray-600 border-gray-500 text-white placeholder-gray-400'
                    : 'bg-white border-indigo-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500'
                }`}
              />
              <input
                placeholder="LeetCode Username"
                value={newFriend.platforms.leetcode}
                onChange={(e) => setNewFriend({
                  ...newFriend,
                  platforms: {...newFriend.platforms, leetcode: e.target.value}
                })}
                className={`px-4 py-3 rounded-lg flex-1 transition-all duration-200 ${
                  darkMode
                    ? 'bg-gray-600 border-gray-500 text-white placeholder-gray-400'
                    : 'bg-white border-indigo-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500'
                }`}
              />
              <button 
                onClick={handleAddFriend} 
                className={`flex items-center gap-2 px-6 py-3 rounded-lg transition-all duration-300 transform hover:scale-105 active:scale-95 shadow-md whitespace-nowrap ${
                  darkMode
                    ? 'bg-indigo-600 text-white hover:bg-indigo-500'
                    : 'bg-indigo-600 text-white hover:bg-indigo-700'
                }`}
              >
                <PlusCircle className="w-5 h-5" />
                Add Friend
              </button>
            </div>
            {error && (
              <div className="mt-3 p-4 bg-red-50 text-red-800 rounded-lg border border-red-100 animate-fadeIn">
                {error}
              </div>
            )}
          </div>

          <div className="overflow-x-auto rounded-xl shadow-lg">
            <table className="w-full border-collapse">
              <thead className={`${
                darkMode 
                  ? 'bg-gray-700 text-gray-200' 
                  : 'bg-gradient-to-r from-indigo-100 to-purple-100 text-indigo-900'
              }`}>
                <tr>
                  <th className="px-4 sm:px-6 py-4 text-left text-sm font-semibold">Champion</th>
                  <th className="px-4 sm:px-6 py-4 text-left text-sm font-semibold">Platforms</th>
                  <th className="px-4 sm:px-6 py-4 text-center text-sm font-semibold">CF Problems</th>
                  <th className="px-4 sm:px-6 py-4 text-center text-sm font-semibold">LC Problems</th>
                  <th className="px-4 sm:px-6 py-4 text-center text-sm font-semibold">Total</th>
                  <th className="px-4 sm:px-6 py-4 text-right text-sm font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${
                darkMode 
                  ? 'divide-gray-700 bg-gray-800' 
                  : 'divide-indigo-100 bg-white'
              }`}>
                {friends.map((friend) => (
                  <tr 
                    key={friend.id}
                    className={`transition-all duration-500 transform hover:scale-[1.01] ${
                      darkMode
                        ? isWinner(friend.id)
                          ? 'bg-gradient-to-r from-gray-700 to-indigo-900'
                          : 'hover:bg-gray-700'
                        : isWinner(friend.id)
                          ? 'bg-gradient-to-r from-indigo-50 to-purple-50'
                          : 'hover:bg-indigo-50'
                    }`}
                  >
                    <td className={`px-4 sm:px-6 py-4 text-sm flex items-center gap-3 ${
                      darkMode ? 'text-gray-200' : 'text-indigo-900'
                    }`}>
                      {isWinner(friend.id) && (
                        <Trophy className="w-6 h-6 text-yellow-500 animate-bounce" />
                      )}
                      <span className={`font-medium ${
                        isWinner(friend.id) 
                          ? darkMode ? 'text-indigo-400' : 'text-indigo-700'
                          : ''
                      }`}>
                        {friend.name}
                      </span>
                    </td>
                    <td className="px-4 sm:px-6 py-4 text-sm">
                      <div className="space-y-1">
                        <a
                          href={`https://codeforces.com/profile/${friend.platforms.codeforces}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`block hover:underline ${
                            darkMode ? 'text-indigo-400' : 'text-indigo-600'
                          }`}
                        >
                          CF: {friend.platforms.codeforces}
                        </a>
                        <a
                          href={`https://leetcode.com/${friend.platforms.leetcode}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`block hover:underline ${
                            darkMode ? 'text-purple-400' : 'text-purple-600'
                          }`}
                        >
                          LC: {friend.platforms.leetcode}
                        </a>
                      </div>
                    </td>
                    <td className="px-4 sm:px-6 py-4 text-center">
                      <div className="flex justify-center">
                        <div className={`flex items-center justify-center min-w-[2rem] sm:min-w-[2.5rem] h-8 sm:h-10 px-3 rounded-full text-sm sm:text-base font-medium transition-all duration-300 ${
                          darkMode
                            ? 'bg-gray-700 text-indigo-400'
                            : 'bg-indigo-100 text-indigo-700'
                        }`}>
                          {stats[friend.id]?.codeforces || 0}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 sm:px-6 py-4 text-center">
                      <div className="flex justify-center">
                        <div className={`flex items-center justify-center min-w-[2rem] sm:min-w-[2.5rem] h-8 sm:h-10 px-3 rounded-full text-sm sm:text-base font-medium transition-all duration-300 ${
                          darkMode
                            ? 'bg-gray-700 text-purple-400'
                            : 'bg-purple-100 text-purple-700'
                        }`}>
                          {stats[friend.id]?.leetcode || 0}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 sm:px-6 py-4 text-center">
                      <div className="flex justify-center">
                        <div className={`flex items-center justify-center min-w-[2rem] sm:min-w-[2.5rem] h-8 sm:h-10 px-3 rounded-full text-sm sm:text-base font-medium transition-all duration-300 ${
                          isWinner(friend.id)
                            ? darkMode
                              ? 'bg-indigo-900 text-indigo-300 font-bold animate-pulse'
                              : 'bg-indigo-100 text-indigo-700 font-bold animate-pulse'
                            : darkMode
                              ? 'bg-gray-700 text-gray-300'
                              : 'bg-gray-100 text-gray-700'
                        }`}>
                          {stats[friend.id]?.total || 0}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 sm:px-6 py-4 text-right">
                      <button
                        onClick={() => handleRemoveFriend(friend.id)}
                        className={`inline-flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg transition-all duration-300 hover:scale-105 ${
                          darkMode
                            ? 'bg-gray-700 text-gray-200 hover:bg-gray-600'
                            : 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200'
                        }`}
                      >
                        <MinusCircle className="w-4 h-4" />
                        <span className="hidden sm:inline">Remove</span>
                      </button>
                    </td>
                  </tr>
                ))}
                {friends.length === 0 && (
                  <tr>
                    <td 
                      colSpan="6" 
                      className={`px-6 py-8 text-center text-sm ${
                        darkMode ? 'text-gray-400' : 'text-gray-500'
                      }`}
                    >
                      No champions added yet. Start by adding your first coding champion!
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CodingTracker;
