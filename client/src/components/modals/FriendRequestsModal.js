import React, { useState, useEffect } from 'react';
import './FriendRequestsModal.css';

function FriendRequestsModal({ isOpen, onClose, userId }) {
  const [requests, setRequests] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionSuccess, setActionSuccess] = useState('');

  // Fetch friend requests when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchFriendRequests();
    }
  }, [isOpen, userId]);

  // Fetch friend requests from API
  const fetchFriendRequests = async () => {
    if (!userId) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`http://localhost:5001/api/friend_requests?user_id=${userId}&type=received`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch friend requests: ${response.status}`);
      }
      
      const data = await response.json();
      setRequests(data);
    } catch (err) {
      console.error('Error fetching friend requests:', err);
      setError('Failed to load friend requests. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle accepting a friend request
  const handleAcceptRequest = async (requestId) => {
    setActionSuccess('');
    setError(null);
    setIsLoading(true);
    
    try {
      const response = await fetch(`http://localhost:5001/api/friend_requests/${requestId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: 'accepted'
        }),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to accept friend request: ${response.status}`);
      }
      
      // Remove the accepted request from the list
      setRequests(requests.filter(request => request.id !== requestId));
      setActionSuccess('Friend request accepted!');
    } catch (err) {
      console.error('Error accepting friend request:', err);
      setError('Failed to accept friend request. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle rejecting a friend request
  const handleRejectRequest = async (requestId) => {
    setActionSuccess('');
    setError(null);
    setIsLoading(true);
    
    try {
      const response = await fetch(`http://localhost:5001/api/friend_requests/${requestId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: 'rejected'
        }),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to reject friend request: ${response.status}`);
      }
      
      // Remove the rejected request from the list
      setRequests(requests.filter(request => request.id !== requestId));
      setActionSuccess('Friend request rejected.');
    } catch (err) {
      console.error('Error rejecting friend request:', err);
      setError('Failed to reject friend request. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop">
      <div className="friend-requests-modal">
        <div className="modal-header">
          <h2>Friend Requests</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>
        
        {isLoading && <div className="loading-indicator">Loading requests...</div>}
        
        {error && <div className="error-message">{error}</div>}
        {actionSuccess && <div className="success-message">{actionSuccess}</div>}
        
        <div className="requests-container">
          {requests.length > 0 ? (
            <ul className="request-list">
              {requests.map(request => (
                <li key={request.id} className="request-item">
                  <div className="user-info">
                    <span className="username">{request.username}</span>
                    {request.aura_color && (
                      <span className="user-aura" 
                        style={{
                          background: request.aura_color,
                        }}
                      />
                    )}
                  </div>
                  <div className="request-actions">
                    <button 
                      className="accept-button"
                      onClick={() => handleAcceptRequest(request.id)}
                      disabled={isLoading}
                    >
                      Accept
                    </button>
                    <button 
                      className="reject-button"
                      onClick={() => handleRejectRequest(request.id)}
                      disabled={isLoading}
                    >
                      Reject
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          ) : !isLoading ? (
            <div className="no-requests">No pending friend requests</div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export default FriendRequestsModal; 