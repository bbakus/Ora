from flask import jsonify, request
from flask_restful import Resource
from server.extensions import api, db
from server.models.user import User
from server.models.friend_request import FriendRequest  # You'll need to create this model

class UserSearch(Resource):
    def get(self):
        """
        Search for users by username
        Query parameter: query - The search string to match against usernames
        """
        search_query = request.args.get('query', '')
        
        if not search_query:
            return [], 200
        
        # Search for users with usernames that contain the search query
        users = User.query.filter(User.username.ilike(f'%{search_query}%')).limit(20).all()
        
        # Convert to list of dictionaries
        user_list = [
            {
                'id': user.id,
                'username': user.username,
                'aura_color': user.aura_color,
                'aura_shape': user.aura_shape
            }
            for user in users
        ]
        
        return user_list, 200

class FriendRequestResource(Resource):
    def post(self):
        """
        Create a new friend request
        JSON body: sender_id, receiver_id
        """
        data = request.get_json()
        
        if not data:
            return {'error': 'No data provided'}, 400
        
        sender_id = data.get('sender_id')
        receiver_id = data.get('receiver_id')
        
        if not sender_id or not receiver_id:
            return {'error': 'Missing sender_id or receiver_id'}, 400
        
        # Check if users exist
        sender = User.query.get(sender_id)
        receiver = User.query.get(receiver_id)
        
        if not sender or not receiver:
            return {'error': 'Sender or receiver does not exist'}, 404
        
        # Check if they are already friends
        # This assumes you have a many-to-many relationship between users for friendships
        if receiver in sender.friends:
            return {'error': 'Already friends'}, 400
        
        # Check if a request already exists
        existing_request = FriendRequest.query.filter_by(
            sender_id=sender_id, 
            receiver_id=receiver_id,
            status='pending'
        ).first()
        
        if existing_request:
            return {'error': 'Friend request already sent'}, 400
        
        # Create the friend request
        friend_request = FriendRequest(
            sender_id=sender_id,
            receiver_id=receiver_id,
            status='pending'
        )
        
        db.session.add(friend_request)
        db.session.commit()
        
        return {'message': 'Friend request sent'}, 201
    
    def get(self):
        """
        Get all friend requests for a user
        Query parameter: user_id - The user to get requests for
        Query parameter: type - Either 'sent' or 'received'
        """
        user_id = request.args.get('user_id')
        request_type = request.args.get('type', 'received')  # Default to received
        
        if not user_id:
            return {'error': 'Missing user_id parameter'}, 400
        
        # Get either sent or received requests
        if request_type == 'sent':
            requests = FriendRequest.query.filter_by(
                sender_id=user_id,
                status='pending'
            ).all()
        else:  # 'received'
            requests = FriendRequest.query.filter_by(
                receiver_id=user_id,
                status='pending'
            ).all()
        
        # Convert to list of dictionaries
        request_list = []
        
        for req in requests:
            user = User.query.get(req.receiver_id if request_type == 'sent' else req.sender_id)
            
            if user:
                request_list.append({
                    'id': req.id,
                    'user_id': user.id,
                    'username': user.username,
                    'aura_color': user.aura_color,
                    'aura_shape': user.aura_shape,
                    'created_at': req.created_at.isoformat() if hasattr(req, 'created_at') else None
                })
        
        return request_list, 200
    
    def patch(self, request_id):
        """
        Update a friend request status (accept or reject)
        JSON body: status - Either 'accepted' or 'rejected'
        """
        data = request.get_json()
        
        if not data:
            return {'error': 'No data provided'}, 400
        
        status = data.get('status')
        
        if status not in ['accepted', 'rejected']:
            return {'error': 'Status must be either "accepted" or "rejected"'}, 400
        
        # Find the friend request
        friend_request = FriendRequest.query.get(request_id)
        
        if not friend_request:
            return {'error': 'Friend request not found'}, 404
        
        # Update status
        friend_request.status = status
        
        # If accepted, add the friendship relationship
        if status == 'accepted':
            sender = User.query.get(friend_request.sender_id)
            receiver = User.query.get(friend_request.receiver_id)
            
            if sender and receiver:
                # Add each user to the other's friends list
                # This assumes you have a many-to-many relationship for friendships
                sender.friends.append(receiver)
                receiver.friends.append(sender)
        
        db.session.commit()
        
        return {'message': f'Friend request {status}'}, 200

class UserFriends(Resource):
    def get(self, user_id):
        """Get all friends for a user"""
        user = User.query.get(user_id)
        
        if not user:
            return {'error': 'User not found'}, 404
        
        # This assumes you have a many-to-many relationship between users for friendships
        friends = []
        
        if hasattr(user, 'friends'):
            for friend in user.friends:
                friends.append({
                    'id': friend.id,
                    'username': friend.username,
                    'aura_color': friend.aura_color,
                    'aura_shape': friend.aura_shape
                })
        
        return friends, 200

# Register the API routes
def initialize_routes(api):
    api.add_resource(UserSearch, '/api/users/search')
    api.add_resource(FriendRequestResource, '/api/friend_requests', '/api/friend_requests/<int:request_id>')
    api.add_resource(UserFriends, '/api/users/<int:user_id>/friends') 