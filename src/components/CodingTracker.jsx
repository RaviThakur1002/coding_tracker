import React, { useState, useEffect } from 'react';
import { PlusCircle, MinusCircle, RefreshCcw, Trophy, Star } from 'lucide-react';
import { fetchCodeforcesSubmissions } from '../utils/api';

const CodingTracker = () => {
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
  const [refreshKey, setRefreshKey] = useState(0); // For refresh animation

  // Save friends to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('codingFriends', JSON.stringify(friends));
  }, [friends]);

  const handleAddFriend = () => {
    if (!newFriend.name || !newFriend.platforms.codeforces || !newFriend.platforms.leetcode) {
      setError('Please fill in all fields');
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
  };

  const fetchStats = async () => {
    setIsLoading(true);
    setRefreshKey(prev => prev + 1); // Trigger refresh animation
    const newStats = {};
    
    try {
      for (const friend of friends) {
        const cfData = await fetchCodeforcesSubmissions(friend.platforms.codeforces);
        const cfSubmissions = cfData.result || [];
        
        const today = new Date().setHours(0, 0, 0, 0);
        
        const cfDailyCount = cfSubmissions.filter(sub => 
          sub.verdict === 'OK' && 
          new Date(sub.creationTimeSeconds * 1000).setHours(0, 0, 0, 0) === today
        ).length;

        newStats[friend.id] = {
          totalToday: cfDailyCount
        };
      }
      
      setStats(newStats);
      
      const hasNewWinner = Object.values(newStats).some(stat => stat.totalToday >= 5);
      if (hasNewWinner) {
        setShowWinnerAnimation(true);
        setTimeout(() => setShowWinnerAnimation(false), 3000);
      }
    } catch (error) {
      setError('Error fetching statistics');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (friends.length > 0) {
      fetchStats();
    }
    
    const interval = setInterval(fetchStats, 60000); // Update every minute
    return () => clearInterval(interval);
  }, [friends]);

  const isWinner = (friendId) => {
    return stats[friendId]?.totalToday >= 5;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 p-4">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl p-6 relative overflow-hidden backdrop-blur-lg bg-opacity-90 transition-all duration-300 hover:shadow-2xl">
          {showWinnerAnimation && (
            <div className="absolute inset-0 bg-gradient-to-r from-purple-200 to-indigo-200 opacity-20 animate-pulse" />
          )}
          
          <div className="flex flex-row items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <Star className="w-8 h-8 text-indigo-500 animate-spin-slow" />
              <h2 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 text-transparent bg-clip-text">
                Today's Coding Champions
              </h2>
            </div>
            <button 
              onClick={fetchStats} 
              className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-all duration-300 transform hover:scale-105 active:scale-95 shadow-md"
              disabled={isLoading}
            >
              <RefreshCcw 
                className={`w-5 h-5 transition-transform duration-700 ease-in-out ${isLoading ? 'animate-spin' : `rotate-${refreshKey * 360}`}`} 
              />
              {isLoading ? 'Updating...' : 'Refresh'}
            </button>
          </div>
          
          <div className="mb-8 bg-gradient-to-r from-indigo-50 to-purple-50 p-6 rounded-xl">
            <h3 className="text-xl font-semibold mb-4 text-indigo-800">Add New Champion</h3>
            <div className="flex gap-4 mb-2">
              <input
                placeholder="Friend's Name"
                value={newFriend.name}
                onChange={(e) => setNewFriend({...newFriend, name: e.target.value})}
                className="px-4 py-3 border border-indigo-200 rounded-lg flex-1 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 bg-white"
              />
              <input
                placeholder="Codeforces Username"
                value={newFriend.platforms.codeforces}
                onChange={(e) => setNewFriend({
                  ...newFriend,
                  platforms: {...newFriend.platforms, codeforces: e.target.value}
                })}
                className="px-4 py-3 border border-indigo-200 rounded-lg flex-1 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 bg-white"
              />
              <input
                placeholder="LeetCode Username"
                value={newFriend.platforms.leetcode}
                onChange={(e) => setNewFriend({
                  ...newFriend,
                  platforms: {...newFriend.platforms, leetcode: e.target.value}
                })}
                className="px-4 py-3 border border-indigo-200 rounded-lg flex-1 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 bg-white"
              />
              <button 
                onClick={handleAddFriend} 
                className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-all duration-300 transform hover:scale-105 active:scale-95 shadow-md"
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

          <div className="overflow-hidden rounded-xl shadow-lg">
            <table className="w-full border-collapse bg-white">
              <thead className="bg-gradient-to-r from-indigo-100 to-purple-100">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-indigo-900">Champion</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-indigo-900">Platforms</th>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-indigo-900">Today's Solved</th>
                  <th className="px-6 py-4 text-right text-sm font-semibold text-indigo-900">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-indigo-100">
                {friends.map((friend) => (
                  <tr 
                    key={friend.id}
                    className={`transition-all duration-500 transform hover:scale-[1.01] ${
                      isWinner(friend.id) 
                        ? 'bg-gradient-to-r from-indigo-50 to-purple-50' 
                        : 'hover:bg-indigo-50'
                    }`}
                  >
                    <td className="px-6 py-4 text-sm text-indigo-900 flex items-center gap-3">
                      {isWinner(friend.id) && (
                        <Trophy className="w-6 h-6 text-yellow-500 animate-bounce" />
                      )}
                      <span className={`font-medium ${isWinner(friend.id) ? 'text-indigo-700' : ''}`}>
                        {friend.name}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <div className="space-y-1">
                        <div className="text-indigo-600">CF: {friend.platforms.codeforces}</div>
                        <div className="text-purple-600">LC: {friend.platforms.leetcode}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-flex items-center justify-center w-10 h-10 rounded-full ${
                        isWinner(friend.id) 
                          ? 'bg-indigo-100 text-indigo-700 font-bold animate-pulse' 
                          : 'bg-gray-100 text-gray-700'
                      }`}>
                        {stats[friend.id]?.totalToday || 0}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleRemoveFriend(friend.id)}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-100 text-indigo-700 rounded-lg hover:bg-indigo-200 transition-all duration-300"
                      >
                        <MinusCircle className="w-4 h-4" />
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CodingTracker;

