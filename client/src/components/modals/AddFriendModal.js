import React, { useState, useEffect } from 'react';
import './AddFriendModal.css';

function AddFriendModal({ isOpen, onClose, userId }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setSearchQuery('');
      setSearchResults([]);
      setError(null);
      setSuccessMessage('');
    }
  }, [isOpen]);

  // Auto-search as user types
  useEffect(() => {
    // Set a debounce timer to avoid excessive API calls
    const debounceTimer = setTimeout(() => {
      if (searchQuery.trim().length >= 2) {
        handleSearch();
      } else if (searchQuery.trim().length === 0) {
        setSearchResults([]);
      }
    }, 300); // 300ms delay

    // Clean up the timer
    return () => clearTimeout(debounceTimer);
  }, [searchQuery]);

  // Search for users
  const handleSearch = async () => {
    if (!searchQuery.trim() || searchQuery.trim().length < 2) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`http://localhost:5001/api/users/search?query=${encodeURIComponent(searchQuery)}`);
      
      if (!response.ok) {
        throw new Error(`Search failed: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Filter out the current user from results
      const filteredResults = data.filter(user => user.id !== parseInt(userId));
      setSearchResults(filteredResults);
    } catch (err) {
      setError('Failed to search for users. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Send friend request
  const sendFriendRequest = async (friendId) => {
    setIsLoading(true);
    setError(null);
    setSuccessMessage('');
    
    try {
      const response = await fetch('http://localhost:5001/api/friend_requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sender_id: userId,
          receiver_id: friendId
        }),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to send friend request: ${response.status}`);
      }
      
      // Success message
      setSuccessMessage('Friend request sent successfully!');
      
      // Update the search results to show the request is pending
      setSearchResults(prevResults => 
        prevResults.map(user => 
          user.id === friendId ? { ...user, requestSent: true } : user
        )
      );
    } catch (err) {
      setError('Failed to send friend request. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop">
      <div className="add-friend-modal">
        <div className="modal-header">
          <h2>Add Friend</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>
        
        <div className="search-container">
          <input
            type="text"
            placeholder="Search by username"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
            autoFocus
          />
        </div>
        
        {isLoading && <div className="loading-indicator">Searching...</div>}
        
        {error && <div className="error-message">{error}</div>}
        {successMessage && <div className="success-message">{successMessage}</div>}
        
        <div className="search-results">
          {searchResults.length > 0 ? (
            <ul className="user-list">
              {searchResults.map(user => (
                <li key={user.id} className="user-item">
                  <div className="user-info">
                    <span className="username">{user.username}</span>
                    {user.aura_color && (
                      <span className="user-aura" 
                        style={{
                          background: `linear-gradient(to right, ${user.aura_color.split(',')[0] || '#4ecdc4'}, ${user.aura_color.split(',')[1] || '#00b7c2'})`,
                        }}
                      />
                    )}
                  </div>
                  <button 
                    className={`send-request-button ${user.requestSent ? 'sent' : ''}`}
                    onClick={() => sendFriendRequest(user.id)}
                    disabled={user.requestSent || isLoading}
                  >
                    {user.requestSent ? 'Request Sent' : 'Add Friend'}
                  </button>
                </li>
              ))}
            </ul>
          ) : searchQuery.trim().length >= 2 && !isLoading ? (
            <div className="no-results">No users found matching "{searchQuery}"</div>
          ) : searchQuery.trim().length === 0 ? (
            <div className="search-hint">Start typing to search for users</div>
          ) : searchQuery.trim().length === 1 ? (
            <div className="search-hint">Type at least 2 characters to search</div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export default AddFriendModal; 