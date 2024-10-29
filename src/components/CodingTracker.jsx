import React, { useState, useEffect } from 'react';
import { PlusCircle, MinusCircle, RefreshCcw, Trophy, Star, ExternalLink } from 'lucide-react';
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
  const [validationErrors, setValidationErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [showWinnerAnimation, setShowWinnerAnimation] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    localStorage.setItem('codingFriends', JSON.stringify(friends));
  }, [friends]);

  // Function to validate Codeforces username
  const validateCodeforcesUsername = async (username) => {
    try {
      const response = await fetch(`https://codeforces.com/api/user.info?handles=${username}`);
      const data = await response.json();
      return data.status === 'OK';
    } catch {
      return false;
    }
  };

  // Function to validate LeetCode username
  const validateLeetCodeUsername = async (username) => {
    try {
      const response = await fetch(`https://leetcode.com/graphql`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: `
            query userProfile($username: String!) {
              matchedUser(username: $username) {
                username
              }
            }
          `,
          variables: { username }
        })
      });
      const data = await response.json();
      return !!data.data?.matchedUser;
    } catch {
      return false;
    }
  };

  const handleAddFriend = async () => {
    if (!newFriend.name || !newFriend.platforms.codeforces || !newFriend.platforms.leetcode) {
      setError('Please fill in all fields');
      return;
    }

    setIsLoading(true);
    setError('');
    setValidationErrors({});

    try {
      const [isValidCF, isValidLC] = await Promise.all([
        validateCodeforcesUsername(newFriend.platforms.codeforces),
        validateLeetCodeUsername(newFriend.platforms.leetcode)
      ]);

      const newValidationErrors = {};
      if (!isValidCF) newValidationErrors.codeforces = 'Invalid Codeforces username';
      if (!isValidLC) newValidationErrors.leetcode = 'Invalid LeetCode username';

      if (Object.keys(newValidationErrors).length > 0) {
        setValidationErrors(newValidationErrors);
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
    } catch (err) {
      setError('Error validating usernames');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveFriend = (friendId) => {
    setFriends(prev => prev.filter(friend => friend.id !== friendId));
  };

  const fetchLeetCodeStats = async (username) => {
    try {
      const response = await fetch('https://leetcode.com/graphql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: `
            query getUserProfile($username: String!) {
              matchedUser(username: $username) {
                submitStats {
                  acSubmissionNum {
                    difficulty
                    count
                    submissions
                  }
                }
              }
            }
          `,
          variables: { username }
        })
      });
      const data = await response.json();
      const todayStats = data.data?.matchedUser?.submitStats?.acSubmissionNum || [];
      return todayStats.reduce((acc, curr) => acc + curr.count, 0);
    } catch {
      return 0;
    }
  };

  const fetchStats = async () => {
    setIsLoading(true);
    setRefreshKey(prev => prev + 1);
    const newStats = {};
    
    try {
      for (const friend of friends) {
        const [cfData, lcCount] = await Promise.all([
          fetchCodeforcesSubmissions(friend.platforms.codeforces),
          fetchLeetCodeStats(friend.platforms.leetcode)
        ]);
        
        const cfSubmissions = cfData.result || [];
        const today = new Date().setHours(0, 0, 0, 0);
        
        const cfDailyCount = cfSubmissions.filter(sub => 
          sub.verdict === 'OK' && 
          new Date(sub.creationTimeSeconds * 1000).setHours(0, 0, 0, 0) === today
        ).length;

        newStats[friend.id] = {
          codeforcesCount: cfDailyCount,
          leetcodeCount: lcCount,
          totalToday: cfDailyCount + lcCount
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
    
    const interval = setInterval(fetchStats, 60000);
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
              <div className="flex-1">
                <input
                  placeholder="Codeforces Username"
                  value={newFriend.platforms.codeforces}
                  onChange={(e) => setNewFriend({
                    ...newFriend,
                    platforms: {...newFriend.platforms, codeforces: e.target.value}
                  })}
                  className={`px-4 py-3 border rounded-lg w-full focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 bg-white ${
                    validationErrors.codeforces ? 'border-red-300' : 'border-indigo-200'
                  }`}
                />
                {validationErrors.codeforces && (
                  <p className="mt-1 text-sm text-red-600">{validationErrors.codeforces}</p>
                )}
              </div>
              <div className="flex-1">
                <input
                  placeholder="LeetCode Username"
                  value={newFriend.platforms.leetcode}
                  onChange={(e) => setNewFriend({
                    ...newFriend,
                    platforms: {...newFriend.platforms, leetcode: e.target.value}
                  })}
                  className={`px-4 py-3 border rounded-lg w-full focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 bg-white ${
                    validationErrors.leetcode ? 'border-red-300' : 'border-indigo-200'
                  }`}
                />
                {validationErrors.leetcode && (
                  <p className="mt-1 text-sm text-red-600">{validationErrors.leetcode}</p>
                )}
              </div>
              <button 
                onClick={handleAddFriend} 
                className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-all duration-300 transform hover:scale-105 active:scale-95 shadow-md disabled:opacity-50"
                disabled={isLoading}
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
                  <th className="px-6 py-4 text-center text-sm font-semibold text-indigo-900">CF Problems</th>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-indigo-900">LC Problems</th>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-indigo-900">Total Today</th>
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
                        <a
                          href={`https://codeforces.com/profile/${friend.platforms.codeforces}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-indigo-600 hover:text-indigo-800 transition-colors"
                        >
                          CF: {friend.platforms.codeforces}
                          <ExternalLink className="w-4 h-4" />
                        </a>
                        <a
                          href={`https://leetcode.com/${friend.platforms.leetcode}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-purple-600 hover:text-purple-800 transition-colors"
                        >
                          LC: {friend.platforms.leetcode}
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-indigo-100 text-indigo-700">
                        {stats[friend.id]?.codeforcesCount || 0}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
<span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-purple-100 text-purple-700">
                        {stats[friend.id]?.leetcodeCount || 0}
                      </span>
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
